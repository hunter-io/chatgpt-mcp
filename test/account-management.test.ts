import { beforeEach, describe, expect, it, vi } from "vitest"
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
// network, no real server. Mirrors chatgpt-mcp/test/tools.test.ts, but this
// suite imports registerAccountManagementTools directly instead of src/index
// (the orchestrator wires index registration separately).
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
const { registerAccountManagementTools } = await import("../src/tools/account-management")
const { createApiKeyArgsSchema, deleteApiKeyArgsSchema, nextActionSchema } = await import("../src/schemas/common")

registerAccountManagementTools(new (McpServer as never)(), "test-api-key", "https://api.hunter.io/v2")

// Reconstruct a tool's PUBLISHED output schema EXACTLY as the MCP SDK does:
// `registerTool` receives `<schema>.shape` and re-wraps it in a fresh
// `z.object(...)`, dropping the envelope-level `.loose()` — so the published
// JSON Schema is `additionalProperties: false`. `.strict()` models that.
const publishedOutputSchema = (shape: Record<string, z.ZodTypeAny>) => z.object(shape).strict()

const UUID_RE = /^[0-9a-f-]{36}$/

const KEY_TOOLS = ["List-API-Keys", "Create-API-Key", "Delete-API-Key"] as const

function tool(name: string) {
  const entry = registeredTools.get(name)
  if (!entry) throw new Error(`tool ${name} not registered`)
  return entry
}

function jsonOk(body: unknown, status = 200) {
  return { ok: true, status, text: () => Promise.resolve(JSON.stringify(body)) }
}

function jsonError(body: unknown, status = 422) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

function emptyOk(status = 204) {
  return { ok: true, status, text: () => Promise.resolve("") }
}

// The exact Rails rejection body from Api::ApiKeysController#reject_oauth_token
// (app/app/controllers/api/api_keys_controller.rb).
const OAUTH_403_BODY = {
  errors: [
    {
      id: "forbidden",
      code: 403,
      details: "API keys can't be managed with an OAuth token. Use your API key instead.",
    },
  ],
}

let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal("fetch", mockFetch)
})

describe("account-management registration", () => {
  it("registers all four tools with the ChatGPT description conventions", () => {
    for (const name of ["Get-Usage", ...KEY_TOOLS]) {
      const entry = tool(name)
      expect(entry.description.length).toBeGreaterThan(0)
      expect(entry.description.startsWith("Use this when the user wants to")).toBe(true)
      expect(entry.description.endsWith("Free to call.")).toBe(true)
    }
  })

  it("Get-Usage tells the model to check quota proactively before credit-consuming actions", () => {
    const description = tool("Get-Usage").description
    expect(description).toContain("BEFORE")
    expect(description).toContain("Domain-Search")
    expect(description).toContain("warn the user")
    expect(description).toContain("consumes no credits")
  })

  it("every API-key tool states the OAuth 403 limitation plainly", () => {
    for (const name of KEY_TOOLS) {
      const description = tool(name).description
      expect(description).toContain("requires connecting with an API key")
      expect(description).toContain("OAuth")
      expect(description).toContain("unauthorized error")
    }
  })

  it("List-API-Keys says keys are masked and user-scoped (not team)", () => {
    const description = tool("List-API-Keys").description
    expect(description).toContain("masked")
    expect(description).toContain("last 4 characters")
    expect(description).toContain("not the team")
  })

  it("Create-API-Key says the full key is visible only once and must be treated as a secret", () => {
    const description = tool("Create-API-Key").description
    expect(description).toContain("ONLY time the full key value is ever visible")
    expect(description).toContain("secret")
    expect(description).toContain("never repeat it back into the conversation more than once")
    expect(description).toContain("confirmed: true")
  })

  it("Delete-API-Key warns about breaking consumers and the last-key guard", () => {
    const description = tool("Delete-API-Key").description
    expect(description).toContain("stops working")
    expect(description).toContain("LAST remaining key")
    expect(description).toContain("confirmed: true")
  })

  it("marks reads, the create write, and the delete with exact annotation values", () => {
    const privateRead = { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    expect(tool("Get-Usage").annotations).toEqual(privateRead)
    expect(tool("List-API-Keys").annotations).toEqual(privateRead)
    expect(tool("Create-API-Key").annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    })
    expect(tool("Delete-API-Key").annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    })
  })
})

