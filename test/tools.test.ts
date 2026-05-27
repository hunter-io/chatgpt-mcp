import { beforeEach, describe, expect, it, vi } from "vitest"

type ToolHandler = (...args: any[]) => any

const registeredTools = new Map<
  string,
  {
    description: string
    inputSchema: Record<string, unknown>
    outputSchema?: Record<string, unknown>
    annotations: Record<string, unknown>
    meta?: Record<string, unknown>
    handler: ToolHandler
  }
>()

const registeredResources = new Map<string, unknown>()
const registeredPrompts = new Map<string, unknown>()

// Mock the MCP SDK so we capture every registration as a plain object — no
// network, no real server. Mirrors remote-mcp/test/tools.test.ts.
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    registerTool(
      name: string,
      config: {
        description: string
        inputSchema: Record<string, unknown>
        outputSchema?: Record<string, unknown>
        annotations?: Record<string, unknown>
        _meta?: Record<string, unknown>
      },
      handler: ToolHandler,
    ) {
      registeredTools.set(name, {
        description: config.description,
        inputSchema: config.inputSchema,
        outputSchema: config.outputSchema,
        annotations: config.annotations ?? {},
        meta: config._meta,
        handler,
      })
    }

    registerResource(name: string, _uri: string, _opts: unknown, handler: unknown) {
      registeredResources.set(name, handler)
    }

    registerPrompt(name: string, _config: unknown, handler: unknown) {
      registeredPrompts.set(name, handler)
    }
  },
}))

vi.mock("agents/mcp", () => ({
  McpAgent: class MockMcpAgent {
    props: Record<string, unknown> = {}
    ctx = { storage: { get: async () => undefined, put: async () => undefined } }
    server: any
    async onStart() {
      // no-op
    }
  },
}))

const { HunterChatGPTMCP } = await import("../src/index")

async function createInitializedMCP() {
  const Ctor = HunterChatGPTMCP as unknown as new () => {
    props: Record<string, unknown>
    init(): Promise<void>
  }
  const instance = new Ctor()
  instance.props = { apiKey: "test-api-key", environment: "production" }
  await instance.init()
  return instance
}

// All 35 chatgpt-mcp tools — kept in sync with TOOL_NAMES via the dedicated
// "all TOOL_NAMES are registered" assertion below.
const ALL_TOOL_NAMES = [
  "Find-Companies",
  "Domain-Search",
  "Email-Finder",
  "Email-Verifier",
  "Email-Count",
  "Person-Enrichment",
  "Company-Enrichment",
  "Combined-Enrichment",
  "Get-Account-Details",
  "List-Leads",
  "Get-Lead",
  "Create-Lead",
  "Update-Lead",
  "Delete-Lead",
  "Create-Or-Update-Lead",
  "Create-Lead-If-Missing",
  "Lead-Exists",
  "Save-Company",
  "List-Leads-Lists",
  "Get-Leads-List",
  "Create-Leads-List",
  "Update-Leads-List",
  "Delete-Leads-List",
  "Merge-Leads-Lists",
  "List-Custom-Attributes",
  "Get-Custom-Attribute",
  "Create-Custom-Attribute",
  "Update-Custom-Attribute",
  "Delete-Custom-Attribute",
  "List-Campaigns",
  "List-Campaign-Recipients",
  "Add-Campaign-Recipients",
  "Remove-Campaign-Recipients",
  "Start-Campaign",
  "Plan-Prospecting-Flow",
]

describe("tool registration", () => {
  beforeEach(async () => {
    registeredTools.clear()
    registeredResources.clear()
    registeredPrompts.clear()
    await createInitializedMCP()
  })

  it(`registers exactly ${ALL_TOOL_NAMES.length} tools`, () => {
    expect(registeredTools.size).toBe(ALL_TOOL_NAMES.length)
  })

  it.each(ALL_TOOL_NAMES)("registers tool '%s'", (name) => {
    expect(registeredTools.has(name)).toBe(true)
    expect(registeredTools.get(name)!.description.length).toBeGreaterThan(0)
  })
})

