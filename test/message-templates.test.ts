import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

type ToolHandler = (...args: any[]) => any

const registeredTools = new Map<
  string,
  {
    description: string
    inputSchema: Record<string, unknown>
    outputSchema?: Record<string, z.ZodTypeAny>
    annotations: Record<string, unknown>
    handler: ToolHandler
  }
>()

// Mock the MCP SDK so we capture every registration as a plain object — no
// network, no real server. Mirrors chatgpt-mcp/test/tools.test.ts, but the
// register function is imported DIRECTLY (no src/index) so this suite stays
// independent of orchestrator wiring.
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    registerTool(
      name: string,
      config: {
        description: string
        inputSchema: Record<string, unknown>
        outputSchema?: Record<string, z.ZodTypeAny>
        annotations?: Record<string, unknown>
      },
      handler: ToolHandler,
    ) {
      registeredTools.set(name, {
        description: config.description,
        inputSchema: config.inputSchema,
        outputSchema: config.outputSchema,
        annotations: config.annotations ?? {},
        handler,
      })
    }

    registerResource() {}

    registerPrompt() {}
  },
}))

const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js")
const { registerMessageTemplateTools } = await import("../src/tools/message-templates")

// Reconstruct a tool's PUBLISHED output schema EXACTLY as the MCP SDK does:
// `registerTool` receives `<schema>.shape` and re-wraps it in a fresh
// `z.object(...)`, dropping the envelope-level `.loose()` — so the published
// JSON Schema is `additionalProperties: false`. `.strict()` models that.
const publishedOutputSchema = (shape: Record<string, z.ZodTypeAny>) => z.object(shape).strict()

function registerTools() {
  registerMessageTemplateTools(new (McpServer as never)(), "test-api-key", "https://api.hunter.io/v2")
}

// Realistic payloads derived from
// app/app/views/api/message_templates/_message_template.jbuilder.
const htmlTemplate = {
  id: 42,
  name: "Friendly follow-up",
  subject: 'Quick follow-up, {{first_name:"there"}}',
  body: '<div>Hi {{first_name:"there"}},<br>Just floating this back to the top of your inbox.</div>',
  message_format: "html",
  created_at: "2026-06-01T09:30:00.000Z",
  updated_at: "2026-06-15T14:00:00.000Z",
}

// Legacy row shape: null subject (nullable varchar, length only validated
// when present) and null message_format (nullable varchar, blank-as-html).
const legacyTemplate = {
  id: 7,
  name: "Plain nudge",
  subject: null,
  body: "Hello, checking in once more.",
  message_format: null,
  created_at: "2024-02-10T08:00:00.000Z",
  updated_at: "2024-02-10T08:00:00.000Z",
}

// Imported-from-library row shape: null body. EmailTemplates::ImportController
// copies EmailTemplate#body (a nullable text column) via
// MessageTemplate.insert_all!, bypassing the presence validator, so an imported
// template can persist and serialize `body: null` — the schema must admit it.
const importedTemplate = {
  id: 88,
  name: "Imported blank body",
  subject: "Imported subject",
  body: null,
  message_format: "html",
  created_at: "2025-01-05T12:00:00.000Z",
  updated_at: "2025-01-05T12:00:00.000Z",
}

const errorEnvelope = {
  error: {
    code: "not_found",
    retryable: false,
    message: "The message template does not exist.",
  },
}

function stubFetchOnce(payload: unknown) {
  const mockFetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(payload)),
  })
  vi.stubGlobal("fetch", mockFetch)
  return mockFetch
}

beforeEach(() => {
  registeredTools.clear()
  registerTools()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("message-template tool registration", () => {
  const ALL = [
    "List-Message-Templates",
    "Get-Message-Template",
    "Create-Message-Template",
    "Update-Message-Template",
    "Delete-Message-Template",
  ]

  it("registers exactly the five message-template tools", () => {
    expect(registeredTools.size).toBe(ALL.length)
    for (const name of ALL) expect(registeredTools.has(name)).toBe(true)
  })

  it.each(ALL)("tool '%s' has a non-empty description ending 'Free to call.'", (name) => {
    const tool = registeredTools.get(name)!
    expect(tool.description.length).toBeGreaterThan(0)
    expect(tool.description.endsWith("Free to call.")).toBe(true)
  })

  it.each(ALL)("tool '%s' declares an outputSchema", (name) => {
    expect(registeredTools.get(name)!.outputSchema).toBeDefined()
  })

  // HUN-20847: the descriptions wire the follow-up authoring flow — offer
  // saved templates when drafting, point at Create-Sequence-Follow-Up's
  // message_template_id pre-fill, and support saving a chat draft.
  it("List-Message-Templates wires the 'use a saved template?' authoring flow", () => {
    const description = registeredTools.get("List-Message-Templates")!.description
    expect(description).toMatch(/use a saved template/i)
    expect(description).toContain("Create-Sequence-Follow-Up")
    expect(description).toContain("message_template_id")
  })

  it("Get-Message-Template references the follow-up pre-fill", () => {
    const description = registeredTools.get("Get-Message-Template")!.description
    expect(description).toContain("Create-Sequence-Follow-Up")
    expect(description).toContain("message_template_id")
  })

  it("Create-Message-Template supports saving a chat draft as a template", () => {
    const description = registeredTools.get("Create-Message-Template")!.description
    expect(description).toMatch(/save a message draft written in chat/i)
    expect(description).toContain("message_template_id")
  })
})

describe("message-template tool annotations", () => {
  it.each(["List-Message-Templates", "Get-Message-Template"])("tool '%s' is a private read", (name) => {
    expect(registeredTools.get(name)!.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    })
  })

  it("Create-Message-Template is a private write", () => {
    expect(registeredTools.get("Create-Message-Template")!.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    })
  })

  it.each(["Update-Message-Template", "Delete-Message-Template"])("tool '%s' is private destructive", (name) => {
    expect(registeredTools.get(name)!.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    })
  })
})