describe("Get-Usage", () => {
  it("GETs /usage and deep-links to hunter.io/usage", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk({
        data: {
          reset_date: "2026-07-15",
          requests: {
            searches: { used: 12, available: 500 },
            verifications: { used: 40, available: 1000 },
          },
        },
        meta: { params: { show_overage_requests: false } },
      }),
    )
    const result = await tool("Get-Usage").handler({})
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/usage")
    expect(opts.method).toBe("GET")
    expect(result.isError).toBeUndefined()
    const sc = result.structuredContent as any
    expect(sc.viewInHunter).toBe("https://hunter.io/usage")
    const schema = publishedOutputSchema(tool("Get-Usage").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("published output schema validates the jbuilder payload (credits bucket + overage) and the error envelope", () => {
    const schema = publishedOutputSchema(tool("Get-Usage").outputSchema!)
    // app/app/views/api/usage/show.jbuilder — single-credits-bucket premium
    // team with overage shown; credits values can be fractional floats.
    expect(() =>
      schema.parse({
        data: {
          reset_date: "2026-07-15",
          requests: {
            credits: { used: 120.5, available: 500, remaining: 379.5, over_quota: 0 },
            searches: { used: 12, available: 500, over_quota: 3 },
            verifications: { used: 40, available: 1000, over_quota: 0 },
          },
        },
        meta: { params: { show_overage_requests: true } },
      }),
    ).not.toThrow()
    expect(() =>
      schema.parse({
        error: { code: "rate_limited", retryable: true, message: "Too many requests." },
      }),
    ).not.toThrow()
  })

  it("passes a 429 restricted-account error through as isError", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError(
        { errors: [{ id: "restricted_account", code: 429, details: "Your account has no usable subscription." }] },
        429,
      ),
    )
    const result = await tool("Get-Usage").handler({})
    expect(result.isError).toBe(true)
    const sc = result.structuredContent as any
    expect(sc.error.code).toBe("rate_limited")
    const schema = publishedOutputSchema(tool("Get-Usage").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })
})

