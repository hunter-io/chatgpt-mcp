import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// HUN-24762: Create-Leads-List and Update-Leads-List save a dynamic list's
// filters as the nested `filters[...]` form params of GET /v2/leads. Same
// MockMcpServer recipe as test/lead-organization.test.ts.

type ToolHandler = (...args: any[]) => any

const registeredTools = new Map<
  string,
  { inputSchema: Record<string, z.ZodType>; outputSchema?: Record<string, z.ZodTypeAny>; handler: ToolHandler }
>()

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    registerTool(
      name: string,
      config: { inputSchema: Record<string, z.ZodType>; outputSchema?: Record<string, z.ZodTypeAny> },
      handler: ToolHandler,
    ) {
      registeredTools.set(name, { inputSchema: config.inputSchema, outputSchema: config.outputSchema, handler })
    }

    registerResource() {}

    registerPrompt() {}
  },
}))

const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js")
const { registerLeadsListTools } = await import("../src/tools/leads-lists")
const { TOOL_NAMES } = await import("../src/helpers")
const { COMPANY_TYPES, leadFiltersSchema } = await import("../src/schemas/lead-filters")

// The SDK re-wraps `<schema>.shape` in a fresh z.object, so the published
// envelope rejects unknown keys (see test/tools.test.ts).
const publishedOutputSchema = (shape: Record<string, z.ZodTypeAny>) => z.object(shape).strict()

function okJson(body: unknown, status = 200) {
  return { ok: true, status, text: () => Promise.resolve(JSON.stringify(body)) }
}

function noContent() {
  return { ok: true, status: 204, text: () => Promise.resolve("") }
}

function railsError(status: number, details: string) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify({ errors: [{ id: "wrong_params", code: status, details }] })),
  }
}

const dynamicList = { id: 42, name: "CEOs", leads_count: 17, type: "dynamic", created_at: "2026-10-29 12:00:00 UTC" }

