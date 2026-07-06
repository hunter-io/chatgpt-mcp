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
// suite imports registerBulkOperationTools directly instead of src/index (the
// orchestrator wires index registration separately).
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
const { registerBulkOperationTools } = await import("../src/tools/bulk-operations")
const {
  nextActionSchema,
  bulkMoveLeadsArgsSchema,
  bulkDeleteLeadsArgsSchema,
  bulkMoveCompaniesArgsSchema,
  bulkCopyCompaniesArgsSchema,
  bulkDeleteCompaniesArgsSchema,
} = await import("../src/schemas/common")

registerBulkOperationTools(new (McpServer as never)(), "test-api-key", "https://api.hunter.io/v2")

// Reconstruct a tool's PUBLISHED output schema EXACTLY as the MCP SDK does:
// `registerTool` receives `<schema>.shape` and re-wraps it in a fresh
// `z.object(...)`, dropping the envelope-level `.loose()` — so the published
// JSON Schema is `additionalProperties: false`. `.strict()` models that.
const publishedOutputSchema = (shape: Record<string, z.ZodTypeAny>) => z.object(shape).strict()

const UUID_RE = /^[0-9a-f-]{36}$/

const BULK_TOOLS = [
  "Bulk-Move-Leads",
  "Bulk-Delete-Leads",
  "Bulk-Move-Companies",
  "Bulk-Copy-Companies",
  "Bulk-Delete-Companies",
] as const

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

let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal("fetch", mockFetch)
})

describe("bulk-operations registration", () => {
  it("registers all five tools with the ChatGPT description conventions", () => {
    for (const name of BULK_TOOLS) {
      const entry = tool(name)
      expect(entry.description.length).toBeGreaterThan(0)
      expect(entry.description.startsWith("Use this when the user wants to")).toBe(true)
      expect(entry.description.endsWith("Free to call.")).toBe(true)
      expect(entry.description).toContain("confirmed: true")
      expect(entry.description).toContain("confirmation")
    }
    expect(tool("Bulk-Delete-Leads").description).toContain("permanent")
    expect(tool("Bulk-Delete-Companies").description).toContain("permanent")
  })

  it("marks all five tools as private destructive (exact annotation values)", () => {
    for (const name of BULK_TOOLS) {
      expect(tool(name).annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      })
    }
  })
})