// ─── HUN-19943: outputSchema coverage ───────────────────────────────────────
//
// THIS IS THE LOAD-BEARING ASSERTION. The OpenAI dashboard rejection cited
// "Recommended: Add an outputSchema" on every tool; the entire HUN-19943 PR
// exists to fix that. If anyone removes outputSchema from a tool, this test
// must fail before the regression reaches production.
describe("HUN-19943: every tool declares an outputSchema", () => {
  beforeEach(async () => {
    registeredTools.clear()
    await createInitializedMCP()
  })

  it.each(ALL_TOOL_NAMES)("tool '%s' has outputSchema", (name) => {
    const tool = registeredTools.get(name)
    expect(tool).toBeDefined()
    expect(tool!.outputSchema, `tool '${name}' is missing outputSchema`).toBeDefined()
    expect(typeof tool!.outputSchema, `outputSchema for '${name}' must be an object`).toBe("object")
  })
})

describe("tool annotations (HUN-20170 submission-aligned matrix)", () => {
  beforeEach(async () => {
    registeredTools.clear()
    await createInitializedMCP()
  })

  // READ_ONLY_PUBLIC: public-data lookups (Hunter's hosted index of public-
  // internet data). readOnly=true, destructive=false, openWorld=true.
  const readOnlyPublicTools = ["Find-Companies", "Email-Count"]

  it.each(readOnlyPublicTools)("tool '%s' has read-only-public annotations", (name) => {
    const tool = registeredTools.get(name)
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({ readOnlyHint: true, destructiveHint: false, openWorldHint: true })
  })

  // BILLABLE_LOOKUP: paid lookups that consume credits. State change without
  // irreversible side effect. readOnly=false, destructive=false, openWorld=true.
  const billableLookupTools = [
    "Domain-Search",
    "Email-Finder",
    "Email-Verifier",
    "Person-Enrichment",
    "Company-Enrichment",
    "Combined-Enrichment",
  ]

  it.each(billableLookupTools)("tool '%s' has billable-lookup annotations", (name) => {
    const tool = registeredTools.get(name)
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({ readOnlyHint: false, destructiveHint: false, openWorldHint: true })
  })

  // PRIVATE_READ: read-only access to the user's private Hunter workspace.
  // readOnly=true, destructive=false, openWorld=false.
  const privateReadTools = [
    "Get-Account-Details",
    "List-Leads",
    "Get-Lead",
    "Lead-Exists",
    "List-Leads-Lists",
    "Get-Leads-List",
    "List-Custom-Attributes",
    "Get-Custom-Attribute",
    "List-Campaigns",
    "List-Campaign-Recipients",
  ]

  it.each(privateReadTools)("tool '%s' has private-read annotations", (name) => {
    const tool = registeredTools.get(name)
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({ readOnlyHint: true, destructiveHint: false, openWorldHint: false })
  })

  // PRIVATE_WRITE: create-only writes to the user's private Hunter workspace.
  // readOnly=false, destructive=false, openWorld=false.
  const privateWriteTools = [
    "Create-Lead",
    "Create-Lead-If-Missing",
    "Save-Company",
    "Create-Leads-List",
    "Update-Leads-List",
    "Create-Custom-Attribute",
    "Update-Custom-Attribute",
  ]

  it.each(privateWriteTools)("tool '%s' has private-write annotations", (name) => {
    const tool = registeredTools.get(name)
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({ readOnlyHint: false, destructiveHint: false, openWorldHint: false })
  })

  // PRIVATE_DESTRUCTIVE: overwrite/delete/merge in the user's private Hunter
  // workspace. readOnly=false, destructive=true, openWorld=false.
  const privateDestructiveTools = [
    "Update-Lead",
    "Create-Or-Update-Lead",
    "Delete-Lead",
    "Delete-Leads-List",
    "Merge-Leads-Lists",
    "Delete-Custom-Attribute",
  ]

  it.each(privateDestructiveTools)("tool '%s' has private-destructive annotations", (name) => {
    const tool = registeredTools.get(name)
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({ readOnlyHint: false, destructiveHint: true, openWorldHint: false })
  })

  // Add-Campaign-Recipients: WRITE_ANNOTATIONS (unchanged) — affects active/
  // outbound campaigns, so openWorld stays true.
  it("tool 'Add-Campaign-Recipients' has write annotations (openWorld=true)", () => {
    const tool = registeredTools.get("Add-Campaign-Recipients")
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({ readOnlyHint: false, destructiveHint: false, openWorldHint: true })
  })

  // Remove-Campaign-Recipients: DESTRUCTIVE (unchanged) — cancels queued
  // outbound messages.
  it("tool 'Remove-Campaign-Recipients' has destructive annotations (openWorld=true)", () => {
    const tool = registeredTools.get("Remove-Campaign-Recipients")
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({ readOnlyHint: false, destructiveHint: true, openWorldHint: true })
  })

  it("tool 'Start-Campaign' has external-side-effect annotations", () => {
    const tool = registeredTools.get("Start-Campaign")
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({ readOnlyHint: false, destructiveHint: true, openWorldHint: true })
  })

  // LOCAL_PLAN: Plan-Prospecting-Flow synthesizes a plan locally; no Hunter
  // API call, no external side effect.
  it("tool 'Plan-Prospecting-Flow' has local-plan annotations (openWorld=false)", () => {
    const tool = registeredTools.get("Plan-Prospecting-Flow")
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({ readOnlyHint: true, destructiveHint: false, openWorldHint: false })
  })
})