beforeEach(() => {
  registeredTools.clear()
  registerLeadsListTools(new (McpServer as never)(), "test-api-key", "https://api.hunter.io/v2")
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("dynamic leads lists", () => {
  it("Create-Leads-List POSTs the type and the filters as nested form params", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: dynamicList }, 201))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Create-Leads-List")!.handler({
      name: "CEOs",
      type: "dynamic",
      filters: {
        leads_list_id: 12,
        position: ["CEO", "Founder"],
        location: { country: { include: ["FR"] } },
        confidence_score: { from: 80 },
        created_at: "last30d",
        custom_attributes: { coffee: "*" },
      },
    })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads-lists")
    expect(opts.method).toBe("POST")
    const body = new URLSearchParams(opts.body)
    expect(body.get("name")).toBe("CEOs")
    expect(body.get("type")).toBe("dynamic")
    expect(body.get("filters[leads_list_id]")).toBe("12")
    expect(body.getAll("filters[position][]")).toEqual(["CEO", "Founder"])
    expect(body.getAll("filters[location][country][include][]")).toEqual(["FR"])
    expect(body.get("filters[confidence_score][from]")).toBe("80")
    expect(body.get("filters[created_at]")).toBe("last30d")
    expect(body.get("filters[custom_attributes][coffee]")).toBe("*")

    expect(result.isError).toBeUndefined()
    const schema = publishedOutputSchema(registeredTools.get("Create-Leads-List")!.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
    expect((result.structuredContent as { data: { type: string } }).data.type).toBe("dynamic")
  })

  it("Create-Leads-List still sends only the name for a static list", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: { ...dynamicList, type: "static" } }, 201))
    vi.stubGlobal("fetch", mockFetch)

    await registeredTools.get("Create-Leads-List")!.handler({ name: "Prospects" })

    expect([...new URLSearchParams(mockFetch.mock.calls[0][1].body).keys()]).toEqual(["name"])
  })

  it("rejects filters that GET /v2/leads does not read before calling the API", () => {
    const input = z.object(registeredTools.get("Create-Leads-List")!.inputSchema)

    expect(input.safeParse({ name: "CEOs", type: "dynamic", filters: { position: ["CEO"] } }).success).toBe(true)
    expect(input.safeParse({ name: "CEOs", type: "dynamic", filters: { people_per_company: 2 } }).success).toBe(false)
    // The Leads page can't read company_size back, so a list saved with it would show every lead.
    expect(input.safeParse({ name: "CEOs", type: "dynamic", filters: { company_size: "11-50" } }).success).toBe(false)
    expect(input.safeParse({ name: "CEOs", type: "dynamic", filters: { created_at: "yesterday" } }).success).toBe(false)
    expect(input.safeParse({ name: "CEOs", type: "segment" }).success).toBe(false)
    // The API keeps ~ next to IDs: in one of these sequences, or in none.
    expect(input.safeParse({ name: "CEOs", type: "dynamic", filters: { sequence_ids: ["~", 123] } }).success).toBe(true)
  })

  it("accepts the * and ~ status sentinels that the API reads", async () => {
    const input = z.object(registeredTools.get("Create-Leads-List")!.inputSchema)
    const filters = { verification_status: ["~", "valid"], sending_status: ["*"] }

    expect(input.safeParse({ name: "Unverified", type: "dynamic", filters }).success).toBe(true)
    expect(input.safeParse({ name: "CEOs", type: "dynamic", filters: { sending_status: ["any"] } }).success).toBe(false)

    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: dynamicList }, 201))
    vi.stubGlobal("fetch", mockFetch)
    await registeredTools.get("Create-Leads-List")!.handler({ name: "Unverified", type: "dynamic", filters })

    const body = new URLSearchParams(mockFetch.mock.calls[0][1].body)
    expect(body.getAll("filters[verification_status][]")).toEqual(["~", "valid"])
    expect(body.getAll("filters[sending_status][]")).toEqual(["*"])
  })

  it("surfaces the API's 422 as invalid_input", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(railsError(422, "A dynamic list needs at least one filter")))

    const result = await registeredTools.get("Create-Leads-List")!.handler({ name: "CEOs", type: "dynamic" })

    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("invalid_input")
  })

  it("Update-Leads-List rejects a call with nothing to update without calling the API", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Update-Leads-List")!.handler({ id: 42 })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("invalid_input")
  })

  it("Update-Leads-List PUTs the new filters without a rename", async () => {
    const mockFetch = vi.fn().mockResolvedValue(noContent())
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools
      .get("Update-Leads-List")!
      .handler({ id: 42, filters: { verification_status: ["valid"], phone_number: "*" } })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads-lists/42")
    expect(opts.method).toBe("PUT")
    const body = new URLSearchParams(opts.body)
    expect(body.has("name")).toBe(false)
    expect(body.getAll("filters[verification_status][]")).toEqual(["valid"])
    expect(body.get("filters[phone_number]")).toBe("*")
    expect(result.isError).toBeUndefined()
  })
})

const accepts = (filters: Record<string, unknown>) =>
  z.object(registeredTools.get("Create-Leads-List")!.inputSchema).safeParse({ name: "Leads", type: "dynamic", filters })
    .success

function arrayNodes(node: unknown, path = "filters"): [string, Record<string, unknown>][] {
  if (node === null || typeof node !== "object") return []
  const found: [string, Record<string, unknown>][] = []
  if ((node as { type?: unknown }).type === "array") found.push([path, node as Record<string, unknown>])
  for (const [key, child] of Object.entries(node)) found.push(...arrayNodes(child, `${path}.${key}`))
  return found
}

