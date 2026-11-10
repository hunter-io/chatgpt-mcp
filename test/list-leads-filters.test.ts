import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// HUN-25033: List-Leads takes the lead filters of GET /v2/leads as one strict
// object. Request shapes use the MockMcpServer recipe of
// test/leads-lists-dynamic.test.ts; unknown keys go through the real McpServer,
// because only the SDK's own validation proves they never reach the handler.

type ToolHandler = (...args: any[]) => any

const registeredTools = new Map<string, { description: string; inputSchema: unknown; handler: ToolHandler }>()

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    registerTool(name: string, config: { description: string; inputSchema: unknown }, handler: ToolHandler) {
      registeredTools.set(name, { description: config.description, inputSchema: config.inputSchema, handler })
    }

    registerResource() {}

    registerPrompt() {}
  },
}))

const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js")
const { McpServer: RealMcpServer } = await vi.importActual<typeof import("@modelcontextprotocol/sdk/server/mcp.js")>(
  "@modelcontextprotocol/sdk/server/mcp.js",
)
const { Client } = await import("@modelcontextprotocol/sdk/client/index.js")
const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js")
const { registerLeadTools } = await import("../src/tools/leads")
const { registerLeadsListTools } = await import("../src/tools/leads-lists")

const BASE_URL = "https://api.hunter.io/v2"

function okJson(body: unknown, status = 200) {
  return { ok: true, status, text: () => Promise.resolve(JSON.stringify(body)) }
}

function railsError(status: number, details: string) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify({ errors: [{ id: "wrong_params", code: status, details }] })),
  }
}

const lead = { id: 1, email: "ada@acme.com", first_name: "Ada", company: "Acme" }

function leadsPage(echoed: Record<string, unknown> = {}) {
  return okJson({ data: { leads: [lead] }, meta: { count: 1, total: 1, params: { limit: 20, offset: 0, ...echoed } } })
}

const customAttributes = (...slugs: string[]) =>
  okJson({
    data: { leads_custom_attributes: slugs.map((slug, i) => ({ id: i + 1, label: slug, slug })) },
    meta: { total: slugs.length },
  })

const tool = (name: string) => registeredTools.get(name)!
const listLeads = (args: Record<string, unknown>) => tool("List-Leads").handler(args)
const inputSchema = () => tool("List-Leads").inputSchema as z.ZodType
const accepts = (args: Record<string, unknown>) => inputSchema().safeParse(args).success

function stubFetch(response: unknown = leadsPage()) {
  const mockFetch = vi.fn().mockResolvedValue(response)
  vi.stubGlobal("fetch", mockFetch)
  return mockFetch
}

function sentUrl(mockFetch: ReturnType<typeof vi.fn>, call = 0): URL {
  return new URL(String(mockFetch.mock.calls[call][0]))
}

function sentQuery(mockFetch: ReturnType<typeof vi.fn>, call = 0): URLSearchParams {
  return sentUrl(mockFetch, call).searchParams
}