describe("widget tools _meta", () => {
  beforeEach(async () => {
    registeredTools.clear()
    await createInitializedMCP()
  })

  it("Discover widget descriptor includes outputTemplate + widgetAccessible", () => {
    const tool = registeredTools.get("Find-Companies")
    expect(tool?.meta?.["openai/outputTemplate"]).toBe("ui://widget/discover-widget.html")
    expect(tool?.meta?.["openai/widgetAccessible"]).toBe(true)
  })

  it("Company-Enrichment widget descriptor includes outputTemplate + widgetAccessible", () => {
    const tool = registeredTools.get("Company-Enrichment")
    expect(tool?.meta?.["openai/outputTemplate"]).toBe("ui://widget/company-widget.html")
    expect(tool?.meta?.["openai/widgetAccessible"]).toBe(true)
  })
})

// HUN-19943 todos/024: confirmable-tool widening guard.
//
// `pendingToolCall.tool` is `z.literal(TOOL_NAMES.startCampaign)` in
// `schemas/common.ts` — only Start-Campaign can ride a confirmation
// pendingToolCall today. If a future change ever broadens this to a `z.enum`
// without a corresponding strict args schema per tool, this test fails before
// the regression reaches production.
describe("HUN-19943 todos/024: confirmable-tool widening guard", () => {
  it("nextActionSchema rejects pendingToolCall.tool != 'Start-Campaign'", async () => {
    const { nextActionSchema } = await import("../src/schemas/common")
    const parse = nextActionSchema.safeParse({
      kind: "ask_user",
      question: "Confirm delete?",
      pendingToolCall: {
        tool: "Delete-Lead",
        args: { id: 1 },
      },
    })
    expect(parse.success).toBe(false)
  })

  it("nextActionSchema rejects pendingToolCall.args without confirmed:true", async () => {
    const { nextActionSchema } = await import("../src/schemas/common")
    const parse = nextActionSchema.safeParse({
      kind: "ask_user",
      question: "Confirm start?",
      pendingToolCall: {
        tool: "Start-Campaign",
        // Missing `confirmed: true` — strict shape rejects.
        args: { campaign_id: 42 },
      },
    })
    expect(parse.success).toBe(false)
  })

  it("nextActionSchema rejects pendingToolCall.args with extra fields", async () => {
    const { nextActionSchema } = await import("../src/schemas/common")
    const parse = nextActionSchema.safeParse({
      kind: "ask_user",
      question: "Confirm start?",
      pendingToolCall: {
        tool: "Start-Campaign",
        args: { campaign_id: 42, confirmed: true, smuggled: "evil" },
      },
    })
    expect(parse.success).toBe(false)
  })

  it("nextActionSchema accepts the valid Start-Campaign confirmation shape", async () => {
    const { nextActionSchema } = await import("../src/schemas/common")
    const parse = nextActionSchema.safeParse({
      kind: "ask_user",
      question: "Confirm start?",
      pendingToolCall: {
        tool: "Start-Campaign",
        args: { campaign_id: 42, confirmed: true },
      },
    })
    expect(parse.success).toBe(true)
  })
})