// HUN-25033: the shared filter schema states each vocabulary and rejects the
// values Rails would drop or misread, so a list never matches more leads than asked.
describe("lead filter values", () => {
  it("accepts only the business regions and continents Rails knows", () => {
    expect(accepts({ location: { business_region: { include: ["EMEA"], exclude: ["APAC"] } } })).toBe(true)
    expect(accepts({ location: { business_region: { include: ["MARS"] } } })).toBe(false)
    expect(accepts({ location: { business_region: { exclude: ["emea"] } } })).toBe(false)
    expect(accepts({ location: { continent: { include: ["North America"], exclude: ["Oceania"] } } })).toBe(true)
    expect(accepts({ location: { continent: { include: ["Mars"] } } })).toBe(false)
  })

  it("accepts the company types Lead accepts, * and ~, and nothing else", () => {
    expect(accepts({ company_type: "privately held" })).toBe(true)
    for (const company_type of [...COMPANY_TYPES, "*", "~"]) expect(accepts({ company_type })).toBe(true)
    // Rails drops a blank value, which would widen the list to every lead.
    for (const company_type of ["private", "public", ""]) expect(accepts({ company_type })).toBe(false)
  })

  it.each<[string, (n: number) => Record<string, unknown>]>([
    ["position", (n) => ({ position: Array.from({ length: n }, (_, i) => `Title ${i}`) })],
    ["department", (n) => ({ department: Array(n).fill("it") })],
    ["verification_status", (n) => ({ verification_status: Array(n).fill("valid") })],
    ["sending_status", (n) => ({ sending_status: Array(n).fill("sent") })],
    ["tags", (n) => ({ tags: Array.from({ length: n }, (_, i) => i + 1) })],
    ["sequence_ids", (n) => ({ sequence_ids: Array.from({ length: n }, (_, i) => i + 1) })],
    ["user_id", (n) => ({ user_id: Array.from({ length: n }, (_, i) => i + 1) })],
    ["location.country.include", (n) => ({ location: { country: { include: Array(n).fill("FR") } } })],
    ["location.city.exclude", (n) => ({ location: { city: { exclude: Array(n).fill("Paris") } } })],
    ["seniority_level", (n) => ({ seniority_level: Array(n).fill("vp") })],
    ["email_type", (n) => ({ email_type: Array(n).fill("generic") })],
    ["position_keywords", (n) => ({ position_keywords: Array.from({ length: n }, (_, i) => `Keyword ${i}`) })],
    ["company", (n) => ({ company: Array.from({ length: n }, (_, i) => `Company ${i}`) })],
  ])("caps %s at 100 values", (_field, filters) => {
    expect(accepts(filters(100))).toBe(true)
    expect(accepts(filters(101))).toBe(false)
  })

  it("rejects a date that is not on the calendar", () => {
    // Rails drops an invalid range and returns every lead.
    expect(accepts({ created_at: { from: "2026-11-01", to: "2026-11-30" } })).toBe(true)
    expect(accepts({ created_at: { from: "2026-11-01", to: "2026-11-31" } })).toBe(false)
    expect(accepts({ updated_at: { from: "2026-02-29", to: "2026-03-01" } })).toBe(false)
    expect(accepts({ updated_at: { from: "2028-02-29", to: "2028-03-01" } })).toBe(true)
    expect(accepts({ last_contacted_at: { from: "2026-13-01", to: "2026-12-01" } })).toBe(false)
  })

  it("rejects a blank custom attribute value", () => {
    expect(accepts({ custom_attributes: { plan: "pro" } })).toBe(true)
    expect(accepts({ custom_attributes: { plan: "" } })).toBe(false)
    expect(accepts({ custom_attributes: { plan: "()" } })).toBe(false)
    expect(accepts({ custom_attributes: { plan: " + " } })).toBe(false)
    expect(accepts({ custom_attributes: { plan: "C++" } })).toBe(true)
    expect(accepts({ custom_attributes: { plan: "*" } })).toBe(true)
    expect(accepts({ custom_attributes: { plan: "  " } })).toBe(false)
  })

  it("rejects the | and leading ! operators in a job title", () => {
    expect(accepts({ position: ["CTO", "VP Sales", "Yahoo!"] })).toBe(true)
    expect(accepts({ position: ["cto|vp"] })).toBe(false)
    expect(accepts({ position: ["!cto"] })).toBe(false)
    // Rails reads a blank title as no filter at all.
    expect(accepts({ position: [" "] })).toBe(false)

    const result = leadFiltersSchema.safeParse({ position: ["cto|vp"] })
    expect(result.error?.issues[0]?.message).toContain("one job title per value")
  })

  it("tightens Update-Leads-List the same way", () => {
    const input = z.object(registeredTools.get("Update-Leads-List")!.inputSchema)

    expect(input.safeParse({ id: 42, filters: { company_type: "privately held" } }).success).toBe(true)
    expect(input.safeParse({ id: 42, filters: { company_type: "private" } }).success).toBe(false)
    expect(input.safeParse({ id: 42, filters: { position: ["!cto"] } }).success).toBe(false)
  })

  it("sends the Leads-page filters as nested form params", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: dynamicList }, 201))
    vi.stubGlobal("fetch", mockFetch)
    const filters = {
      seniority_level: ["vp"],
      email_type: ["personal"],
      decision_maker: true,
      position_keywords: ["sales"],
      company: ["Acme", "Globex"],
    }
    expect(accepts(filters)).toBe(true)

    await registeredTools.get("Create-Leads-List")!.handler({ name: "VPs", type: "dynamic", filters })

    const body = new URLSearchParams(mockFetch.mock.calls[0][1].body)
    expect(body.getAll("filters[seniority_level][]")).toEqual(["vp"])
    expect(body.getAll("filters[email_type][]")).toEqual(["personal"])
    expect(body.get("filters[decision_maker]")).toBe("true")
    expect(body.getAll("filters[position_keywords][]")).toEqual(["sales"])
    expect(body.getAll("filters[company][]")).toEqual(["Acme", "Globex"])
  })

  it("sends the tightened values as nested form params", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: dynamicList }, 201))
    vi.stubGlobal("fetch", mockFetch)
    const filters = {
      company_type: "~",
      location: { business_region: { include: ["EMEA"] }, continent: { exclude: ["Africa"] } },
      created_at: { from: "2026-11-01", to: "2026-11-30" },
    }
    expect(accepts(filters)).toBe(true)

    await registeredTools.get("Create-Leads-List")!.handler({ name: "EMEA", type: "dynamic", filters })

    const body = new URLSearchParams(mockFetch.mock.calls[0][1].body)
    expect(body.get("filters[company_type]")).toBe("~")
    expect(body.getAll("filters[location][business_region][include][]")).toEqual(["EMEA"])
    expect(body.getAll("filters[location][continent][exclude][]")).toEqual(["Africa"])
    expect(body.get("filters[created_at][from]")).toBe("2026-11-01")
    expect(body.get("filters[created_at][to]")).toBe("2026-11-30")
  })
})