beforeEach(() => {
  registeredTools.clear()
  const server = new (McpServer as never)()
  registerLeadTools(server, "test-api-key", BASE_URL)
  registerLeadsListTools(server, "test-api-key", BASE_URL)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("List-Leads filters reach GET /v2/leads", () => {
  it("sends an array filter in the Rails array form", async () => {
    const mockFetch = stubFetch()

    const result = await listLeads({ sending_status: ["replied"] })

    expect(sentUrl(mockFetch).pathname).toBe("/v2/leads")
    expect(sentQuery(mockFetch).getAll("sending_status[]")).toEqual(["replied"])
    expect(result.isError).toBeUndefined()
  })

  it("sends a scalar filter as is", async () => {
    const mockFetch = stubFetch()

    await listLeads({ country_code: "FR" })

    expect(sentQuery(mockFetch).get("country_code")).toBe("FR")
  })

  it("sends verification_status as an array", async () => {
    const mockFetch = stubFetch()

    await listLeads({ verification_status: ["invalid"] })

    expect(sentQuery(mockFetch).getAll("verification_status[]")).toEqual(["invalid"])
  })

  it("sends a range as from and to", async () => {
    const mockFetch = stubFetch()

    await listLeads({ confidence_score: { from: 80, to: 100 } })

    expect(sentQuery(mockFetch).get("confidence_score[from]")).toBe("80")
    expect(sentQuery(mockFetch).get("confidence_score[to]")).toBe("100")
  })

  it("sends a date preset and a date range", async () => {
    const mockFetch = stubFetch()

    await listLeads({ created_at: "this_week", last_contacted_at: { from: "2026-11-01", to: "2026-11-08" } })

    const query = sentQuery(mockFetch)
    expect(query.get("created_at")).toBe("this_week")
    expect(query.get("last_contacted_at[from]")).toBe("2026-11-01")
    expect(query.get("last_contacted_at[to]")).toBe("2026-11-08")
  })

  it("sends a location in the nested form", async () => {
    const mockFetch = stubFetch()

    await listLeads({ location: { country: { exclude: ["US"] } } })

    expect(sentQuery(mockFetch).getAll("location[country][exclude][]")).toEqual(["US"])
  })

  it("sends the * and ~ tokens unchanged", async () => {
    const mockFetch = stubFetch()

    await listLeads({ sending_status: ["~"], sequence_ids: "*", confidence_score: "~" })

    const query = sentQuery(mockFetch)
    expect(query.getAll("sending_status[]")).toEqual(["~"])
    expect(query.get("sequence_ids")).toBe("*")
    expect(query.get("confidence_score")).toBe("~")
  })

  it("sends sort, and rejects an order Hunter does not know", async () => {
    const mockFetch = stubFetch()

    await listLeads({ sort: "relevance" })

    expect(sentQuery(mockFetch).get("sort")).toBe("relevance")
    const sortText = (inputSchema() as z.ZodObject).shape.sort.description ?? ""
    expect(sortText).toContain("position")
    expect(sortText).not.toContain("query")
    expect(accepts({ sort: "oldest" })).toBe(true)
    expect(accepts({ sort: "best" })).toBe(false)
  })

  it("sends the arguments it took before unchanged", async () => {
    const mockFetch = stubFetch()

    await listLeads({ leads_list_id: 5, company: "Acme", offset: 20, limit: 10 })

    expect(sentUrl(mockFetch).search).toBe("?offset=20&limit=10&leads_list_id=5&company=Acme")
  })

  it("still leaves out an empty or whitespace-only text filter", async () => {
    const mockFetch = stubFetch()

    await listLeads({ email: "", query: "   ", first_name: "Ada" })

    expect(sentUrl(mockFetch).search).toBe("?first_name=Ada")
  })

  it("sends a dynamic list id like a static one", async () => {
    const mockFetch = stubFetch()

    await listLeads({ leads_list_id: 42 })

    expect(sentQuery(mockFetch).get("leads_list_id")).toBe("42")
  })

  it("relays a Rails 400 as a readable error", async () => {
    const details = "location[country][include] accepts at most 100 values."
    stubFetch(railsError(400, details))

    const result = await listLeads({ location: { country: { include: ["FR"] } } })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe(details)
    expect(result.structuredContent.error).toMatchObject({ code: "validation", message: details })
  })
})

describe("List-Leads custom attributes", () => {
  it("checks the slug against the team's attributes, then sends it", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(customAttributes("plan"))
      .mockResolvedValueOnce(leadsPage({ custom_attributes: { plan: "Pro" } }))
    vi.stubGlobal("fetch", mockFetch)

    const result = await listLeads({ custom_attributes: { plan: "Pro" } })

    expect(sentUrl(mockFetch, 0).pathname).toBe("/v2/leads_custom_attributes")
    expect(sentUrl(mockFetch, 1).pathname).toBe("/v2/leads")
    expect(sentQuery(mockFetch, 1).get("custom_attributes[plan]")).toBe("Pro")
    expect(result.isError).toBeUndefined()
  })

  it("returns invalid_input naming an unknown slug, without searching", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(customAttributes("plan"))
    vi.stubGlobal("fetch", mockFetch)

    const result = await listLeads({ custom_attributes: { plan_tier: "Pro" } })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(sentUrl(mockFetch).pathname).toBe("/v2/leads_custom_attributes")
    expect(result.isError).toBe(true)
    expect(result.structuredContent.error).toMatchObject({ code: "invalid_input", field: "custom_attributes" })
    expect(result.structuredContent.error.message).toContain("plan_tier")
    expect(result.structuredContent.error.message).toContain("List-Custom-Attributes")
  })

  it("reads no attributes for a call without custom_attributes", async () => {
    const mockFetch = stubFetch()

    await listLeads({ sending_status: ["replied"] })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(sentUrl(mockFetch).pathname).toBe("/v2/leads")
  })
})