// Headless agent-consumption chain test (HUN-19943 todos/022 + HUN-20170).
//
// Asserts the multi-company prospecting chain advances correctly without the
// next step ever reading `content[]`. Each tool's `structuredContent.nextAction
// .suggestedArgs` is the SOLE input the next tool consumes. If any step's
// suggestedArgs drift from the next handler's inputSchema, this test fails.
//
// HUN-20170: terminal save step is Create-Lead-If-Missing, not the destructive
// Create-Or-Update-Lead, so the loop never triggers a host confirmation.
//
// Scenario: seed Domain-Search with `pending_companies = ["b.com"]`,
//   step 1: Domain-Search "a.com"               → Email-Verifier (carries pending)
//   step 2: Email-Verifier "user@a.com"         → Create-Lead-If-Missing (carries pending)
//   step 3: Create-Lead-If-Missing              → next Domain-Search "b.com"
//   step 4: Domain-Search "b.com" with empty pending → complete
describe("HUN-20170: headless prospecting chain advances via structuredContent.nextAction", () => {
  beforeEach(async () => {
    registeredTools.clear()
    await createInitializedMCP()
  })

  it("Domain-Search → Email-Verifier → Create-Lead-If-Missing → next Domain-Search threads pending_companies", async () => {
    // Step 1: Domain-Search "a.com" returns one email + pending_companies=["b.com"].
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              data: { domain: "a.com", emails: [{ value: "user@a.com", type: "personal" }] },
            }),
          ),
      }),
    )
    const dsHandler = registeredTools.get("Domain-Search")!.handler
    const dsResult = await dsHandler({ domain: "a.com", pending_companies: ["b.com"] })
    expect(dsResult.isError).toBeUndefined()
    const dsNext = (
      dsResult.structuredContent as {
        nextAction: { kind: string; tool: string; suggestedArgs: { email: string; pending_companies: string[] } }
      }
    ).nextAction
    expect(dsNext.kind).toBe("call_tool")
    expect(dsNext.tool).toBe("Email-Verifier")
    expect(dsNext.suggestedArgs.email).toBe("user@a.com")
    expect(dsNext.suggestedArgs.pending_companies).toEqual(["b.com"])

    // Step 2: Email-Verifier "user@a.com" (valid) chains into
    // Create-Lead-If-Missing, carrying pending_companies = ["b.com"].
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { status: "valid", email: "user@a.com", score: 90 } })),
      }),
    )
    const evHandler = registeredTools.get("Email-Verifier")!.handler
    const evResult = await evHandler(dsNext.suggestedArgs)
    expect(evResult.isError).toBeUndefined()
    const evNext = (
      evResult.structuredContent as {
        nextAction: { kind: string; tool: string; suggestedArgs: { email: string; pending_companies: string[] } }
      }
    ).nextAction
    expect(evNext.kind).toBe("call_tool")
    expect(evNext.tool).toBe("Create-Lead-If-Missing")
    expect(evNext.suggestedArgs.email).toBe("user@a.com")
    expect(evNext.suggestedArgs.pending_companies).toEqual(["b.com"])

    // Step 3: Create-Lead-If-Missing pre-flights /leads/exist (not found), then
    // POSTs /leads (success). Chains into next Domain-Search for "b.com" with
    // empty pending_companies (last domain in the loop).
    const cmFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: null, leads_list_id: null, leads_list_name: null } })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: 1234, email: "user@a.com" } })),
      })
    vi.stubGlobal("fetch", cmFetch)
    const cmHandler = registeredTools.get("Create-Lead-If-Missing")!.handler
    const cmResult = await cmHandler(evNext.suggestedArgs)
    expect(cmResult.isError).toBeUndefined()
    expect(cmFetch).toHaveBeenCalledTimes(2)
    const cmNext = (
      cmResult.structuredContent as {
        nextAction: { kind: string; tool: string; suggestedArgs: { domain: string; pending_companies: string[] } }
      }
    ).nextAction
    expect(cmNext.kind).toBe("call_tool")
    expect(cmNext.tool).toBe("Domain-Search")
    expect(cmNext.suggestedArgs.domain).toBe("b.com")
    expect(cmNext.suggestedArgs.pending_companies).toEqual([])
  })

  it("Domain-Search with empty pending_companies terminates loop via complete", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { domain: "c.com", emails: [] } })),
      }),
    )
    const dsHandler = registeredTools.get("Domain-Search")!.handler
    // Last hop: pending is empty after this domain.
    const result = await dsHandler({ domain: "c.com", pending_companies: [] })
    expect(result.isError).toBeUndefined()
    const next = (result.structuredContent as { nextAction: { kind: string; summary: string } }).nextAction
    expect(next.kind).toBe("complete")
    expect(next.summary).toContain("Multi-company loop complete")
  })
})