describe("List-API-Keys", () => {
  it("GETs /api-keys with stringified pagination params and deep-links to hunter.io/api-keys", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk({
        status: "success",
        data: [{ id: 1, name: "Zapier", token: "********abcd", created_at: "2026-01-05T09:00:00Z" }],
        meta: { total: 1, limit: 5, offset: 10 },
      }),
    )
    const result = await tool("List-API-Keys").handler({ offset: 10, limit: 5 })
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/api-keys?offset=10&limit=5")
    expect(opts.method).toBe("GET")
    expect(result.isError).toBeUndefined()
    const sc = result.structuredContent as any
    expect(sc.viewInHunter).toBe("https://hunter.io/api-keys")
    const schema = publishedOutputSchema(tool("List-API-Keys").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("published output schema validates the index.jbuilder payload (top-level status string, masked tokens, null name)", () => {
    const schema = publishedOutputSchema(tool("List-API-Keys").outputSchema!)
    expect(() =>
      schema.parse({
        status: "success",
        data: [
          { id: 1, name: "Zapier", token: "********abcd", created_at: "2026-01-05T09:00:00Z" },
          { id: 2, name: null, token: "********", created_at: "2025-11-30T18:21:07Z" },
        ],
        meta: { total: 2, limit: 20, offset: 0 },
      }),
    ).not.toThrow()
    expect(() =>
      schema.parse({
        error: { code: "unauthorized", retryable: false, message: "No user found for the API key supplied" },
      }),
    ).not.toThrow()
  })

  it("does NOT admit a full-key field: only the masked `token` survives parsing", () => {
    const schema = publishedOutputSchema(tool("List-API-Keys").outputSchema!)
    const parsed = schema.parse({
      status: "success",
      data: [
        {
          id: 1,
          name: "Zapier",
          token: "********abcd",
          created_at: "2026-01-05T09:00:00Z",
          // Hypothetical full-key fields a future regression could emit —
          // the leaf's strip-on-parse behavior must drop every one of them.
          raw_token: "aaaabbbbccccddddeeeeffff0000111122223333",
          full_token: "aaaabbbbccccddddeeeeffff0000111122223333",
          secret: "aaaabbbbccccddddeeeeffff0000111122223333",
        },
      ],
      meta: { total: 1, limit: 20, offset: 0 },
    }) as any
    expect(parsed.data[0]).toEqual({
      id: 1,
      name: "Zapier",
      token: "********abcd",
      created_at: "2026-01-05T09:00:00Z",
    })
  })

  it("passes the OAuth 403 rejection through as isError with code unauthorized", async () => {
    mockFetch.mockResolvedValueOnce(jsonError(OAUTH_403_BODY, 403))
    const result = await tool("List-API-Keys").handler({})
    expect(result.isError).toBe(true)
    const sc = result.structuredContent as any
    expect(sc.error.code).toBe("unauthorized")
    expect(sc.error.message).toContain("OAuth token")
    const schema = publishedOutputSchema(tool("List-API-Keys").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })
})

describe("Create-API-Key", () => {
  it("unconfirmed makes NO network call and emits ask_user naming the key", async () => {
    const result = await tool("Create-API-Key").handler({ name: "Zapier", confirmed: false })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("awaiting_confirmation")
    expect(sc.data.name).toBe("Zapier")
    const nextAction = nextActionSchema.parse(sc.nextAction)
    expect(nextAction.kind).toBe("ask_user")
    if (nextAction.kind !== "ask_user") throw new Error("expected ask_user")
    expect(nextAction.question).toContain('named "Zapier"')
    expect(nextAction.question).toContain("secret")
    expect(nextAction.pendingToolCall).toEqual({
      tool: "Create-API-Key",
      args: { name: "Zapier", confirmed: true },
    })
    // The emitted args must parse against the strict per-tool args schema in
    // src/schemas/common.ts (mirrors the pushLeadsToCrmArgsSchema assertion
    // in integrations.test.ts).
    expect(createApiKeyArgsSchema.safeParse(sc.nextAction.pendingToolCall.args).success).toBe(true)
    const schema = publishedOutputSchema(tool("Create-API-Key").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("unconfirmed without a name echoes ONLY confirmed in the pendingToolCall args", async () => {
    const result = await tool("Create-API-Key").handler({ confirmed: false })
    expect(mockFetch).not.toHaveBeenCalled()
    const sc = result.structuredContent as any
    expect(sc.data).toEqual({ status: "awaiting_confirmation" })
    expect(sc.nextAction.pendingToolCall).toEqual({ tool: "Create-API-Key", args: { confirmed: true } })
    expect(() => nextActionSchema.parse(sc.nextAction)).not.toThrow()
    expect(createApiKeyArgsSchema.safeParse(sc.nextAction.pendingToolCall.args).success).toBe(true)
  })

  it("confirmed POSTs the Rails form body with an Idempotency-Key and returns the full key once", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk(
        {
          status: "success",
          data: {
            id: 7,
            name: "Zapier",
            token: "aaaabbbbccccddddeeeeffff0000111122223333",
            created_at: "2026-07-02T10:00:00Z",
          },
        },
        201,
      ),
    )
    const result = await tool("Create-API-Key").handler({ name: "Zapier", confirmed: true })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/api-keys")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    expect(new URLSearchParams(opts.body).get("name")).toBe("Zapier")
    expect(result.isError).toBeUndefined()
    const sc = result.structuredContent as any
    expect(sc.data.token).toBe("aaaabbbbccccddddeeeeffff0000111122223333")
    expect(sc.viewInHunter).toBe("https://hunter.io/api-keys")
    const schema = publishedOutputSchema(tool("Create-API-Key").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("confirmed without a name POSTs with no body but still carries the Idempotency-Key", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk(
        {
          status: "success",
          data: { id: 8, name: null, token: "0000111122223333aaaabbbbccccddddeeeeffff", created_at: "2026-07-02T10:00:00Z" },
        },
        201,
      ),
    )
    await tool("Create-API-Key").handler({ confirmed: true })
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.method).toBe("POST")
    expect(opts.body).toBeUndefined()
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
  })

  it("passes the OAuth 403 rejection through as isError with code unauthorized", async () => {
    mockFetch.mockResolvedValueOnce(jsonError(OAUTH_403_BODY, 403))
    const result = await tool("Create-API-Key").handler({ name: "Zapier", confirmed: true })
    expect(result.isError).toBe(true)
    expect((result.structuredContent as any).error.code).toBe("unauthorized")
  })

  it("passes a 422 Rails validation error (duplicate name) through as isError", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({ errors: [{ id: "validation_failed", code: 422, details: "Name has already been taken" }] }),
    )
    const result = await tool("Create-API-Key").handler({ name: "Zapier", confirmed: true })
    expect(result.isError).toBe(true)
    const sc = result.structuredContent as any
    expect(sc.error.code).toBe("invalid_input")
    expect(sc.error.message).toContain("already been taken")
    const schema = publishedOutputSchema(tool("Create-API-Key").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })
})

describe("Delete-API-Key", () => {
  it("unconfirmed makes NO network call and warns that consumers break immediately", async () => {
    const result = await tool("Delete-API-Key").handler({ api_key_id: 42, confirmed: false })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
    const sc = result.structuredContent as any
    expect(sc.data).toEqual({ id: 42, status: "awaiting_confirmation" })
    const nextAction = nextActionSchema.parse(sc.nextAction)
    expect(nextAction.kind).toBe("ask_user")
    if (nextAction.kind !== "ask_user") throw new Error("expected ask_user")
    expect(nextAction.question).toContain("API key 42")
    expect(nextAction.question).toContain("stops working immediately")
    expect(nextAction.pendingToolCall).toEqual({
      tool: "Delete-API-Key",
      args: { api_key_id: 42, confirmed: true },
    })
    // The emitted args must parse against the strict per-tool args schema in
    // src/schemas/common.ts (mirrors the pushLeadsToCrmArgsSchema assertion
    // in integrations.test.ts).
    expect(deleteApiKeyArgsSchema.safeParse(sc.nextAction.pendingToolCall.args).success).toBe(true)
    const schema = publishedOutputSchema(tool("Delete-API-Key").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("confirmed DELETEs /api-keys/:id and the synthesized 204 ack validates", async () => {
    mockFetch.mockResolvedValueOnce(emptyOk(204))
    const result = await tool("Delete-API-Key").handler({ api_key_id: 42, confirmed: true })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/api-keys/42")
    expect(opts.method).toBe("DELETE")
    expect(result.isError).toBeUndefined()
    const sc = result.structuredContent as any
    expect(sc.kind).toBe("ack")
    expect(sc.ok).toBe(true)
    expect(sc.status).toBe(204)
    expect(sc.viewInHunter).toBe("https://hunter.io/api-keys")
    const schema = publishedOutputSchema(tool("Delete-API-Key").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("surfaces the last-key guard (422 model validation) as isError", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({ errors: [{ id: "validation_failed", code: 422, details: "A user must have at least one API key" }] }),
    )
    const result = await tool("Delete-API-Key").handler({ api_key_id: 42, confirmed: true })
    expect(result.isError).toBe(true)
    const sc = result.structuredContent as any
    expect(sc.error.code).toBe("invalid_input")
    expect(sc.error.message).toContain("at least one API key")
    const schema = publishedOutputSchema(tool("Delete-API-Key").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("passes the OAuth 403 rejection through as isError with code unauthorized", async () => {
    mockFetch.mockResolvedValueOnce(jsonError(OAUTH_403_BODY, 403))
    const result = await tool("Delete-API-Key").handler({ api_key_id: 42, confirmed: true })
    expect(result.isError).toBe(true)
    const sc = result.structuredContent as any
    expect(sc.error.code).toBe("unauthorized")
    expect(sc.error.message).toContain("OAuth token")
  })

  it("passes a 404 (key owned by another user) through as isError with code not_found", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({ errors: [{ id: "not_found", code: 404, details: "This API key does not exist." }] }, 404),
    )
    const result = await tool("Delete-API-Key").handler({ api_key_id: 999, confirmed: true })
    expect(result.isError).toBe(true)
    expect((result.structuredContent as any).error.code).toBe("not_found")
  })
})