describe("List-Message-Templates handler", () => {
  it("GETs /message-templates with stringified offset/limit query params", async () => {
    const mockFetch = stubFetchOnce({ data: { message_templates: [htmlTemplate] }, meta: { total: 1 } })
    const result = await registeredTools.get("List-Message-Templates")!.handler({ offset: 25, limit: 50 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/message-templates?offset=25&limit=50")
    expect(opts.method).toBe("GET")
    expect(opts.headers.Authorization).toBe("Bearer test-api-key")
    expect(result.isError).toBeUndefined()
  })

  it("omits query params when none are given", async () => {
    const mockFetch = stubFetchOnce({ data: { message_templates: [] }, meta: { total: 0 } })
    await registeredTools.get("List-Message-Templates")!.handler({})
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.hunter.io/v2/message-templates")
  })

  it("published output schema validates the index.jbuilder envelope and the error envelope", () => {
    const schema = publishedOutputSchema(registeredTools.get("List-Message-Templates")!.outputSchema!)
    // index.jbuilder: data.message_templates[] + meta { total, params: { limit, offset } }.
    const success = schema.safeParse({
      data: { message_templates: [htmlTemplate, legacyTemplate, importedTemplate] },
      meta: { total: 3, params: { limit: 25, offset: 0 } },
    })
    expect(success.success).toBe(true)
    expect(schema.safeParse(errorEnvelope).success).toBe(true)
  })
})

describe("Get-Message-Template handler", () => {
  it("GETs /message-templates/:id", async () => {
    const mockFetch = stubFetchOnce({ data: htmlTemplate })
    await registeredTools.get("Get-Message-Template")!.handler({ id: 42 })
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/message-templates/42")
    expect(opts.method).toBe("GET")
  })

  it("published output schema validates the show.jbuilder envelope and the error envelope", () => {
    const schema = publishedOutputSchema(registeredTools.get("Get-Message-Template")!.outputSchema!)
    expect(schema.safeParse({ data: htmlTemplate }).success).toBe(true)
    expect(schema.safeParse({ data: legacyTemplate }).success).toBe(true)
    // Imported template with a null body (insert_all! bypasses presence validation).
    expect(schema.safeParse({ data: importedTemplate }).success).toBe(true)
    expect(schema.safeParse(errorEnvelope).success).toBe(true)
  })

  it("passes a 404 through as a typed not_found error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => null },
        text: () =>
          Promise.resolve(
            JSON.stringify({ errors: [{ id: "not_found", code: 404, details: "Message template not found." }] }),
          ),
      }),
    )
    const result = await registeredTools.get("Get-Message-Template")!.handler({ id: 999 })
    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("not_found")
  })
})