// HUN-20170: Create-Lead-If-Missing covers (a) create, (b) no-op on duplicate,
// (c) no-overwrite on duplicate with different fields supplied, (d) no list move
// on duplicate, (e) loop-carry on create path, (f) loop-carry on alreadyExisted
// path (the bug ChatGPT plan-review flagged), (g) filter-carry forwarding.
describe("HUN-20170: Create-Lead-If-Missing", () => {
  beforeEach(async () => {
    registeredTools.clear()
    await createInitializedMCP()
  })

  it("(a) creates a new lead when email doesn't exist", async () => {
    // First call: /leads/exist → not found (id: null)
    // Second call: POST /leads → created
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: null, leads_list_id: null, leads_list_name: null } })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(JSON.stringify({ data: { id: 42, email: "new@example.com", first_name: "Alice" } })),
      })
    vi.stubGlobal("fetch", fetchMock)

    const handler = registeredTools.get("Create-Lead-If-Missing")!.handler
    const result = await handler({ email: "new@example.com", first_name: "Alice" })

    expect(result.isError).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/leads/exist")
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/leads")
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST")
    const data = (result.structuredContent as { data: { id: number; alreadyExisted?: boolean } }).data
    expect(data.id).toBe(42)
    expect(data.alreadyExisted).toBeUndefined()
  })

  it("(b) returns existing lead unchanged when email already exists", async () => {
    // First call: /leads/exist → found (id: 99)
    // Second call: GET /leads/99 → returns existing record
    // No POST should occur.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(JSON.stringify({ data: { id: 99, leads_list_id: 7, leads_list_name: "Existing list" } })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({ data: { id: 99, email: "dup@example.com", first_name: "OriginalName" } }),
          ),
      })
    vi.stubGlobal("fetch", fetchMock)

    const handler = registeredTools.get("Create-Lead-If-Missing")!.handler
    const result = await handler({ email: "dup@example.com" })

    expect(result.isError).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2) // exist + GET, no POST
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/leads/99")
    const data = (result.structuredContent as { data: { id: number; first_name: string; alreadyExisted: boolean } }).data
    expect(data.id).toBe(99)
    expect(data.first_name).toBe("OriginalName")
    expect(data.alreadyExisted).toBe(true)
  })

  it("(c) does NOT overwrite existing fields even when caller supplies different values", async () => {
    // Caller supplies first_name="NewName" but the existing lead has "OriginalName".
    // The tool must NOT issue a PUT/POST — the existing value should be returned untouched.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: 99, leads_list_id: null, leads_list_name: null } })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(JSON.stringify({ data: { id: 99, email: "dup@example.com", first_name: "OriginalName" } })),
      })
    vi.stubGlobal("fetch", fetchMock)

    const handler = registeredTools.get("Create-Lead-If-Missing")!.handler
    const result = await handler({
      email: "dup@example.com",
      first_name: "NewName",
      position: "Should-Not-Apply",
      notes: "Should-Not-Apply",
    })

    expect(result.isError).toBeUndefined()
    // Critical: only exist + GET. No POST/PUT/PATCH that would overwrite.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const call of fetchMock.mock.calls) {
      const method = (call[1] as { method?: string } | undefined)?.method
      expect(method).not.toBe("POST")
      expect(method).not.toBe("PUT")
      expect(method).not.toBe("PATCH")
    }
    const data = (result.structuredContent as { data: { first_name: string; alreadyExisted: boolean } }).data
    expect(data.first_name).toBe("OriginalName") // unchanged from server
    expect(data.alreadyExisted).toBe(true)
  })

  it("(d) does NOT move existing lead to a new list when leads_list_id is supplied", async () => {
    // Caller supplies leads_list_id=99 but the existing lead is on list 7.
    // No mutation should occur — the existing lead stays where it is.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(JSON.stringify({ data: { id: 50, leads_list_id: 7, leads_list_name: "Original" } })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              data: { id: 50, email: "existing@example.com", leads_list: { id: 7, name: "Original" } },
            }),
          ),
      })
    vi.stubGlobal("fetch", fetchMock)

    const handler = registeredTools.get("Create-Lead-If-Missing")!.handler
    const result = await handler({ email: "existing@example.com", leads_list_id: 99 })

    expect(result.isError).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // No POST/PUT — no list move.
    for (const call of fetchMock.mock.calls) {
      const method = (call[1] as { method?: string } | undefined)?.method
      expect(method !== "POST" && method !== "PUT").toBe(true)
    }
  })

  it("(e) on create path with pending_companies non-empty, emits nextAction to next Domain-Search", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: null, leads_list_id: null, leads_list_name: null } })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: 100, email: "new@a.com" } })),
      })
    vi.stubGlobal("fetch", fetchMock)

    const handler = registeredTools.get("Create-Lead-If-Missing")!.handler
    const result = await handler({ email: "new@a.com", pending_companies: ["b.com", "c.com"] })

    expect(result.isError).toBeUndefined()
    const next = (
      result.structuredContent as {
        nextAction: { kind: string; tool: string; suggestedArgs: { domain: string; pending_companies: string[] } }
      }
    ).nextAction
    expect(next.kind).toBe("call_tool")
    expect(next.tool).toBe("Domain-Search")
    expect(next.suggestedArgs.domain).toBe("b.com")
    expect(next.suggestedArgs.pending_companies).toEqual(["c.com"])
  })

  it("(f) on alreadyExisted path with pending_companies non-empty, ALSO emits nextAction to next Domain-Search", async () => {
    // This is the regression guard for the loop-carry bug ChatGPT plan-review
    // caught: a naive implementation would only forward on the create path.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: 55, leads_list_id: null, leads_list_name: null } })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: 55, email: "dup@a.com" } })),
      })
    vi.stubGlobal("fetch", fetchMock)

    const handler = registeredTools.get("Create-Lead-If-Missing")!.handler
    const result = await handler({ email: "dup@a.com", pending_companies: ["b.com", "c.com"] })

    expect(result.isError).toBeUndefined()
    const next = (
      result.structuredContent as {
        nextAction: { kind: string; tool: string; suggestedArgs: { domain: string; pending_companies: string[] } }
      }
    ).nextAction
    expect(next.kind).toBe("call_tool")
    expect(next.tool).toBe("Domain-Search")
    expect(next.suggestedArgs.domain).toBe("b.com")
    expect(next.suggestedArgs.pending_companies).toEqual(["c.com"])
  })

  it("(g) forwards Domain-Search filter-carry fields into the next-Domain-Search suggestedArgs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: null, leads_list_id: null, leads_list_name: null } })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: 200, email: "user@a.com" } })),
      })
    vi.stubGlobal("fetch", fetchMock)

    const handler = registeredTools.get("Create-Lead-If-Missing")!.handler
    const result = await handler({
      email: "user@a.com",
      pending_companies: ["b.com"],
      limit: 10,
      type: "personal",
      seniority: "executive",
      department: "marketing",
      required_field: "position",
    })

    expect(result.isError).toBeUndefined()
    const args = (
      result.structuredContent as {
        nextAction: {
          suggestedArgs: {
            domain: string
            pending_companies: string[]
            limit?: number
            type?: string
            seniority?: string
            department?: string
            required_field?: string
          }
        }
      }
    ).nextAction.suggestedArgs
    expect(args.domain).toBe("b.com")
    expect(args.limit).toBe(10)
    expect(args.type).toBe("personal")
    expect(args.seniority).toBe("executive")
    expect(args.department).toBe("marketing")
    expect(args.required_field).toBe("position")
  })

  it("single-call mode (no pending_companies): create path emits complete", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: null, leads_list_id: null, leads_list_name: null } })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: 1, email: "x@y.com" } })),
      })
    vi.stubGlobal("fetch", fetchMock)

    const handler = registeredTools.get("Create-Lead-If-Missing")!.handler
    const result = await handler({ email: "x@y.com" })
    const next = (result.structuredContent as { nextAction: { kind: string; summary: string } }).nextAction
    expect(next.kind).toBe("complete")
    expect(next.summary).toContain("Lead saved")
  })

  // Annotation assertion lives in the privateWriteTools it.each in the
  // "tool annotations" describe block above; no need to duplicate here.
})

