import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { withClientUserAgent } from "../src/client-context"
import { CODEX_FULL_SERVER_HINT } from "../src/codex-hint"
import {
  briefingBody,
  companyResultsBody,
  monitoredSignalsBody,
  opportunitiesBody,
  peopleResultsBody,
  signalsBody,
} from "./fixtures/briefing"

// HUN-24935: the tools of the Agent briefing endpoints, as the ChatGPT app
// serves them: no Domain-Search, and no person rows (HUN-23709).

type ToolHandler = (...args: any[]) => any

const registeredTools = new Map<
  string,
  {
    title?: string
    description: string
    inputSchema: Record<string, z.ZodTypeAny>
    outputSchema?: Record<string, z.ZodTypeAny>
    annotations: Record<string, unknown>
    handler: ToolHandler
  }
>()

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    registerTool(
      name: string,
      config: {
        title?: string
        description: string
        inputSchema: Record<string, z.ZodTypeAny>
        outputSchema?: Record<string, z.ZodTypeAny>
        annotations?: Record<string, unknown>
      },
      handler: ToolHandler,
    ) {
      registeredTools.set(name, { ...config, annotations: config.annotations ?? {}, handler })
    }

    registerResource() {}

    registerPrompt() {}
  },
}))

const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js")
const { registerBriefingTools } = await import("../src/tools/briefing")

const server = new (McpServer as never)()
registerBriefingTools(server, "test-api-key", "https://api.hunter.io/v2")

const tool = (name: string) => registeredTools.get(name)!
const call = (name: string, args: Record<string, unknown> = {}) =>
  tool(name).handler(z.object(tool(name).inputSchema).parse(args))
const accepts = (name: string, args: unknown) => z.object(tool(name).inputSchema).safeParse(args).success
const publishedOutputSchema = (name: string) => z.object(tool(name).outputSchema!).strict()