describe("Bulk-Move-Leads", () => {
  it("unconfirmed with lead_ids makes NO network call and emits ask_user with the id count", async () => {
    const result = await tool("Bulk-Move-Leads").handler({
      leads_list_id: 5,
      target_leads_list_id: 9,
      lead_ids: [1, 2, 3],
      confirmed: false,
    })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("awaiting_confirmation")
    expect(sc.data.leads_count).toBe(3)
    const nextAction = nextActionSchema.parse(sc.nextAction)
    expect(nextAction.kind).toBe("ask_user")
    if (nextAction.kind !== "ask_user") throw new Error("expected ask_user")
    // Rails moves the intersection of the ids and the source list, so the
    // id-derived count is phrased as an upper bound.
    expect(nextAction.question).toContain("up to 3 leads")
    expect(nextAction.question).toContain("leads list 5")
    expect(nextAction.question).toContain("leads list 9")
    expect(nextAction.pendingToolCall).toEqual({
      tool: "Bulk-Move-Leads",
      args: { leads_list_id: 5, target_leads_list_id: 9, lead_ids: [1, 2, 3], confirmed: true },
    })
    expect(bulkMoveLeadsArgsSchema.safeParse(nextAction.pendingToolCall!.args).success).toBe(true)
  })

  it("unconfirmed with only a source list performs ONLY the count GET and states meta.count (the filtered total)", async () => {
    // Real contract: meta.count is the FILTERED total matching the query;
    // meta.total is the UNFILTERED team-wide lead count and must be ignored.
    mockFetch.mockResolvedValueOnce(jsonOk({ data: { leads: [] }, meta: { count: 247, total: 99999 } }))
    const result = await tool("Bulk-Move-Leads").handler({
      leads_list_id: 5,
      target_leads_list_id: 9,
      confirmed: false,
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads?leads_list_id=5&limit=1")
    expect(opts.method).toBe("GET")
    const sc = result.structuredContent as any
    // List-derived counts are also upper bounds: member-scoped authorization
    // means a regular team member only moves the leads they own.
    expect(sc.nextAction.question).toContain("up to 247 leads")
    // The pendingToolCall echoes ONLY the provided args (no lead_ids key).
    expect(sc.nextAction.pendingToolCall.args).toEqual({
      leads_list_id: 5,
      target_leads_list_id: 9,
      confirmed: true,
    })
    expect(bulkMoveLeadsArgsSchema.safeParse(sc.nextAction.pendingToolCall.args).success).toBe(true)
    expect(() => nextActionSchema.parse(sc.nextAction)).not.toThrow()
  })

  it("unconfirmed falls back to naming the list when the count fetch fails — still no POST", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"))
    const result = await tool("Bulk-Move-Leads").handler({
      leads_list_id: 5,
      target_leads_list_id: 9,
      confirmed: false,
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const sc = result.structuredContent as any
    expect(sc.nextAction.question).toContain("all leads in leads list 5")
    expect(sc.data.status).toBe("awaiting_confirmation")
    expect(sc.data.leads_count).toBeUndefined()
  })

  it("treats an empty lead_ids array as whole-list (mirrors Rails present? semantics)", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ data: { leads: [] }, meta: { count: 42, total: 99999 } }))
    const result = await tool("Bulk-Move-Leads").handler({
      leads_list_id: 5,
      target_leads_list_id: 9,
      lead_ids: [],
      confirmed: false,
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const sc = result.structuredContent as any
    // Whole-list (list-derived) count is an upper bound under member scoping.
    expect(sc.nextAction.question).toContain("up to 42 leads")
    expect(sc.nextAction.pendingToolCall.args).toEqual({
      leads_list_id: 5,
      target_leads_list_id: 9,
      confirmed: true,
    })
  })

  it("rejects identical source and target lists locally without any network call", async () => {
    const result = await tool("Bulk-Move-Leads").handler({
      leads_list_id: 5,
      target_leads_list_id: 5,
      confirmed: true,
    })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect((result.structuredContent as any).error.code).toBe("invalid_input")
  })

  it("confirmed POSTs the Rails form body with an Idempotency-Key and returns the 202 payload", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk(
        {
          data: { source_leads_list_id: 5, target_leads_list_id: 9, leads_count: 3, status: "queued" },
          meta: { params: { leads_list_id: "5", target_leads_list_id: "9", lead_ids: ["1", "2", "3"] } },
        },
        202,
      ),
    )
    const result = await tool("Bulk-Move-Leads").handler({
      leads_list_id: 5,
      target_leads_list_id: 9,
      lead_ids: [1, 2, 3],
      confirmed: true,
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads/bulk/move")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    const body = new URLSearchParams(opts.body)
    expect(body.get("leads_list_id")).toBe("5")
    expect(body.get("target_leads_list_id")).toBe("9")
    expect(body.getAll("lead_ids[]")).toEqual(["1", "2", "3"])
    expect(result.isError).toBeUndefined()
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("queued")
    expect(sc.viewInHunter).toBe("https://hunter.io/leads?leads_list_id=9")
    const schema = publishedOutputSchema(tool("Bulk-Move-Leads").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("published output schema validates the jbuilder payload and the error envelope", () => {
    const schema = publishedOutputSchema(tool("Bulk-Move-Leads").outputSchema!)
    // app/app/views/api/leads/bulk/move/create.jbuilder (HTTP 202)
    expect(() =>
      schema.parse({
        data: { source_leads_list_id: 5, target_leads_list_id: 9, leads_count: 247, status: "queued" },
        meta: { params: { leads_list_id: "5", target_leads_list_id: "9", lead_ids: null } },
      }),
    ).not.toThrow()
    expect(() =>
      schema.parse({
        error: {
          code: "invalid_input",
          retryable: false,
          message: "Bulk move is only supported between static lists.",
        },
      }),
    ).not.toThrow()
  })

  it("passes a 422 Rails error through as isError", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({ errors: [{ id: "validation_failed", code: 422, details: "No leads matched the selection." }] }),
    )
    const result = await tool("Bulk-Move-Leads").handler({
      leads_list_id: 5,
      target_leads_list_id: 9,
      lead_ids: [1],
      confirmed: true,
    })
    expect(result.isError).toBe(true)
    const sc = result.structuredContent as any
    expect(sc.error.message).toContain("No leads matched the selection.")
    const schema = publishedOutputSchema(tool("Bulk-Move-Leads").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })
})

describe("Bulk-Delete-Leads", () => {
  it("unconfirmed with lead_ids makes NO network call and demands an explicit count double-check", async () => {
    const result = await tool("Bulk-Delete-Leads").handler({ lead_ids: [11, 12, 13], confirmed: false })
    expect(mockFetch).not.toHaveBeenCalled()
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("awaiting_confirmation")
    expect(sc.data.requested_count).toBe(3)
    const nextAction = nextActionSchema.parse(sc.nextAction)
    if (nextAction.kind !== "ask_user") throw new Error("expected ask_user")
    // Id-derived counts are upper bounds (Rails deletes the intersection).
    expect(nextAction.question).toContain("permanently deletes up to 3 leads")
    expect(nextAction.question).toContain("explicitly confirm the count")
    expect(nextAction.pendingToolCall).toEqual({
      tool: "Bulk-Delete-Leads",
      args: { lead_ids: [11, 12, 13], confirmed: true },
    })
    expect(bulkDeleteLeadsArgsSchema.safeParse(nextAction.pendingToolCall!.args).success).toBe(true)
  })

  it("unconfirmed with a list id performs ONLY the count GET and never POSTs", async () => {
    // meta.count = filtered total for the list; meta.total = whole team (ignored).
    mockFetch.mockResolvedValueOnce(jsonOk({ data: { leads: [] }, meta: { count: 247, total: 99999 } }))
    const result = await tool("Bulk-Delete-Leads").handler({ leads_list_id: 42, confirmed: false })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads?leads_list_id=42&limit=1")
    expect(opts.method).toBe("GET")
    const sc = result.structuredContent as any
    // List-derived count is an upper bound: member-scoped deletion (LeadPolicy#destroy?).
    expect(sc.nextAction.question).toContain("permanently deletes up to 247 leads")
    expect(sc.nextAction.pendingToolCall.args).toEqual({ leads_list_id: 42, confirmed: true })
    expect(bulkDeleteLeadsArgsSchema.safeParse(sc.nextAction.pendingToolCall.args).success).toBe(true)
    expect(() => nextActionSchema.parse(sc.nextAction)).not.toThrow()
  })

  it("unconfirmed falls back to naming the list when the count GET errors", async () => {
    mockFetch.mockResolvedValueOnce(jsonError({ errors: [{ id: "internal", code: 500, details: "boom" }] }, 500))
    const result = await tool("Bulk-Delete-Leads").handler({ leads_list_id: 42, confirmed: false })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const sc = result.structuredContent as any
    expect(sc.nextAction.question).toContain("ALL leads in leads list 42")
  })

  it("requires a selection: neither lead_ids nor leads_list_id is a local invalid_input", async () => {
    const result = await tool("Bulk-Delete-Leads").handler({ confirmed: true })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect((result.structuredContent as any).error.code).toBe("invalid_input")
  })

  it("confirmed sync path (≤10 matches) POSTs and reports the exact deleted_count", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk({
        data: { requested_count: 3, deleted_count: 3, status: "completed" },
        meta: { params: { lead_ids: ["11", "12", "13"], leads_list_id: null } },
      }),
    )
    const result = await tool("Bulk-Delete-Leads").handler({ lead_ids: [11, 12, 13], confirmed: true })
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads/bulk/delete")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    expect(new URLSearchParams(opts.body).getAll("lead_ids[]")).toEqual(["11", "12", "13"])
    const sc = result.structuredContent as any
    expect(sc.data.deleted_count).toBe(3)
    expect(sc.data.status).toBe("completed")
    const schema = publishedOutputSchema(tool("Bulk-Delete-Leads").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("confirmed async path (>10 matches) validates the 202 queued payload", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk(
        {
          data: { requested_count: 247, status: "queued" },
          meta: { params: { lead_ids: null, leads_list_id: "42" } },
        },
        202,
      ),
    )
    const result = await tool("Bulk-Delete-Leads").handler({ leads_list_id: 42, confirmed: true })
    expect(new URLSearchParams(mockFetch.mock.calls[0][1].body).get("leads_list_id")).toBe("42")
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("queued")
    expect(sc.data.deleted_count).toBeUndefined()
    const schema = publishedOutputSchema(tool("Bulk-Delete-Leads").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("passes a 422 Rails error through as isError", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({ errors: [{ id: "validation_failed", code: 422, details: "No leads matched the selection." }] }),
    )
    const result = await tool("Bulk-Delete-Leads").handler({ lead_ids: [1], confirmed: true })
    expect(result.isError).toBe(true)
  })
})

describe("Bulk-Move-Companies", () => {
  it("unconfirmed with only a source list fetches the count from GET /company-lists/:id", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ data: { id: 7, name: "Prospects", type: "static", companies_count: 32 } }))
    const result = await tool("Bulk-Move-Companies").handler({
      company_list_id: 7,
      target_company_list_id: 9,
      confirmed: false,
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/company-lists/7")
    expect(opts.method).toBe("GET")
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("awaiting_confirmation")
    expect(sc.data.companies_count).toBe(32)
    const nextAction = nextActionSchema.parse(sc.nextAction)
    if (nextAction.kind !== "ask_user") throw new Error("expected ask_user")
    // List-derived count is an upper bound under member-scoped authorization.
    expect(nextAction.question).toContain("up to 32 companies")
    expect(nextAction.question).toContain("company list 7")
    expect(nextAction.question).toContain("company list 9")
    expect(nextAction.pendingToolCall).toEqual({
      tool: "Bulk-Move-Companies",
      args: { company_list_id: 7, target_company_list_id: 9, confirmed: true },
    })
    expect(bulkMoveCompaniesArgsSchema.safeParse(nextAction.pendingToolCall!.args).success).toBe(true)
  })

  it("unconfirmed with company_ids uses ids.length without any network call", async () => {
    const result = await tool("Bulk-Move-Companies").handler({
      company_list_id: 7,
      target_company_list_id: 9,
      company_ids: [100],
      confirmed: false,
    })
    expect(mockFetch).not.toHaveBeenCalled()
    const sc = result.structuredContent as any
    // Id-derived counts are upper bounds (Rails moves the intersection).
    expect(sc.nextAction.question).toContain("up to 1 company")
    expect(sc.nextAction.pendingToolCall.args).toEqual({
      company_list_id: 7,
      target_company_list_id: 9,
      company_ids: [100],
      confirmed: true,
    })
    expect(bulkMoveCompaniesArgsSchema.safeParse(sc.nextAction.pendingToolCall.args).success).toBe(true)
    expect(() => nextActionSchema.parse(sc.nextAction)).not.toThrow()
  })

  it("rejects identical source and target lists locally", async () => {
    const result = await tool("Bulk-Move-Companies").handler({
      company_list_id: 7,
      target_company_list_id: 7,
      confirmed: true,
    })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect((result.structuredContent as any).error.code).toBe("invalid_input")
  })

  it("confirmed POSTs the Rails form body and returns the 202 queued payload", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk(
        {
          data: { source_company_list_id: 7, target_company_list_id: 9, companies_count: 32, status: "queued" },
          meta: { params: { company_list_id: "7", target_company_list_id: "9", company_ids: null } },
        },
        202,
      ),
    )
    const result = await tool("Bulk-Move-Companies").handler({
      company_list_id: 7,
      target_company_list_id: 9,
      confirmed: true,
    })
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/companies/bulk/move")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    const body = new URLSearchParams(opts.body)
    expect(body.get("company_list_id")).toBe("7")
    expect(body.get("target_company_list_id")).toBe("9")
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("queued")
    expect(sc.viewInHunter).toBe("https://hunter.io/lead/companies?company_list_id=9")
    const schema = publishedOutputSchema(tool("Bulk-Move-Companies").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("passes a 422 Rails error through as isError and the envelope validates", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({
        errors: [{ id: "validation_failed", code: 422, details: "Bulk move is only supported between static lists." }],
      }),
    )
    const result = await tool("Bulk-Move-Companies").handler({
      company_list_id: 7,
      target_company_list_id: 9,
      confirmed: true,
    })
    expect(result.isError).toBe(true)
    const schema = publishedOutputSchema(tool("Bulk-Move-Companies").outputSchema!)
    expect(() => schema.parse(result.structuredContent)).not.toThrow()
  })
})