describe("List-Leads input", () => {
  it("is one strict object built on the shared lead filters", () => {
    expect(inputSchema()).toBeInstanceOf(z.ZodObject)
    expect(accepts({ sending_status: ["replied"], country_code: "FR", offset: 0, limit: 100 })).toBe(true)
    expect(accepts({ limit: 101 })).toBe(false)
    expect(accepts({ sending_status: ["answered"] })).toBe(false)
    expect(accepts({ country: "FR" })).toBe(false)
  })

  it("rejects location and id values Rails would drop", () => {
    expect(accepts({ location: { country: { include: ["FR"] }, city: { exclude: ["Paris, Lyon"] } } })).toBe(true)
    expect(accepts({ location: { country: { include: [""] } } })).toBe(false)
    expect(accepts({ location: { state: { exclude: [" "] } } })).toBe(false)
    expect(accepts({ location: { country: { exclude: ["gb"] }, state: { exclude: ["CA", "DE-BY"] } } })).toBe(true)
    expect(accepts({ location: { country: { exclude: ["UK"] } } })).toBe(false)
    expect(accepts({ location: { country: { include: ["France"] } } })).toBe(false)
    expect(accepts({ location: { state: { exclude: ["US-CA"] } } })).toBe(false)
    expect(accepts({ location: { state: { include: ["Bavaria"] } } })).toBe(false)
    expect(accepts({ location: { city: { include: [","] } } })).toBe(false)
    expect(accepts({ location: { city: { include: ["Paris,IDF,FR"] } } })).toBe(true)
    expect(accepts({ location: { city: { include: ["Paris,IDF,FR,"] } } })).toBe(true)
    expect(accepts({ location: { city: { include: ["Paris,IDF,FR,extra"] } } })).toBe(false)
    expect(accepts({ tags: [2_147_483_647] })).toBe(true)
    expect(accepts({ tags: [2_147_483_648] })).toBe(false)
    expect(accepts({ user_id: [2_147_483_648] })).toBe(false)
    expect(accepts({ sequence_ids: [2_147_483_648] })).toBe(false)
    expect(accepts({ leads_list_id: 2_147_483_648 })).toBe(false)
  })

  it("rejects text and ranges that would search without the filter", () => {
    expect(accepts({ query: "()" })).toBe(false)
    expect(accepts({ company: "[+]" })).toBe(false)
    expect(accepts({ email: "<>" })).toBe(false)
    expect(accepts({ source: "!|" })).toBe(false)
    expect(accepts({ website: "!" })).toBe(false)
    expect(accepts({ company_industry: "Retail|" })).toBe(false)
    expect(accepts({ twitter: "!~" })).toBe(false)
    expect(accepts({ custom_attributes: { tier: "!|" } })).toBe(false)
    expect(accepts({ source: "!import" })).toBe(true)
    expect(accepts({ source: "import|api" })).toBe(true)
    expect(accepts({ position: ["~", "CEO"] })).toBe(false)
    expect(accepts({ company: ["~", "Acme"] })).toBe(false)
    expect(accepts({ position: ["~"], company: ["~"] })).toBe(true)
    expect(accepts({ query: "C++" })).toBe(true)
    expect(accepts({ website: "*" })).toBe(true)
    // List-Leads leaves out blank text, as before.
    expect(accepts({ query: " " })).toBe(true)
    expect(accepts({ confidence_score: {} })).toBe(false)
    expect(accepts({ confidence_score: { from: 80 } })).toBe(true)
    expect(accepts({ location: { country: {} } })).toBe(false)
    expect(accepts({ location: { country: { include: [] } } })).toBe(false)
    expect(accepts({ location: { country: { include: [], exclude: ["FR"] } } })).toBe(false)
    expect(accepts({ location: {} })).toBe(false)
    expect(accepts({ custom_attributes: {} })).toBe(false)
    expect(accepts({ tags: [] })).toBe(false)
    expect(accepts({ position: [] })).toBe(false)
    expect(accepts({ company: [] })).toBe(false)
    expect(accepts({ country_code: ".*" })).toBe(false)
    expect(accepts({ country_code: "US|FR" })).toBe(false)
    expect(accepts({ country_code: "fr" })).toBe(true)
    expect(accepts({ country_code: "~" })).toBe(true)
    expect(accepts({ query: "*" })).toBe(false)
    expect(accepts({ query: "~" })).toBe(false)
    expect(accepts({ position_keywords: ["*"] })).toBe(false)
    expect(accepts({ location: { country: { exclude: ["FR"] } } })).toBe(true)
  })

  it("takes every department and status value Hunter stores", () => {
    for (const department of ["product", "research", "consulting", "administrative", "procurement"]) {
      expect(accepts({ department: [department] }), department).toBe(true)
    }
    expect(accepts({ verification_status: ["error"] })).toBe(true)
    expect(accepts({ sending_status: ["canceled"] })).toBe(true)
    expect(accepts({ department: ["~"], sync_status: "*" })).toBe(true)
    expect(accepts({ sync_status: "~" })).toBe(true)
  })

  it("rejects text longer than the 100 characters Hunter searches", () => {
    const long = "a".repeat(101)
    expect(accepts({ company: "a".repeat(100) })).toBe(true)
    expect(accepts({ company: long })).toBe(false)
    expect(accepts({ company: [long] })).toBe(false)
    expect(accepts({ source: `${"a".repeat(98)}()()` })).toBe(true)
    expect(accepts({ custom_attributes: { tier: long } })).toBe(false)
    // Lead::LeadSearch matches a job title whole, without the 100-character cut.
    expect(accepts({ position: [long] })).toBe(true)
    expect(accepts({ position_keywords: [long] })).toBe(false)
    // A query that is one email address is looked up whole.
    expect(accepts({ query: `${"a".repeat(60)}@${"b".repeat(50)}.example.com` })).toBe(true)
    // Rails looks up an address whole only when Email::EMAIL_REGEX matches it.
    expect(accepts({ query: `${"a".repeat(101)}@example.com` })).toBe(false)
    expect(accepts({ query: long })).toBe(false)
  })

  it("rejects text that the search would read as a match-all regexp", () => {
    expect(accepts({ website: ".*" })).toBe(false)
    expect(accepts({ linkedin_url: "." })).toBe(false)
    expect(accepts({ twitter: "@hunter" })).toBe(false)
    expect(accepts({ company: "AT&T" })).toBe(false)
    expect(accepts({ source: "!.*" })).toBe(false)
    expect(accepts({ custom_attributes: { tier: ".*" } })).toBe(false)
    expect(accepts({ first_name: "J.R.", website: "acme.com", phone_number: "+33 1 23 45 67 89" })).toBe(true)
    expect(accepts({ company: ["AT&T"], custom_attributes: { tier: "~" } })).toBe(true)
  })

  it("names the tool behind each id and slug, and tells how filters combine", () => {
    const description = tool("List-Leads").description
    for (const name of ["List-Lead-Tags", "List-Sequences", "List-Custom-Attributes", "List-Leads-Lists"])
      expect(description).toContain(name)
    expect(description).toMatch(/^Use this when the user wants/)
    const firstSentence = description.split(". ")[0]
    for (const noun of ["replied", "invalid email", "country", "saved date", "tags", "sequence", "job title"])
      expect(firstSentence).toContain(noun)
    expect(description).toContain("`meta.count`")
    expect(description).toContain("`*`")
    expect(description).toContain("`~`")
    expect(description).toContain("every filter")
    expect(description).toContain("Do not create a dynamic list")
  })

  it("takes a static or a dynamic list in leads_list_id", () => {
    const field = (inputSchema() as z.ZodObject).shape.leads_list_id as z.ZodType
    expect(field.description).toContain("static or dynamic")
    expect(field.description).toContain("List-Leads-Lists")
  })

  it("Create-Leads-List sends a model that only reads leads to List-Leads", () => {
    const description = tool("Create-Leads-List").description
    expect(description).toContain("To read leads, use List-Leads")
    expect(description).toContain("asks for a list that updates itself")
  })
})