describe("Create-Message-Template handler", () => {
  it("POSTs /message-templates with Rails form params and an Idempotency-Key header", async () => {
    const mockFetch = stubFetchOnce({ data: htmlTemplate })
    const result = await registeredTools.get("Create-Message-Template")!.handler({
      name: "Friendly follow-up",
      subject: 'Quick follow-up, {{first_name:"there"}}',
      body: "<div>Hi there</div>",
      message_format: "html",
    })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/message-templates")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Content-Type"]).toBe("application/x-www-form-urlencoded")
    // callHunterApi auto-generates one UUID per POST invocation (HUN-18680).
    expect(opts.headers["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/)
    const body = new URLSearchParams(opts.body)
    expect(body.get("name")).toBe("Friendly follow-up")
    expect(body.get("subject")).toBe('Quick follow-up, {{first_name:"there"}}')
    expect(body.get("body")).toBe("<div>Hi there</div>")
    expect(body.get("message_format")).toBe("html")

    // Deep link to the created template's dashboard page.
    expect((result.structuredContent as { viewInHunter?: string }).viewInHunter).toBe(
      "https://hunter.io/message-templates/42",
    )
  })

  it("omits optional subject/message_format from the form body when absent", async () => {
    const mockFetch = stubFetchOnce({ data: legacyTemplate })
    await registeredTools.get("Create-Message-Template")!.handler({ name: "Plain nudge", body: "Hello." })
    const body = new URLSearchParams(mockFetch.mock.calls[0][1].body)
    expect(body.has("subject")).toBe(false)
    expect(body.has("message_format")).toBe(false)
  })

  it("published output schema validates the create.jbuilder envelope (with deep link) and the error envelope", () => {
    const schema = publishedOutputSchema(registeredTools.get("Create-Message-Template")!.outputSchema!)
    expect(
      schema.safeParse({ data: htmlTemplate, viewInHunter: "https://hunter.io/message-templates/42" }).success,
    ).toBe(true)
    expect(schema.safeParse(errorEnvelope).success).toBe(true)
  })

  it("passes a 422 validation failure through as a typed invalid_input error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 422,
        headers: { get: () => null },
        text: () =>
          Promise.resolve(
            JSON.stringify({
              errors: [{ id: "empty_required_field", code: 422, details: "The template name is required." }],
            }),
          ),
      }),
    )
    const result = await registeredTools.get("Create-Message-Template")!.handler({ name: "x", body: "y" })
    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string; message: string } }).error
    expect(error.code).toBe("invalid_input")
    expect(error.message).toContain("The template name is required.")
    // The typed error envelope must satisfy the published schema.
    const schema = publishedOutputSchema(registeredTools.get("Create-Message-Template")!.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })
})

describe("Update-Message-Template handler", () => {
  it("PUTs /message-templates/:id with only the provided fields", async () => {
    const mockFetch = stubFetchOnce({ data: { ...htmlTemplate, name: "Renamed" } })
    const result = await registeredTools.get("Update-Message-Template")!.handler({ id: 42, name: "Renamed" })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/message-templates/42")
    expect(opts.method).toBe("PUT")
    const body = new URLSearchParams(opts.body)
    expect(body.get("name")).toBe("Renamed")
    expect(body.has("subject")).toBe(false)
    expect(body.has("body")).toBe(false)
    expect(body.has("message_format")).toBe(false)
    expect((result.structuredContent as { viewInHunter?: string }).viewInHunter).toBe(
      "https://hunter.io/message-templates/42",
    )
  })

  it("published output schema validates the update.jbuilder envelope and the error envelope", () => {
    const schema = publishedOutputSchema(registeredTools.get("Update-Message-Template")!.outputSchema!)
    expect(
      schema.safeParse({ data: htmlTemplate, viewInHunter: "https://hunter.io/message-templates/42" }).success,
    ).toBe(true)
    expect(schema.safeParse(errorEnvelope).success).toBe(true)
  })

  it("passes a 422 through with isError true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 422,
        headers: { get: () => null },
        text: () =>
          Promise.resolve(
            JSON.stringify({
              errors: [
                { id: "wrong_field_value", code: 422, details: "The subject must be shorter than 250 characters." },
              ],
            }),
          ),
      }),
    )
    const result = await registeredTools.get("Update-Message-Template")!.handler({ id: 42, subject: "s" })
    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("invalid_input")
  })
})

describe("Delete-Message-Template handler", () => {
  it("DELETEs /message-templates/:id and returns the synthesised ack on 204", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: () => Promise.resolve(""),
    })
    vi.stubGlobal("fetch", mockFetch)
    const result = await registeredTools.get("Delete-Message-Template")!.handler({ id: 42 })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/message-templates/42")
    expect(opts.method).toBe("DELETE")
    expect(opts.body).toBeUndefined()
    expect(result.isError).toBeUndefined()
    expect(result.structuredContent).toMatchObject({ kind: "ack", ok: true, status: 204 })

    const schema = publishedOutputSchema(registeredTools.get("Delete-Message-Template")!.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("published output schema also validates the error envelope", () => {
    const schema = publishedOutputSchema(registeredTools.get("Delete-Message-Template")!.outputSchema!)
    expect(schema.safeParse(errorEnvelope).success).toBe(true)
  })

  it("passes a 404 through with isError true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => null },
        text: () =>
          Promise.resolve(
            JSON.stringify({ errors: [{ id: "not_found", code: 404, details: "Message template not found." }] }),
          ),
      }),
    )
    const result = await registeredTools.get("Delete-Message-Template")!.handler({ id: 999 })
    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("not_found")
  })
})