describe("Bulk-Copy-Companies", () => {
  it("requires a selection: neither company_ids nor company_list_id is a local invalid_input", async () => {
    const result = await tool("Bulk-Copy-Companies").handler({ target_company_list_id: 9, confirmed: true })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect((result.structuredContent as any).error.code).toBe("invalid_input")
  })

  it("unconfirmed with company_ids uses ids.length and emits a strict-schema pendingToolCall", async () => {
    const result = await tool("Bulk-Copy-Companies").handler({
      target_company_list_id: 9,
      company_ids: [1, 2],
      confirmed: false,
    })
    expect(mockFetch).not.toHaveBeenCalled()
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("awaiting_confirmation")
    const nextAction = nextActionSchema.parse(sc.nextAction)
    if (nextAction.kind !== "ask_user") throw new Error("expected ask_user")
    // Id-derived counts are upper bounds (Rails copies the intersection).
    expect(nextAction.question).toContain("up to 2 companies")
    expect(nextAction.question).toContain("company list 9")
    expect(nextAction.pendingToolCall).toEqual({
      tool: "Bulk-Copy-Companies",
      args: { target_company_list_id: 9, company_ids: [1, 2], confirmed: true },
    })
    expect(bulkCopyCompaniesArgsSchema.safeParse(nextAction.pendingToolCall!.args).success).toBe(true)
  })

  it("unconfirmed with a source list performs ONLY the count GET", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ data: { id: 3, name: "Src", type: "static", companies_count: 57 } }))
    const result = await tool("Bulk-Copy-Companies").handler({
      target_company_list_id: 9,
      company_list_id: 3,
      confirmed: false,
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.hunter.io/v2/company-lists/3")
    const sc = result.structuredContent as any
    // List-derived count is an upper bound under member-scoped authorization.
    expect(sc.nextAction.question).toContain("up to 57 companies")
    expect(sc.nextAction.pendingToolCall.args).toEqual({
      target_company_list_id: 9,
      company_list_id: 3,
      confirmed: true,
    })
    expect(bulkCopyCompaniesArgsSchema.safeParse(sc.nextAction.pendingToolCall.args).success).toBe(true)
  })

  it("confirmed POSTs the Rails form body and the 202 payload validates", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk(
        {
          data: { target_company_list_id: 9, companies_count: 2, status: "queued" },
          meta: { params: { company_list_id: null, target_company_list_id: "9", company_ids: ["1", "2"] } },
        },
        202,
      ),
    )
    const result = await tool("Bulk-Copy-Companies").handler({
      target_company_list_id: 9,
      company_ids: [1, 2],
      confirmed: true,
    })
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/companies/bulk/copy")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    const body = new URLSearchParams(opts.body)
    expect(body.get("target_company_list_id")).toBe("9")
    expect(body.getAll("company_ids[]")).toEqual(["1", "2"])
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("queued")
    const schema = publishedOutputSchema(tool("Bulk-Copy-Companies").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("passes a 422 Rails error through as isError", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({
        errors: [{ id: "validation_failed", code: 422, details: "Companies can only be copied into a static list." }],
      }),
    )
    const result = await tool("Bulk-Copy-Companies").handler({
      target_company_list_id: 9,
      company_ids: [1],
      confirmed: true,
    })
    expect(result.isError).toBe(true)
  })
})