// HUN-20170: Hunter's 402 response includes an "upgrade your plan or purchase
// credits" CTA. OpenAI's app guidelines forbid in-ChatGPT purchase/upgrade
// CTAs (including freemium upsells), so mapHunterError must scrub it before
// the user sees it.
describe("HUN-20170: 402 quota response scrubs the upstream upgrade CTA", () => {
  beforeEach(async () => {
    registeredTools.clear()
    await createInitializedMCP()
  })

  it("returns a neutral quota message and never echoes the Hunter upgrade CTA", async () => {
    // Hunter's actual 402 body, copied from validation.rb.
    const upstream402Body = JSON.stringify({
      errors: [
        {
          id: "payment_required",
          code: 402,
          details:
            "You have exhausted your plan's monthly request quota. Please log in to Hunter to upgrade your plan or purchase additional credits.",
        },
      ],
    })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 402,
        headers: { get: () => null },
        text: () => Promise.resolve(upstream402Body),
      }),
    )
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    try {
      // Any billable lookup is sufficient — Domain-Search is the most common.
      const handler = registeredTools.get("Domain-Search")!.handler
      const result = await handler({ domain: "example.com" })

      expect(result.isError).toBe(true)

      // structuredContent.error code is preserved so the agent can recover.
      const err = (result.structuredContent as { error: { code: string; message: string; field?: string } }).error
      expect(err.code).toBe("quota_exceeded")

      // CRITICAL: the user-facing message must not contain ANY upgrade-CTA copy.
      const userText = result.content[0]?.text ?? ""
      expect(userText.toLowerCase()).not.toContain("upgrade")
      expect(userText.toLowerCase()).not.toContain("purchase")
      expect(userText.toLowerCase()).not.toContain("please log in")

      // And it MUST contain the neutral quota notice.
      expect(userText).toContain("quota is exhausted")
      expect(err.message).toContain("quota is exhausted")

      // HUN-20170 todo #104: the upstream message is logged once (sanitized)
      // for operator triage — never reaches the user, but stays in Workers
      // logs. Verify the warn fired with the upstream content.
      expect(warnSpy).toHaveBeenCalledTimes(1)
      const warnArg = warnSpy.mock.calls[0]?.[0] ?? ""
      expect(warnArg).toContain("scrubbed 402 quota response")

      // And `parsedField` (the Hunter `errors[0].id` hint) is surfaced on the
      // envelope so the agent can recover programmatically without grepping
      // the user-facing prose.
      expect(err.field).toBe("payment_required")
    } finally {
      warnSpy.mockRestore()
    }
  })
})

