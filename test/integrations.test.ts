import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// CRM push + webhooks tools (HUN-20858, HUN-20859). Direct-import register
// pattern: we register ONLY src/tools/integrations.ts against a mocked
// McpServer — no src/index import, no network.

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
// network, no real server. Mirrors test/tools.test.ts.
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
const { registerIntegrationTools } = await import("../src/tools/integrations")
const { nextActionSchema, pushLeadsToCrmArgsSchema } = await import("../src/schemas/common")

registerIntegrationTools(new (McpServer as never)(), "test-api-key", "https://api.hunter.io/v2")

// Reconstruct a tool's PUBLISHED output schema EXACTLY as the MCP SDK does:
// `registerTool` receives `<schema>.shape` and re-wraps it in a fresh
// `z.object(...)`, dropping the envelope-level `.loose()` — so the published
// JSON Schema is `additionalProperties: false`. `.strict()` models that.
const publishedOutputSchema = (shape: Record<string, z.ZodTypeAny>) => z.object(shape).strict()

function getTool(name: string) {
  const tool = registeredTools.get(name)
  if (!tool) throw new Error(`tool ${name} was not registered`)
  return tool
}

function okResponse(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

function errorResponse(status: number, body: unknown) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

function fetchCall(mockFetch: ReturnType<typeof vi.fn>, index = 0) {
  return mockFetch.mock.calls[index] as [string, { method: string; headers: Record<string, string>; body?: string }]
}

// Realistic 202 body from app/app/views/api/connected_apps/push/create.jbuilder.
const pushQueuedBody = {
  data: { connected_app_id: 12, provider: "hubspot", leads_count: 3, status: "queued" },
  meta: { params: { lead_ids: ["101", "102", "103"], leads_list_id: null } },
}

// Realistic bodies from app/app/views/api/webhooks/{index,update}.jbuilder —
// note the TOP-LEVEL `status: "success"` string the jbuilders emit.
const listWebhooksBody = {
  status: "success",
  data: [
    { id: 9, target_url: "https://example.com/hunter-hook", event: "lead.created" },
    { id: 3, target_url: "https://crm.example.com/events", event: "sequence.paused" },
  ],
  meta: { total: 2, limit: 20, offset: 0 },
}

// A Zapier-style webhook that embeds a reusable secret in the URL path (and one
// in a query param): the exact shape the admin registry redacts. The MCP must
// NOT surface `SECRETTOKEN123` / `authkey=SUPERSECRET` to the model.
const zapierWebhooksBody = {
  status: "success",
  data: [
    {
      id: 42,
      target_url: "https://hooks.zapier.com/hooks/catch/123456/SECRETTOKEN123/?authkey=SUPERSECRET",
      event: "lead.created",
    },
  ],
  meta: { total: 1, limit: 20, offset: 0 },
}

const updateWebhookBody = {
  status: "success",
  data: { id: 9, target_url: "https://example.com/new-hook", event: "message.replied" },
}

// Update.jbuilder echoing back a secret-bearing Zapier target_url.
const updateZapierWebhookBody = {
  status: "success",
  data: {
    id: 42,
    target_url: "https://hooks.zapier.com/hooks/catch/123456/SECRETTOKEN123/",
    event: "message.replied",
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("integrations tool registration", () => {
  it("registers Push-Leads-To-CRM with a gated, async-push description", () => {
    const tool = getTool("Push-Leads-To-CRM")
    expect(tool.description).toMatch(/^Use this when the user wants to/)
    expect(tool.description).toContain("List-Connected-Apps")
    expect(tool.description).toContain("takes precedence")
    expect(tool.description).toContain("asynchronous")
    expect(tool.description).toContain("confirmed: true")
    expect(tool.description).toMatch(/Free to call\.$/)
  })

  it("Push-Leads-To-CRM uses WRITE_ANNOTATIONS (open-world: lead data leaves Hunter)", () => {
    expect(getTool("Push-Leads-To-CRM").annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    })
  })

  it("registers List-Webhooks enumerating the real webhook event types", () => {
    const tool = getTool("List-Webhooks")
    expect(tool.description).toMatch(/^Use this when the user wants to/)
    // The full Webhook::EVENTS list from app/app/models/webhook.rb.
    for (const event of [
      "lead.created",
      "message.sent",
      "message.read",
      "message.clicked",
      "message.replied",
      "export.completed",
      "import.completed",
      "sequence.paused",
      "sequence.resumed",
    ]) {
      expect(tool.description).toContain(event)
    }
    expect(tool.description).toMatch(/Free to call\.$/)
  })

  it("List-Webhooks uses PRIVATE_READ_ANNOTATIONS", () => {
    expect(getTool("List-Webhooks").annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    })
  })

  it("registers Update-Webhook warning that it overwrites configuration", () => {
    const tool = getTool("Update-Webhook")
    expect(tool.description).toMatch(/^Use this when the user wants to/)
    expect(tool.description).toContain("OVERWRITES")
    expect(tool.description).toContain("another system")
    expect(tool.description).toContain("at least one of")
    expect(tool.description).toMatch(/Free to call\.$/)
  })

  it("Update-Webhook uses PRIVATE_DESTRUCTIVE_ANNOTATIONS", () => {
    expect(getTool("Update-Webhook").annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    })
  })
})