describe("lead filter schema as the model reads it", () => {
  const json = z.toJSONSchema(leadFiltersSchema) as { properties: Record<string, any> }
  const shape = leadFiltersSchema.shape

  it("caps every array at 100 values", () => {
    const arrays = arrayNodes(json)
    expect(arrays.length).toBeGreaterThan(10)
    for (const [path, node] of arrays) expect(node.maxItems, path).toBe(100)
  })

  it("lists each vocabulary as an enum", () => {
    const location = json.properties.location.properties
    expect(location.business_region.properties.include.items.enum).toEqual(["AMER", "EMEA", "APAC", "LATAM"])
    // HunterAi::LeadFilterSchema::CONTINENTS.
    expect(location.continent.properties.exclude.items.enum).toEqual([
      "Africa",
      "Antarctica",
      "Asia",
      "Australia",
      "Oceania",
      "Europe",
      "North America",
      "South America",
    ])
    expect(json.properties.company_type.enum).toEqual([...COMPANY_TYPES, "*", "~"])
    // Email::Seniority::LEVELS and Lead::EMAIL_TYPES.
    expect(json.properties.seniority_level.items.enum).toEqual([
      "owner",
      "partner",
      "cxo",
      "vp",
      "director",
      "manager",
      "senior",
      "entry",
      "training",
      "*",
      "~",
    ])
    expect(json.properties.email_type.items.enum).toEqual(["generic", "personal", "*", "~"])
  })

  it("tells the company's country from where the person is", () => {
    expect(shape.country_code.description).toContain("company's")
    expect(shape.location.description).toContain("person")
  })

  it("names the tool that gives each ID or slug", () => {
    expect(shape.tags.description).toContain(TOOL_NAMES.listLeadTags)
    expect(shape.sequence_ids.description).toContain(TOOL_NAMES.listSequences)
    expect(shape.custom_attributes.description).toContain(TOOL_NAMES.listCustomAttributes)
    expect(shape.user_id.description).toContain("created_by")
  })

  it("drops the repeated prefix and the strict-search promise", () => {
    for (const [key, field] of Object.entries(shape))
      expect(field.description ?? "", key).not.toMatch(/^Filter leads by/)
    expect(shape.query.description).not.toContain("Every word must match")
  })
})