describe("Bulk-Delete-Companies", () => {
  it("unconfirmed with a list id performs ONLY the count GET and demands the count double-check", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ data: { id: 4, name: "Old", type: "static", companies_count: 12 } }))
    const result = await tool("Bulk-Delete-Companies").handler({ company_list_id: 4, confirmed: false })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.hunter.io/v2/company-lists/4")
    expect(mockFetch.mock.calls[0][1].method).toBe("GET")
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("awaiting_confirmation")
    expect(sc.data.requested_count).toBe(12)
    const nextAction = nextActionSchema.parse(sc.nextAction)
    if (nextAction.kind !== "ask_user") throw new Error("expected ask_user")
    // List-derived count is an upper bound: member-scoped bulk delete.
    expect(nextAction.question).toContain("permanently deletes up to 12 companies")
    expect(nextAction.question).toContain("explicitly confirm the count")
    expect(nextAction.pendingToolCall).toEqual({
      tool: "Bulk-Delete-Companies",
      args: { company_list_id: 4, confirmed: true },
    })
    expect(bulkDeleteCompaniesArgsSchema.safeParse(nextAction.pendingToolCall!.args).success).toBe(true)
  })

  it("unconfirmed falls back to naming the list when the count fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("timeout"))
    const result = await tool("Bulk-Delete-Companies").handler({ company_list_id: 4, confirmed: false })
    const sc = result.structuredContent as any
    expect(sc.nextAction.question).toContain("ALL companies in company list 4")
  })

  it("requires a selection: no company_ids and no company_list_id is a local invalid_input", async () => {
    const result = await tool("Bulk-Delete-Companies").handler({ confirmed: true })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect((result.structuredContent as any).error.code).toBe("invalid_input")
  })

  it("confirmed sync path POSTs and the 200 deleted_count payload validates", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk({
        data: { requested_count: 2, deleted_count: 2, status: "completed" },
        meta: { params: { company_ids: ["8", "9"], company_list_id: null } },
      }),
    )
    const result = await tool("Bulk-Delete-Companies").handler({ company_ids: [8, 9], confirmed: true })
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/companies/bulk/delete")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    expect(new URLSearchParams(opts.body).getAll("company_ids[]")).toEqual(["8", "9"])
    const sc = result.structuredContent as any
    expect(sc.data.deleted_count).toBe(2)
    expect(sc.data.status).toBe("completed")
    const schema = publishedOutputSchema(tool("Bulk-Delete-Companies").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("confirmed async path validates the 202 queued payload and the error envelope", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk(
        {
          data: { requested_count: 500, status: "queued" },
          meta: { params: { company_ids: null, company_list_id: "4" } },
        },
        202,
      ),
    )
    const result = await tool("Bulk-Delete-Companies").handler({ company_list_id: 4, confirmed: true })
    const sc = result.structuredContent as any
    expect(sc.data.status).toBe("queued")
    const schema = publishedOutputSchema(tool("Bulk-Delete-Companies").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
    expect(() =>
      schema.parse({
        error: { code: "not_found", retryable: false, message: "Company list not found." },
      }),
    ).not.toThrow()
  })

  it("passes a 422 Rails error through as isError", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({ errors: [{ id: "validation_failed", code: 422, details: "No companies matched the selection." }] }),
    )
    const result = await tool("Bulk-Delete-Companies").handler({ company_ids: [1], confirmed: true })
    expect(result.isError).toBe(true)
  })
})