describe("List-Leads through the real McpServer", () => {
  async function connectClient() {
    const server = new RealMcpServer({ name: "list-leads-filters-test", version: "1.0.0" })
    registerLeadTools(server, "test-api-key", BASE_URL)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: "list-leads-filters-test", version: "1.0.0" })
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
    return client
  }

  it.each([[{ country: "FR" }], [{ filters: { country_code: "FR" } }]])(
    "rejects the unknown argument %j before calling Hunter",
    async (args) => {
      const mockFetch = stubFetch()
      const client = await connectClient()

      const result = await client.callTool({ name: "List-Leads", arguments: args })

      expect(result.isError).toBe(true)
      expect((result.content as { text: string }[])[0].text).toContain("Unrecognized key")
      expect(mockFetch).not.toHaveBeenCalled()
    },
  )

  it("runs a valid call and publishes a closed input schema", async () => {
    const mockFetch = stubFetch(leadsPage({ sending_status: ["replied"] }))
    const client = await connectClient()

    const result = await client.callTool({ name: "List-Leads", arguments: { sending_status: ["replied"] } })

    expect(result.isError).toBeFalsy()
    expect(sentQuery(mockFetch).getAll("sending_status[]")).toEqual(["replied"])

    const { tools } = await client.listTools()
    const listLeadsTool = tools.find((t) => t.name === "List-Leads")!
    expect(listLeadsTool.inputSchema.additionalProperties).toBe(false)
    expect(Object.keys(listLeadsTool.inputSchema.properties ?? {})).toEqual(
      expect.arrayContaining(["sending_status", "location", "custom_attributes", "sort", "offset", "limit"]),
    )
  })
})

