import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Direct-import suite for Find-Similar-Companies (HUN-24491), registered by
// src/tools/company-lists.ts and backed by GET /v2/lookalikes.

type ToolHandler = (...args: any[]) => any

const registeredTools = new Map<
  string,
  {
    description: string
    inputSchema: Record<string, z.ZodTypeAny>
    outputSchema?: Record<string, unknown>
    annotations: Record<string, unknown>
    handler: ToolHandler
  }
>()

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    registerTool(
      name: string,
      config: {
        description: string
        inputSchema: Record<string, z.ZodTypeAny>
        outputSchema?: Record<string, unknown>
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
const { registerCompanyListTools } = await import("../src/tools/company-lists")

registerCompanyListTools(new (McpServer as never)(), "test-api-key", "https://api.hunter.io/v2")

const TOOL = "Find-Similar-Companies"
const tool = () => registeredTools.get(TOOL)!

const publishedOutputSchema = () => z.object(tool().outputSchema as Record<string, z.ZodTypeAny>).strict()
const inputSchema = () => z.object(tool().inputSchema).strict()

function okResponse(body: unknown, status = 200) {
  return { ok: true, status, text: () => Promise.resolve(JSON.stringify(body)) }
}

function railsErrorResponse(status: number, errors: Array<{ id: string; code: number; details: string }>) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify({ errors })),
  }
}

// Shape from app/app/views/api/lookalikes/index.json.jbuilder.
const lookalikesPayload = {
  data: [
    {
      domain: "adyen.com",
      company_name: "Adyen",
      country: "NL",
      industry: "Financial Services",
      size: "1001-5000",
      similarity_score: 85.2,
    },
    { domain: "unknown.example", company_name: null, country: null, industry: null, size: null, similarity_score: 41 },
  ],
  meta: {
    results: 2,
    limit: 20,
    params: { company_list_id: 7, country: null, industry: [], size: [] },
  },
}

const emptyPayload = {
  data: [],
  meta: { results: 0, limit: 20, params: { domain: "stripe.com", country: null, industry: [], size: [] } },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Find-Similar-Companies: registration", () => {
  it("is registered as a public-index read", () => {
    expect(tool()).toBeDefined()
    expect(tool().annotations).toEqual({ readOnlyHint: true, destructiveHint: false, openWorldHint: true })
  })

  it("description states the plan gate, list rules, empty-result causes, and save path", () => {
    const description = tool().description
    expect(description).toMatch(/^Use this when the user wants/)
    expect(description).toMatch(/Free to call\.$/)
    expect(description).toMatch(/free plan/i)
    expect(description).toMatch(/do not ask the user to reconnect/i)
    expect(description).toContain("feature_not_in_plan")
    expect(description).toMatch(/An unauthorized error/)
    expect(description).toMatch(/static company list/i)
    expect(description).toContain("unsupported_list_type")
    expect(description).toMatch(/ranking preference/i)
    expect(description).toContain("List-Company-Lists")
    expect(description).toContain("Save-Company")
    expect(description).toContain("Add-Company-To-List")
    expect(description).toContain("Bulk-Copy-Companies")
    expect(description).not.toMatch(/campaign/i)
    expect(description).not.toMatch(/upgrade/i)
    expect(description).not.toMatch(/(search|verification|enrichment) credits?/i)
  })
})

describe("Find-Similar-Companies: input schema", () => {
  it("accepts a list seed with every filter", () => {
    const parsed = inputSchema().safeParse({
      company_list_id: 7,
      country: "FR",
      industry: ["Software Development"],
      size: ["51-200", "10001+"],
      limit: 100,
    })
    expect(parsed.success).toBe(true)
  })

  it.each([
    ["a lowercase ISO country", { domain: "stripe.com", country: "gb" }],
    ["a punycode domain", { domain: "115.xn--90ais" }],
    ["a Unicode domain", { domain: "bücher.de" }],
    ["a URL, which Rails normalizes", { domain: "https://www.stripe.com/about" }],
    ["a URL longer than a hostname", { domain: `https://stripe.com/pricing?utm_source=${"x".repeat(300)}` }],
  ])("accepts %s", (_label, input) => {
    expect(inputSchema().safeParse(input).success).toBe(true)
  })

  it.each([
    ["a 3-letter country", { domain: "stripe.com", country: "USA" }],
    ["an unknown size bucket", { domain: "stripe.com", size: ["big"] }],
    ["limit 0", { domain: "stripe.com", limit: 0 }],
    ["limit 101", { domain: "stripe.com", limit: 101 }],
    ["a 2-letter code that is not ISO (UK)", { domain: "stripe.com", country: "UK" }],
    ["an unassigned country code", { domain: "stripe.com", country: "ZZ" }],
    ["an empty domain", { domain: "" }],
    ["a domain over 2048 characters", { domain: `https://stripe.com/${"x".repeat(2048)}` }],
    ["more size entries than buckets", { domain: "stripe.com", size: Array(9).fill("1-10") }],
    ["an offset", { domain: "stripe.com", offset: 20 }],
  ])("rejects %s", (_label, input) => {
    expect(inputSchema().safeParse(input).success).toBe(false)
  })
})