function stubFetch(body: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const requestedUrl = (fetchMock: ReturnType<typeof vi.fn>) => new URL(fetchMock.mock.calls[0]![0] as string)

afterEach(() => {
  vi.unstubAllGlobals()
})

const NAMES = [
  "Get-Briefing",
  "List-Opportunities",
  "Get-Opportunity-Results",
  "List-Signals",
  "List-Monitored-Signals",
]

describe("briefing tool metadata", () => {
  it.each(NAMES)("%s is titled, free, and has no wording that steers the model", (name) => {
    expect(tool(name).title?.trim()).toBeTruthy()
    expect(tool(name).description).toMatch(/Free \(no credits\)/)
    expect(tool(name).description).not.toMatch(/call (this|it) first|always call|prefer this|use this tool/i)
    expect(tool(name).description).not.toContain("Domain-Search")
  })
})

describe("Get-Briefing", () => {
  it("reads the first counted item for free, with ChatGPT links", async () => {
    const fetchMock = stubFetch(briefingBody())

    const result = await call("Get-Briefing", { leads_since: "2026-11-01T00:00:00Z" })

    expect(Object.fromEntries(requestedUrl(fetchMock).searchParams)).toEqual({ leads_since: "2026-11-01T00:00:00Z" })
    expect(result.structuredContent.data.needs_attention.items[0].next_call.mcp_tool).toBe("List-Signals")
    expect(result.structuredContent.nextAction).toMatchObject({
      kind: "call_tool",
      tool: "List-Signals",
      suggestedArgs: { source: "leads", since: "2026-10-29T09:00:00.000000Z", limit: 100 },
    })
    expect(accepts("List-Signals", result.structuredContent.nextAction.suggestedArgs)).toBe(true)
    expect(result.structuredContent.viewInHunter).toContain("utm_source=hunter-chatgpt")
  })

  it("reads an item whose zero count is not exact, because more pages follow", async () => {
    const body = briefingBody()
    body.data.needs_attention.items[0]!.count = 0
    body.data.needs_attention.items[0]!.count_exact = false
    stubFetch(body)

    const result = await call("Get-Briefing")

    expect(result.structuredContent.nextAction).toMatchObject({ kind: "call_tool", tool: "List-Signals" })
  })

  it("completes when nothing has a count", async () => {
    const body = briefingBody()
    body.data.needs_attention.items[0]!.count = 0
    stubFetch(body)

    const result = await call("Get-Briefing")

    expect(result.structuredContent.nextAction.kind).toBe("complete")
  })
})

describe("List-Opportunities", () => {
  it("opens the best companies opportunity, not a people one", async () => {
    stubFetch(opportunitiesBody())

    const result = await call("List-Opportunities")

    expect(result.structuredContent.nextAction).toMatchObject({
      kind: "call_tool",
      tool: "Get-Opportunity-Results",
      suggestedArgs: { opportunity_id: 9 },
    })
  })

  it("points to Hunter when every opportunity is a people one", async () => {
    const body = opportunitiesBody()
    body.data = body.data.filter((opportunity) => opportunity.type === "people")
    stubFetch(body)

    const result = await call("List-Opportunities")

    expect(result.structuredContent.nextAction.kind).toBe("complete")
    expect(result.structuredContent.nextAction.summary).toContain("viewInHunter")
  })
})

describe("Get-Opportunity-Results", () => {
  it("returns the number of people and a link, with no person row", async () => {
    stubFetch(peopleResultsBody())

    const result = await call("Get-Opportunity-Results", { opportunity_id: 812345 })

    expect(result.structuredContent.data).toEqual([])
    expect(result.structuredContent.meta).toEqual({ type: "people", results: 1, limit: 20, offset: 0 })
    expect(result.content[0].text).not.toContain("Ada")
    expect(result.content[0].text).not.toContain("aAKWnmY9z")
    expect(result.structuredContent.viewInHunter).toMatch(/^https:\/\/hunter\.io\/dashboard\?/)
    expect(result.structuredContent.nextAction).toMatchObject({ kind: "complete" })
  })

  it("completes when a people opportunity has no one left", async () => {
    stubFetch({ data: [], meta: { type: "people", results: 0, limit: 20, offset: 0 } })

    const result = await call("Get-Opportunity-Results", { opportunity_id: 812345 })

    expect(result.structuredContent.nextAction).toMatchObject({ kind: "complete" })
    expect(result.structuredContent.nextAction.summary).toContain("No people or companies are left")
  })

  it("lists companies and asks whether to save them", async () => {
    stubFetch(companyResultsBody())

    const result = await call("Get-Opportunity-Results", { opportunity_id: 9 })

    expect(result.structuredContent.data).toEqual(companyResultsBody().data)
    expect(result.structuredContent.nextAction.kind).toBe("ask_user")
  })

  it("gives a Codex user the full-server hint", async () => {
    stubFetch(companyResultsBody())

    const result = await withClientUserAgent("openai-mcp/1.0.0 (Codex)", () =>
      call("Get-Opportunity-Results", { opportunity_id: 9 }),
    )

    expect(result.structuredContent.message).toBe(CODEX_FULL_SERVER_HINT)
  })
})

describe("List-Signals", () => {
  it("keeps the details of every signal type the app shows", async () => {
    const body = signalsBody()
    const base = body.data[0]!
    const events = [
      {
        ...base,
        id: "lead:domain_event:1",
        type: "job_posted",
        details: {
          job: {
            title: "Engineer",
            location: "Paris",
            country: "France",
            employer_url: "https://stripe.com/jobs/1",
            active: true,
          },
        },
      },
      {
        ...base,
        id: "lead:domain_event:2",
        type: "hiring_volume",
        details: { open_roles: 12, role_clusters: [{ label: "Engineers", count: 6 }] },
      },
      {
        ...base,
        id: "lead:domain_event:3",
        type: "company_growth",
        details: { growth_percent: 25, window_months: 6, base_headcount: 80, current_headcount: 100 },
      },
      { ...base, id: "lead:domain_event:4", type: "new_executive", details: { title: "Chief Technology Officer" } },
      {
        ...base,
        id: "lead:email_event:5",
        type: "position_changed",
        details: { lead_id: 5, from: "Manager", to: "VP Sales" },
      },
    ]
    stubFetch({ ...body, data: events })

    const result = await call("List-Signals", { source: "leads", types: ["job_posted", "position_changed"] })
    const details = result.structuredContent.data.map((event: { details: unknown }) => event.details)

    expect(details).toEqual(events.map((event) => event.details))
  })

  it("names no tool that ChatGPT lacks, and completes after the events", async () => {
    const fetchMock = stubFetch(signalsBody())

    const result = await call("List-Signals", { source: "leads", types: ["technology_added"] })

    expect([...requestedUrl(fetchMock).searchParams]).toEqual([
      ["source", "leads"],
      ["types[]", "technology_added"],
    ])
    expect(result.structuredContent.data[0].next_call.mcp_tool).toBeNull()
    expect(result.structuredContent.data.map((event: { company: unknown }) => event.company)).toEqual([
      { domain: "stripe.com", name: "Stripe" },
      { domain: "acme.io", name: null },
    ])
    expect(result.structuredContent.nextAction.kind).toBe("complete")
    expect(JSON.stringify(result.structuredContent.nextAction)).not.toContain("Domain-Search")
  })

  it("says more events follow when the page has a next cursor", async () => {
    stubFetch({ ...signalsBody(), meta: { ...signalsBody().meta, next_cursor: "abc" } })

    const result = await call("List-Signals", { source: "leads" })

    expect(result.structuredContent.nextAction.summary).toContain("meta.next_cursor")
  })

  it("follows a cursor past an empty page with exactly the filters it was given", async () => {
    stubFetch({ ...signalsBody(), data: [], meta: { ...signalsBody().meta, next_cursor: "abc" } })

    const result = await call("List-Signals", { source: "monitored", signal_id: 3, since: "2026-11-01T00:00:00Z" })

    expect(result.structuredContent.nextAction).toMatchObject({
      kind: "call_tool",
      tool: "List-Signals",
      suggestedArgs: { source: "monitored", signal_id: 3, since: "2026-11-01T00:00:00Z", cursor: "abc" },
    })
  })

  it("says the skipped early-access types will not come back, instead of polling, when the page is empty", async () => {
    stubFetch({ ...signalsBody(), data: [], meta: { ...signalsBody().meta, types_skipped: ["hiring_spike"] } })

    const result = await call("List-Signals", { source: "leads", types: ["hiring_spike"] })

    expect(result.structuredContent.nextAction).toMatchObject({ kind: "complete" })
    expect(result.structuredContent.nextAction.summary).toContain("hiring_spike")
    expect(result.structuredContent.nextAction.summary).not.toContain("check again later")
  })

  it("gives a Codex user the full-server hint and a ChatGPT user none", async () => {
    stubFetch(signalsBody())
    const codex = await withClientUserAgent("codex-mcp-client/0.50.0", () => call("List-Signals", { source: "leads" }))
    stubFetch(signalsBody())
    const chatgpt = await withClientUserAgent("openai-mcp/1.0.0", () => call("List-Signals", { source: "leads" }))

    expect(codex.structuredContent.message).toBe(CODEX_FULL_SERVER_HINT)
    expect(chatgpt.structuredContent.message).toBeUndefined()
  })
})

describe("List-Monitored-Signals", () => {
  it("reads the active signals' events next", async () => {
    stubFetch(monitoredSignalsBody())

    const result = await call("List-Monitored-Signals")

    expect(result.structuredContent.nextAction).toMatchObject({
      kind: "call_tool",
      tool: "List-Signals",
      suggestedArgs: { source: "monitored" },
    })
  })
})

describe("List-Monitored-Signals when the team has none", () => {
  it("completes with the Signals page, with the ChatGPT link", async () => {
    stubFetch({ data: [], meta: { total: 0, limit: 20, offset: 0 } })

    const result = await call("List-Monitored-Signals")

    expect(result.structuredContent.nextAction.kind).toBe("complete")
    expect(result.structuredContent.nextAction.summary).toContain("https://hunter.io/signals?utm_source=hunter-chatgpt")
    expect(result.structuredContent.viewInHunter).toMatch(/^https:\/\/hunter\.io\/signals\?/)
  })
})

describe("published output schemas", () => {
  it.each([
    ["Get-Briefing", {}, briefingBody()],
    ["List-Opportunities", {}, opportunitiesBody()],
    ["Get-Opportunity-Results", { opportunity_id: 1 }, peopleResultsBody()],
    ["Get-Opportunity-Results", { opportunity_id: 1 }, companyResultsBody()],
    ["List-Signals", { source: "leads" }, signalsBody()],
    ["List-Monitored-Signals", {}, monitoredSignalsBody()],
  ])("%s validates its result", async (name, args, body) => {
    stubFetch(body)

    const result = await call(name, args)

    expect(result.isError).toBeFalsy()
    expect(() => publishedOutputSchema(name).parse(result.structuredContent)).not.toThrow()
  })
})