// Email::Seniority::LEVELS and Lead::EMAIL_TYPES, with the * and ~ tokens.
const SENIORITY_LEVELS = ["owner", "partner", "cxo", "vp", "director", "manager", "senior", "entry", "training"]
const EMAIL_TYPES = ["generic", "personal"]

describe("List-Leads Leads-page filters", () => {
  it("sends decision_maker=true, and accepts only true", async () => {
    const mockFetch = stubFetch(leadsPage({ decision_maker: "true" }))

    const result = await listLeads({ decision_maker: true })

    expect(sentQuery(mockFetch).get("decision_maker")).toBe("true")
    expect(result.isError).toBeUndefined()
    expect(accepts({ decision_maker: true })).toBe(true)
    expect(accepts({ decision_maker: false })).toBe(false)
    expect(accepts({ decision_maker: "true" })).toBe(false)
  })

  it("sends seniority_level in the array form, and only Hunter's levels", async () => {
    const mockFetch = stubFetch(leadsPage({ seniority_level: ["vp"] }))

    await listLeads({ seniority_level: ["vp"] })

    expect(sentQuery(mockFetch).getAll("seniority_level[]")).toEqual(["vp"])
    for (const level of [...SENIORITY_LEVELS, "*", "~"]) expect(accepts({ seniority_level: [level] }), level).toBe(true)
    expect(accepts({ seniority_level: ["executive"] })).toBe(false)
    expect(accepts({ seniority_level: "vp" })).toBe(false)
  })

  it("sends email_type in the array form, and only Hunter's types", async () => {
    const mockFetch = stubFetch(leadsPage({ email_type: ["personal"] }))

    await listLeads({ email_type: ["personal"] })

    expect(sentQuery(mockFetch).getAll("email_type[]")).toEqual(["personal"])
    for (const type of [...EMAIL_TYPES, "*", "~"]) expect(accepts({ email_type: [type] }), type).toBe(true)
    expect(accepts({ email_type: ["work"] })).toBe(false)
  })

  it("sends position_keywords, one keyword per value", async () => {
    const mockFetch = stubFetch(leadsPage({ position_keywords: ["sales", "growth"] }))

    await listLeads({ position_keywords: ["sales", "growth"] })

    expect(sentQuery(mockFetch).getAll("position_keywords[]")).toEqual(["sales", "growth"])
    expect(accepts({ position_keywords: ["sales|growth"] })).toBe(false)
    expect(accepts({ position_keywords: [" "] })).toBe(false)
    expect(accepts({ position_keywords: Array.from({ length: 100 }, (_, i) => `k${i}`) })).toBe(true)
    expect(accepts({ position_keywords: Array.from({ length: 101 }, (_, i) => `k${i}`) })).toBe(false)
  })

  it("sends company as an array, and as text like before", async () => {
    const mockFetch = stubFetch(leadsPage({ company: ["Acme", "Globex"] }))

    await listLeads({ company: ["Acme", "Globex"] })
    await listLeads({ company: "Acme" })

    expect(sentUrl(mockFetch, 0).search).toBe("?company%5B%5D=Acme&company%5B%5D=Globex")
    expect(sentUrl(mockFetch, 1).search).toBe("?company=Acme")
    expect(accepts({ company: ["Acme", "Globex"] })).toBe(true)
    expect(accepts({ company: "Acme" })).toBe(true)
  })

  it("rejects the | and leading ! operators in a company array", () => {
    expect(accepts({ company: ["Yahoo!", "AT&T"] })).toBe(true)
    expect(accepts({ company: ["!Acme"] })).toBe(false)
    expect(accepts({ company: [" !Acme"] })).toBe(false)
    expect(accepts({ company: ["A|B"] })).toBe(false)
    expect(accepts({ company: [""] })).toBe(false)
    // The text form keeps what it accepted before.
    expect(accepts({ company: "A|B" })).toBe(true)
  })

  it("sends people_per_company, a cap from 1 to 100", async () => {
    const mockFetch = stubFetch(leadsPage({ people_per_company: "1" }))

    const result = await listLeads({ people_per_company: 1 })

    expect(sentQuery(mockFetch).get("people_per_company")).toBe("1")
    expect(result.isError).toBeUndefined()
    expect(accepts({ people_per_company: 100 })).toBe(true)
    for (const value of [0, 101, 2.5, "2"]) expect(accepts({ people_per_company: value }), String(value)).toBe(false)
  })

  it("keeps people_per_company out of Create-Leads-List", () => {
    const createInput = tool("Create-Leads-List").inputSchema as Record<string, z.ZodType>
    const parse = (filters: Record<string, unknown>) =>
      z.object(createInput).safeParse({ name: "VPs", type: "dynamic", filters }).success

    expect(parse({ seniority_level: ["vp"], decision_maker: true })).toBe(true)
    expect(parse({ people_per_company: 2 })).toBe(false)
  })

  it("tells position_keywords from position, and says the people_per_company cap covers the whole result", () => {
    const shape = (inputSchema() as z.ZodObject).shape as Record<string, z.ZodType>

    expect(shape.position_keywords.description).toContain("position")
    expect(shape.position_keywords.description).toContain("synonyms")
    expect(shape.people_per_company.description).toContain("each company")
    expect(shape.people_per_company.description).toContain("whole result")
    expect(shape.people_per_company.description).toContain("offset")
    expect(shape.people_per_company.description).not.toContain("instead of paging")
  })
})