describe("Find-Similar-Companies: handler", () => {
  it("GETs /lookalikes with the list seed and returns a schema-valid result with an ask_user nextAction", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(lookalikesPayload))
    vi.stubGlobal("fetch", mockFetch)

    const result = await tool().handler({ company_list_id: 7 })

    const [url, opts] = mockFetch.mock.calls[0] as [string, { method: string; headers: Record<string, string> }]
    expect(url).toBe("https://api.hunter.io/v2/lookalikes?company_list_id=7")
    expect(opts.method).toBe("GET")
    expect(opts.headers.Authorization).toBe("Bearer test-api-key")
    expect(opts.headers["X-SOURCE"]).toBe("hunter-chatgpt")
    expect(result.isError).toBeFalsy()
    const parsed = publishedOutputSchema().parse(result.structuredContent)
    expect(parsed.data).toHaveLength(2)
    expect(parsed.data[1].company_name).toBeNull()
    expect(parsed.nextAction?.kind).toBe("ask_user")
  })

  it("sends a domain seed without company_list_id", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(emptyPayload))
    vi.stubGlobal("fetch", mockFetch)

    await tool().handler({ domain: "stripe.com" })

    expect(mockFetch.mock.calls[0][0]).toBe("https://api.hunter.io/v2/lookalikes?domain=stripe.com")
  })

  it("encodes array filters as bracket keys with a single query string", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(lookalikesPayload))
    vi.stubGlobal("fetch", mockFetch)

    await tool().handler({
      domain: "stripe.com",
      country: "FR",
      industry: ["Software Development"],
      size: ["51-200", "10001+"],
      limit: 50,
    })

    const url = mockFetch.mock.calls[0][0] as string
    expect(url.split("?")).toHaveLength(2)
    expect(url).toBe(
      "https://api.hunter.io/v2/lookalikes?domain=stripe.com&country=FR&industry%5B%5D=Software+Development&size%5B%5D=51-200&size%5B%5D=10001%2B&limit=50",
    )
  })

  it("sends each size bucket once", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(emptyPayload))
    vi.stubGlobal("fetch", mockFetch)

    await tool().handler({ domain: "stripe.com", size: ["1-10", "1-10", "11-50"] })

    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://api.hunter.io/v2/lookalikes?domain=stripe.com&size%5B%5D=1-10&size%5B%5D=11-50",
    )
  })

  it("uppercases a lowercase country code", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(emptyPayload))
    vi.stubGlobal("fetch", mockFetch)

    await tool().handler({ domain: "stripe.com", country: "fr" })

    expect(mockFetch.mock.calls[0][0]).toBe("https://api.hunter.io/v2/lookalikes?domain=stripe.com&country=FR")
  })

  it("returns an empty result without a nextAction", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(okResponse(emptyPayload)))

    const result = await tool().handler({ domain: "stripe.com" })

    expect(result.isError).toBeFalsy()
    const parsed = publishedOutputSchema().parse(result.structuredContent)
    expect(parsed.data).toEqual([])
    expect(parsed.nextAction).toBeUndefined()
  })

  it.each([
    ["both seeds", { company_list_id: 7, domain: "stripe.com" }],
    ["no seed", {}],
  ])("rejects %s locally without calling Hunter", async (_label, input) => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    const result = await tool().handler(input)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect(result.structuredContent.error.code).toBe("invalid_input")
    expect(() => publishedOutputSchema().parse(result.structuredContent)).not.toThrow()
  })

  it.each([
    [
      403,
      { id: "no_lookalikes_access", code: 403, details: "Lookalikes is not enabled on your plan." },
      "feature_not_in_plan",
      "no_lookalikes_access",
      false,
    ],
    [
      403,
      { id: "forbidden", code: 403, details: "You are not authorized to perform this action." },
      "unauthorized",
      undefined,
      false,
    ],
    [
      422,
      {
        id: "unsupported_list_type",
        code: 422,
        details: "Lookalikes require a static company list. Dynamic lists are not supported.",
      },
      "invalid_input",
      "unsupported_list_type",
      false,
    ],
    [404, { id: "not_found", code: 404, details: "The company list was not found." }, "not_found", undefined, false],
    [
      503,
      {
        id: "lookalikes_unavailable",
        code: 503,
        details: "The lookalikes service is temporarily unavailable. Please try again later.",
      },
      "upstream_error",
      undefined,
      true,
    ],
  ])("maps a Rails %i error", async (status, railsError, code, field, retryable) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(railsErrorResponse(status, [railsError])))

    const result = await tool().handler({ company_list_id: 7 })

    expect(result.isError).toBe(true)
    const error = result.structuredContent.error
    expect(error.code).toBe(code)
    expect(error.retryable).toBe(retryable)
    expect(error.field).toBe(field)
    expect(error.message).toContain(railsError.details)
    expect(result.structuredContent.nextAction).toBeUndefined()
    expect(() => publishedOutputSchema().parse(result.structuredContent)).not.toThrow()
  })
})