describe("Push-Leads-To-CRM", () => {
  it("first call does NOT hit the push endpoint and emits ask_user with a strict pendingToolCall", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Push-Leads-To-CRM")

    const result = await tool.handler({ connected_app_id: 12, lead_ids: [101, 102, 103] })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBeFalsy()
    expect(result.structuredContent.data).toEqual({ connected_app_id: 12, status: "awaiting_confirmation" })

    const nextAction = result.structuredContent.nextAction
    expect(nextAction.kind).toBe("ask_user")
    expect(nextAction.question).toContain("3 leads")
    expect(nextAction.question).toContain("12")
    expect(nextAction.pendingToolCall).toEqual({
      tool: "Push-Leads-To-CRM",
      args: { connected_app_id: 12, lead_ids: [101, 102, 103], confirmed: true },
    })
    // The emitted pendingToolCall must parse against the strict per-tool args
    // schema in src/schemas/common.ts (via the nextActionSchema union).
    expect(nextActionSchema.safeParse(nextAction).success).toBe(true)
    expect(pushLeadsToCrmArgsSchema.safeParse(nextAction.pendingToolCall.args).success).toBe(true)

    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("gate with 100 lead_ids keeps the pendingToolCall intact (stays under embedNextAction's cap)", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Push-Leads-To-CRM")
    // MAX_PUSH_LEAD_IDS caps lead_ids at 100 for exactly this reason: a larger
    // array would push the echoed pendingToolCall over embedNextAction's
    // 2048-byte limit, downgrading it to a generic ask_user with NO
    // pendingToolCall and dropping the machine-readable re-issue args.
    const leadIds = Array.from({ length: 100 }, (_, i) => i + 1)

    const result = await tool.handler({ connected_app_id: 12, lead_ids: leadIds })

    expect(mockFetch).not.toHaveBeenCalled()
    const nextAction = result.structuredContent.nextAction
    expect(nextAction.kind).toBe("ask_user")
    // The pendingToolCall must survive intact — not be dropped by the cap.
    expect(nextAction.pendingToolCall).toBeDefined()
    expect(nextAction.pendingToolCall).toEqual({
      tool: "Push-Leads-To-CRM",
      args: { connected_app_id: 12, lead_ids: leadIds, confirmed: true },
    })
    // Its args must still parse against the strict per-tool args schema so the
    // model can re-issue the push with confirmed: true.
    expect(pushLeadsToCrmArgsSchema.safeParse(nextAction.pendingToolCall.args).success).toBe(true)
    expect(nextActionSchema.safeParse(nextAction).success).toBe(true)
  })

  it("gate with leads_list_id echoes only the provided fields and names the list", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Push-Leads-To-CRM")

    const result = await tool.handler({ connected_app_id: 12, leads_list_id: 55 })

    expect(mockFetch).not.toHaveBeenCalled()
    const nextAction = result.structuredContent.nextAction
    expect(nextAction.question).toContain("leads list 55")
    expect(nextAction.pendingToolCall).toEqual({
      tool: "Push-Leads-To-CRM",
      args: { connected_app_id: 12, leads_list_id: 55, confirmed: true },
    })
    expect(nextActionSchema.safeParse(nextAction).success).toBe(true)
  })

  it("confirmed call POSTs the Rails-form body with an Idempotency-Key and deep-links to /leads", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse(pushQueuedBody, 202))
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Push-Leads-To-CRM")

    const result = await tool.handler({ connected_app_id: 12, lead_ids: [101, 102, 103], confirmed: true })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchCall(mockFetch)
    expect(url).toBe("https://api.hunter.io/v2/connected-apps/12/push")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/)
    const body = new URLSearchParams(opts.body)
    expect(body.getAll("lead_ids[]")).toEqual(["101", "102", "103"])
    expect(body.has("leads_list_id")).toBe(false)

    expect(result.isError).toBeFalsy()
    expect(result.structuredContent.viewInHunter).toBe("https://hunter.io/leads")
    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("confirmed call with leads_list_id sends leads_list_id (no lead_ids)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse(pushQueuedBody, 202))
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Push-Leads-To-CRM")

    await tool.handler({ connected_app_id: 12, leads_list_id: 55, confirmed: true })

    const [, opts] = fetchCall(mockFetch)
    const body = new URLSearchParams(opts.body)
    expect(body.get("leads_list_id")).toBe("55")
    expect(body.getAll("lead_ids[]")).toEqual([])
  })

  it("rejects a selection-less call locally without hitting the API", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Push-Leads-To-CRM")

    const result = await tool.handler({ connected_app_id: 12, confirmed: true })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect(result.structuredContent.error.code).toBe("invalid_input")
    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("passes a 422 (app does not support lead syncing) through as a typed error", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      errorResponse(422, {
        errors: [{ id: "validation_failed", code: 422, details: "This connected app does not support lead syncing." }],
      }),
    )
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Push-Leads-To-CRM")

    const result = await tool.handler({ connected_app_id: 12, lead_ids: [101], confirmed: true })

    expect(result.isError).toBe(true)
    expect(result.structuredContent.error.code).toBe("invalid_input")
    expect(result.structuredContent.error.message).toContain("does not support lead syncing")
    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })
})