describe("List-Leads applied-filter check", () => {
  it("returns an error naming a filter Hunter did not apply, without the leads", async () => {
    stubFetch(leadsPage({ sending_status: ["replied"] }))

    const result = await listLeads({ decision_maker: true, sending_status: ["replied"] })

    expect(result.isError).toBe(true)
    expect(result.structuredContent).not.toHaveProperty("data")
    expect(result.structuredContent.error).toMatchObject({
      code: "upstream_error",
      retryable: true,
      field: "decision_maker",
    })
    expect(result.structuredContent.error.message).toContain("Hunter did not apply the filter decision_maker")
    expect(result.structuredContent.error.message).toContain("Tell the user")
    expect(result.structuredContent.error.message).not.toContain("again without")
    expect(result.content[0].text).not.toContain("ada@acme.com")
  })

  it("names every filter Hunter did not apply", async () => {
    stubFetch(leadsPage({ email_type: ["personal"] }))

    const result = await listLeads({
      seniority_level: ["vp"],
      email_type: ["personal"],
      position_keywords: ["sales"],
      company: ["Acme"],
      people_per_company: 2,
    })

    expect(result.isError).toBe(true)
    const { message } = result.structuredContent.error
    for (const key of ["seniority_level", "position_keywords", "company", "people_per_company"])
      expect(message).toContain(key)
    expect(message).not.toContain("email_type")
  })

  it("returns the leads when Hunter echoes every filter it was sent", async () => {
    stubFetch(
      leadsPage({
        decision_maker: "true",
        seniority_level: ["vp"],
        email_type: ["personal"],
        position_keywords: ["sales"],
        company: ["Acme"],
        people_per_company: "2",
      }),
    )

    const result = await listLeads({
      decision_maker: true,
      seniority_level: ["vp"],
      email_type: ["personal"],
      position_keywords: ["sales"],
      company: ["Acme"],
      people_per_company: 2,
    })

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent.data.leads).toEqual([lead])
  })

  it("never checks a call with only the filters Hunter read before", async () => {
    stubFetch(leadsPage())

    const result = await listLeads({ sending_status: ["replied"], company: "Acme", position: ["CTO"] })

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent.data.leads).toEqual([lead])
  })

  it("does not check an empty array, which sends nothing", async () => {
    const mockFetch = stubFetch(leadsPage())

    const result = await listLeads({ seniority_level: [] })

    expect(sentQuery(mockFetch).has("seniority_level[]")).toBe(false)
    expect(result.isError).toBeUndefined()
  })

  it("relays a Hunter error as it is", async () => {
    stubFetch(railsError(400, "seniority_level accepts only these values: owner."))

    const result = await listLeads({ seniority_level: ["vp"] })

    expect(result.structuredContent.error).toMatchObject({
      code: "validation",
      message: "seniority_level accepts only these values: owner.",
    })
  })
})