describe("id-array cap", () => {
  it("100 ids (the schema max) still produce an intact, parseable pendingToolCall", async () => {
    // embedNextAction downgrades payloads over its 2048-byte cap to a generic
    // ask_user WITHOUT pendingToolCall — the cap of 100 ids must stay under it.
    const ids = Array.from({ length: 100 }, (_, i) => 1_000_000 + i)
    const result = await tool("Bulk-Delete-Leads").handler({ lead_ids: ids, confirmed: false })
    expect(mockFetch).not.toHaveBeenCalled()
    const sc = result.structuredContent as any
    const nextAction = nextActionSchema.parse(sc.nextAction)
    if (nextAction.kind !== "ask_user") throw new Error("expected ask_user")
    expect(nextAction.question).toContain("up to 100 leads")
    expect(nextAction.pendingToolCall).toBeDefined()
    expect(bulkDeleteLeadsArgsSchema.safeParse(nextAction.pendingToolCall!.args).success).toBe(true)
    expect((nextAction.pendingToolCall!.args as any).lead_ids).toHaveLength(100)
  })

  it("every bulk tool's input schema rejects 101 ids and accepts 100", () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1)
    const cases: Array<[string, string, Record<string, unknown>]> = [
      ["Bulk-Move-Leads", "lead_ids", { leads_list_id: 5, target_leads_list_id: 9, confirmed: true }],
      ["Bulk-Delete-Leads", "lead_ids", { confirmed: true }],
      ["Bulk-Move-Companies", "company_ids", { company_list_id: 7, target_company_list_id: 9, confirmed: true }],
      ["Bulk-Copy-Companies", "company_ids", { target_company_list_id: 9, confirmed: true }],
      ["Bulk-Delete-Companies", "company_ids", { confirmed: true }],
    ]
    for (const [name, idsField, baseArgs] of cases) {
      const schema = z.object(tool(name).inputSchema as Record<string, z.ZodTypeAny>)
      expect(schema.safeParse({ ...baseArgs, [idsField]: ids(100) }).success).toBe(true)
      expect(schema.safeParse({ ...baseArgs, [idsField]: ids(101) }).success).toBe(false)
    }
  })
})