describe("List-Webhooks", () => {
  it("GETs /webhooks with stringified pagination params", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse(listWebhooksBody))
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("List-Webhooks")

    await tool.handler({ offset: 10, limit: 50 })

    const [url, opts] = fetchCall(mockFetch)
    expect(url).toBe("https://api.hunter.io/v2/webhooks?offset=10&limit=50")
    expect(opts.method).toBe("GET")
  })

  it("omits the query string when no params are given", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse(listWebhooksBody))
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("List-Webhooks")

    await tool.handler({})

    const [url] = fetchCall(mockFetch)
    expect(url).toBe("https://api.hunter.io/v2/webhooks")
  })

  it("published schema validates the jbuilder payload INCLUDING the top-level status string", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse(listWebhooksBody))
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("List-Webhooks")

    const result = await tool.handler({})

    const schema = publishedOutputSchema(tool.outputSchema!)
    // `status: "success"` is the jbuilder's top-level string — the widened
    // status union must admit it (buildResponseSchema alone declares an int).
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
    expect(result.structuredContent.data).toHaveLength(2)
  })

  it("published schema validates the error envelope and passes errors through", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      errorResponse(400, {
        errors: [{ id: "pagination_error", code: 400, details: "The parameter 'limit' should be a positive integer." }],
      }),
    )
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("List-Webhooks")

    const result = await tool.handler({ limit: 100 })

    expect(result.isError).toBe(true)
    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("redacts the secret target_url PATH+query on every webhook, mirroring the admin registry", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse(zapierWebhooksBody))
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("List-Webhooks")

    const result = await tool.handler({})

    // The secret path token / query authkey must be gone from BOTH the
    // machine-readable structuredContent and the user-visible content text.
    const webhook = (result.structuredContent as { data: { id: number; target_url: string; event: string }[] }).data[0]
    expect(webhook.target_url).toBe("https://hooks.zapier.com/[REDACTED]")
    expect(webhook.target_url).not.toContain("SECRETTOKEN123")
    expect(webhook.target_url).not.toContain("SUPERSECRET")
    // scheme + host + event stay intact for debuggability.
    expect(webhook.target_url).toMatch(/^https:\/\/hooks\.zapier\.com\//)
    expect(webhook.id).toBe(42)
    expect(webhook.event).toBe("lead.created")
    // The content text (what the model reads) must not leak the secret either.
    const text = result.content[0]!.text
    expect(text).not.toContain("SECRETTOKEN123")
    expect(text).not.toContain("SUPERSECRET")
    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("leaves non-secret host/scheme visible for ordinary webhooks", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse(listWebhooksBody))
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("List-Webhooks")

    const result = await tool.handler({})

    const data = (result.structuredContent as { data: { target_url: string }[] }).data
    // Path is redacted, but scheme://host survives so the model can still see
    // WHERE the webhook points.
    expect(data[0]!.target_url).toBe("https://example.com/[REDACTED]")
    expect(data[1]!.target_url).toBe("https://crm.example.com/[REDACTED]")
  })
})