// HUN-20170: slash prompts must route save flows through the non-destructive
// Create-Lead-If-Missing tool, not the now-PRIVATE_DESTRUCTIVE Create-Or-
// Update-Lead. Otherwise the slash-command UX fires a per-recipient host
// confirmation prompt and the multi-company loop becomes unusable.
describe("HUN-20170: slash prompts route saves to Create-Lead-If-Missing", () => {
  beforeEach(async () => {
    registeredTools.clear()
    registeredResources.clear()
    registeredPrompts.clear()
    await createInitializedMCP()
  })

  it.each(["prospect", "build-list"])("'%s' prompt is registered", (name) => {
    expect(registeredPrompts.has(name)).toBe(true)
  })

  it.each(["prospect", "build-list"])("'%s' prompt references Create-Lead-If-Missing for the save step", async (name) => {
    const handler = registeredPrompts.get(name) as (args: { query?: string; description?: string }) => Promise<{
      messages: { content: { text: string } }[]
    }>
    const result = await handler({ query: "test query", description: "test description" })
    const text = result.messages[0]?.content.text ?? ""
    expect(text).toContain("Create-Lead-If-Missing")
  })

  it.each(["prospect", "build-list"])(
    "'%s' prompt does NOT instruct the model to use Create-Or-Update-Lead in the save step",
    async (name) => {
      const handler = registeredPrompts.get(name) as (args: { query?: string; description?: string }) => Promise<{
        messages: { content: { text: string } }[]
      }>
      const result = await handler({ query: "test query", description: "test description" })
      const text = result.messages[0]?.content.text ?? ""
      // Hard guard against the rejected language that broke the loop UX.
      expect(text).not.toContain("Create-Or-Update-Lead")
      expect(text).not.toContain("Upsert-Lead")
    },
  )

  it.each(["prospect", "build-list"])(
    "'%s' prompt references Find-Companies (not the renamed Discover) for the search step",
    async (name) => {
      const handler = registeredPrompts.get(name) as (args: { query?: string; description?: string }) => Promise<{
        messages: { content: { text: string } }[]
      }>
      const result = await handler({ query: "test query", description: "test description" })
      const text = result.messages[0]?.content.text ?? ""
      expect(text).toContain("Find-Companies")
      expect(text).not.toMatch(/\bDiscover\b/)
    },
  )
})

