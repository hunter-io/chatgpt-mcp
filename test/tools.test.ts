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

// All 34 chatgpt-mcp tools — kept in sync with TOOL_NAMES via the dedicated
// "all TOOL_NAMES are registered" assertion below.
const ALL_TOOL_NAMES = [
  "Discover",
  "Domain-Search",
  "Email-Finder",
  "Email-Verifier",
  "Email-Count",
  "Person-Enrichment",
  "Company-Enrichment",
  "Combined-Enrichment",
  "Account",
  "List-Leads",
  "Get-Lead",
  "Create-Lead",
  "Update-Lead",
  "Delete-Lead",
  "Upsert-Lead",
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
  "Prospecting",
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

describe("tool annotations", () => {
  beforeEach(async () => {
    registeredTools.clear()
    await createInitializedMCP()
  })

  // Tools that only read or compute information.
  const readOnlyTools = [
    "Discover",
    "Domain-Search",
    "Email-Verifier",
    "Email-Finder",
    "Email-Count",
    "Person-Enrichment",
    "Company-Enrichment",
    "Combined-Enrichment",
    "Account",
    "List-Leads",
    "Get-Lead",
    "Lead-Exists",
    "List-Leads-Lists",
    "Get-Leads-List",
    "List-Custom-Attributes",
    "Get-Custom-Attribute",
    "List-Campaigns",
    "List-Campaign-Recipients",
    "Prospecting",
  ]

  it.each(readOnlyTools)("tool '%s' has read-only annotations", (name) => {
    const tool = registeredTools.get(name)
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    })
  })

  const writeTools = [
    "Create-Lead",
    "Update-Lead",
    "Upsert-Lead",
    "Save-Company",
    "Create-Leads-List",
    "Update-Leads-List",
    "Create-Custom-Attribute",
    "Update-Custom-Attribute",
    "Add-Campaign-Recipients",
  ]

  it.each(writeTools)("tool '%s' has write annotations", (name) => {
    const tool = registeredTools.get(name)
    expect(tool).toBeDefined()
    // HUN-19943: openWorldHint: true reflects external Hunter SaaS surface.
    expect(tool!.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    })
  })

  const destructiveTools = [
    "Delete-Lead",
    "Delete-Leads-List",
    "Merge-Leads-Lists",
    "Delete-Custom-Attribute",
    "Remove-Campaign-Recipients",
  ]

  it.each(destructiveTools)("tool '%s' has destructive annotations", (name) => {
    const tool = registeredTools.get(name)
    expect(tool).toBeDefined()
    expect(tool!.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    })
  })

  it("tool 'Start-Campaign' has external-side-effect annotations", () => {
    const tool = registeredTools.get("Start-Campaign")
    expect(tool).toBeDefined()
    // HUN-19943: destructiveHint: true — Start-Campaign sends real outbound
    // email; the action is effectively irreversible.
    expect(tool!.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    })
  })
})

describe("widget tools _meta", () => {
  beforeEach(async () => {
    registeredTools.clear()
    await createInitializedMCP()
  })

  it("Discover widget descriptor includes outputTemplate + widgetAccessible", () => {
    const tool = registeredTools.get("Discover")
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

// HUN-19943 todos/022: headless agent-consumption chain test.
//
// Asserts the multi-company prospecting chain advances correctly without the
// next step ever reading `content[]`. Each tool's `structuredContent.nextAction
// .suggestedArgs` is the SOLE input the next tool consumes. If any step's
// suggestedArgs drift from the next handler's inputSchema, this test fails.
//
// Scenario: seed Domain-Search with `pending_companies = ["b.com"]`,
//   step 1: Domain-Search "a.com"  → chain into Email-Verifier (carries pending)
//   step 2: Email-Verifier "user@a.com" → chain into Upsert-Lead (carries pending)
//   step 3: Upsert-Lead → chain into Domain-Search "b.com" (loop continues)
//   step 4: Domain-Search "b.com" with empty `pending_companies` → call Email-Verifier
describe("HUN-19943 todos/022: headless prospecting chain advances via structuredContent.nextAction", () => {
  beforeEach(async () => {
    registeredTools.clear()
    await createInitializedMCP()
  })

  it("Domain-Search → Email-Verifier → Upsert-Lead → next Domain-Search threads pending_companies", async () => {
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

    // Step 2: Email-Verifier "user@a.com" (valid) chains into Upsert-Lead,
    // carrying pending_companies = ["b.com"].
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
    expect(evNext.tool).toBe("Upsert-Lead")
    expect(evNext.suggestedArgs.email).toBe("user@a.com")
    expect(evNext.suggestedArgs.pending_companies).toEqual(["b.com"])

    // Step 3: Upsert-Lead "user@a.com" succeeds, chains into next Domain-Search
    // for "b.com" with an empty pending_companies (last domain in the loop).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { id: 1234, email: "user@a.com" } })),
      }),
    )
    const usHandler = registeredTools.get("Upsert-Lead")!.handler
    const usResult = await usHandler(evNext.suggestedArgs)
    expect(usResult.isError).toBeUndefined()
    const usNext = (
      usResult.structuredContent as {
        nextAction: { kind: string; tool: string; suggestedArgs: { domain: string; pending_companies: string[] } }
      }
    ).nextAction
    expect(usNext.kind).toBe("call_tool")
    expect(usNext.tool).toBe("Domain-Search")
    expect(usNext.suggestedArgs.domain).toBe("b.com")
    expect(usNext.suggestedArgs.pending_companies).toEqual([])
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