describe("Update-Webhook", () => {
  it("PUTs /webhooks/:id with the permitted Rails-form params and no Idempotency-Key", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse(updateWebhookBody))
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Update-Webhook")

    const result = await tool.handler({
      webhook_id: 9,
      target_url: "https://example.com/new-hook",
      event: "message.replied",
    })

    const [url, opts] = fetchCall(mockFetch)
    expect(url).toBe("https://api.hunter.io/v2/webhooks/9")
    expect(opts.method).toBe("PUT")
    expect(opts.headers["Idempotency-Key"]).toBeUndefined()
    const body = new URLSearchParams(opts.body)
    expect(body.get("target_url")).toBe("https://example.com/new-hook")
    expect(body.get("event")).toBe("message.replied")

    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
    // The echoed webhook comes back with its target_url PATH redacted (same
    // treatment as List-Webhooks); id + event are untouched.
    expect(result.structuredContent.data).toEqual({
      id: 9,
      target_url: "https://example.com/[REDACTED]",
      event: "message.replied",
    })
  })

  it("redacts the secret target_url PATH the update echoes back", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse(updateZapierWebhookBody))
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Update-Webhook")

    const result = await tool.handler({ webhook_id: 42, event: "message.replied" })

    const data = (result.structuredContent as { data: { id: number; target_url: string; event: string } }).data
    expect(data.target_url).toBe("https://hooks.zapier.com/[REDACTED]")
    expect(data.target_url).not.toContain("SECRETTOKEN123")
    expect(result.content[0]!.text).not.toContain("SECRETTOKEN123")
    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("sends only the provided field on a partial update", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse(updateWebhookBody))
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Update-Webhook")

    await tool.handler({ webhook_id: 9, event: "sequence.paused" })

    const [, opts] = fetchCall(mockFetch)
    const body = new URLSearchParams(opts.body)
    expect(body.get("event")).toBe("sequence.paused")
    expect(body.has("target_url")).toBe(false)
  })

  it("rejects a call with neither target_url nor event locally without hitting the API", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Update-Webhook")

    const result = await tool.handler({ webhook_id: 9 })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect(result.structuredContent.error.code).toBe("invalid_input")
    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("passes a 422 model-validation error through as a typed invalid_input error", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      errorResponse(422, {
        errors: [{ id: "validation_failed", code: 422, details: "Target url is not a valid URL." }],
      }),
    )
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Update-Webhook")

    const result = await tool.handler({ webhook_id: 9, target_url: "https://bad.example.com/x" })

    expect(result.isError).toBe(true)
    expect(result.structuredContent.error.code).toBe("invalid_input")
    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("passes a 404 through and the published schema admits the not_found envelope", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        errorResponse(404, { errors: [{ id: "not_found", code: 404, details: "Webhook not found." }] }),
      )
    vi.stubGlobal("fetch", mockFetch)
    const tool = getTool("Update-Webhook")

    const result = await tool.handler({ webhook_id: 424242, event: "lead.created" })

    expect(result.isError).toBe(true)
    expect(result.structuredContent.error.code).toBe("not_found")
    const schema = publishedOutputSchema(tool.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })
})