// HUN-20170: capabilities-recovery is the model-visible resource referenced by
// Plan-Prospecting-Flow before ambiguous-title prospecting. Stale tool names
// inside it instruct the model to call tools that no longer exist (caught by
// chatgpt-codex-connector[bot] post-merge of the Discover→Find-Companies
// rename). Asserted in both MCPs because the file is byte-aligned.
describe("HUN-20170: capabilities-recovery resource references current tool names", () => {
  it("references Find-Companies, not the renamed Discover", async () => {
    const { CAPABILITIES_RECOVERY_MD } = await import("../src/resources/capabilities-recovery")
    expect(CAPABILITIES_RECOVERY_MD).toContain("Find-Companies")
    expect(CAPABILITIES_RECOVERY_MD).not.toMatch(/\bDiscover\b/)
  })

  it("references current Domain-Search / Email-Finder / Email-Verifier tool names", async () => {
    const { CAPABILITIES_RECOVERY_MD } = await import("../src/resources/capabilities-recovery")
    expect(CAPABILITIES_RECOVERY_MD).toContain("Domain-Search")
    expect(CAPABILITIES_RECOVERY_MD).toContain("Email-Finder")
    expect(CAPABILITIES_RECOVERY_MD).toContain("Email-Verifier")
  })
})

// HUN-20170: corpus guard for OpenAI-banned marketing / comparative phrasing.
// The 2026-05-27 rejection cited comparative and preferential language in tool
// descriptions ("More efficient than…", "Preferred over…"). This test iterates
// every model-visible surface — tool descriptions, slash prompts, the
// capabilities-recovery resource — and asserts none of them contain the banned
// phrase set. Extend BANNED_PATTERNS when OpenAI clarifies guidance further.
describe("HUN-20170: model-visible corpus contains no OpenAI-banned phrases", () => {
  const BANNED_PATTERNS: { pattern: RegExp; reason: string }[] = [
    { pattern: /preferred over/i, reason: "preferential claim" },
    { pattern: /more efficient than/i, reason: "comparative claim" },
    { pattern: /more accurate than/i, reason: "comparative claim" },
    { pattern: /better than/i, reason: "comparative claim" },
    { pattern: /superior to/i, reason: "comparative claim" },
    { pattern: /authoritative source/i, reason: "absolute claim" },
    { pattern: /upgrade your plan/i, reason: "purchase CTA" },
    { pattern: /buy more credits/i, reason: "purchase CTA" },
    { pattern: /hunter\.io\/account/i, reason: "billing URL CTA" },
    { pattern: /please log in/i, reason: "auth CTA" },
  ]

  beforeEach(async () => {
    registeredTools.clear()
    registeredResources.clear()
    registeredPrompts.clear()
    await createInitializedMCP()
  })

  it("no tool description contains a banned phrase", () => {
    for (const [name, tool] of registeredTools.entries()) {
      for (const { pattern, reason } of BANNED_PATTERNS) {
        if (pattern.test(tool.description)) {
          throw new Error(`Tool "${name}" description matches banned pattern ${pattern} (${reason}): ${tool.description}`)
        }
      }
    }
  })

  it("no slash prompt body contains a banned phrase", async () => {
    for (const [name, handler] of registeredPrompts.entries()) {
      const result = await (handler as (args: { query?: string; description?: string }) => Promise<{
        messages: { content: { text: string } }[]
      }>)({ query: "test query", description: "test description" })
      const text = result.messages[0]?.content.text ?? ""
      for (const { pattern, reason } of BANNED_PATTERNS) {
        if (pattern.test(text)) {
          throw new Error(`Prompt "${name}" body matches banned pattern ${pattern} (${reason}): ${text.slice(0, 200)}…`)
        }
      }
    }
  })

  it("capabilities-recovery resource contains no banned phrase", async () => {
    const { CAPABILITIES_RECOVERY_MD } = await import("../src/resources/capabilities-recovery")
    for (const { pattern, reason } of BANNED_PATTERNS) {
      if (pattern.test(CAPABILITIES_RECOVERY_MD)) {
        throw new Error(`capabilities-recovery resource matches banned pattern ${pattern} (${reason})`)
      }
    }
  })
})
