import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Direct-import test suite for src/tools/discover.ts (HUN-20855 / HUN-20856).
// Mirrors the MockMcpServer recipe from test/tools.test.ts but registers the
// discover tools directly — no src/index import, no network, no real server.

type ToolHandler = (...args: any[]) => any

const registeredTools = new Map<
  string,
  {
    description: string
    inputSchema: Record<string, unknown>
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
        inputSchema: Record<string, unknown>
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
const { registerDiscoverTools } = await import("../src/tools/discover")

registerDiscoverTools(new (McpServer as never)(), "test-api-key", "https://api.hunter.io/v2")

// Reconstruct a tool's PUBLISHED output schema EXACTLY as the MCP SDK does:
// `registerTool` receives `<schema>.shape` and re-wraps it in a fresh
// `z.object(...)`, dropping the envelope-level `.loose()`, so the published
// JSON Schema is `additionalProperties: false`. `.strict()` models that.
const publishedOutputSchema = (name: string) =>
  z.object(registeredTools.get(name)!.outputSchema as Record<string, z.ZodTypeAny>).strict()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function okResponse(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

function emptyResponse(status: number) {
  return { ok: true, status, text: () => Promise.resolve("") }
}

function railsErrorResponse(status: number, errors: Array<{ id: string; code: number; details: string }>) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify({ errors })),
  }
}

// Realistic Find-People payload derived from
// app/app/views/api/discover/people/index.json.jbuilder.
const findPeoplePayload = {
  data: [
    { domain: "stripe.com", organization: "Stripe", emails_count: { personal: 120, generic: 8, total: 128 } },
    { domain: "adyen.com", organization: null, emails_count: { personal: 45, generic: 3, total: 48 } },
  ],
  meta: {
    results: 2,
    total_emails: { personal: 165, generic: 11, total: 176 },
    limit: 100,
    offset: 0,
    params: { query: "payment companies in Europe" },
    filters: { keywords: { include: ["payments"] } },
  },
}

// Realistic saved-search rows derived from
// app/app/views/api/discover/views/_view.jbuilder.
const savedSearchRow = {
  id: 12,
  name: "FR fintechs",
  filters: { company_size: ["11-50"], location_country_included: ["FR"], keywords_operator: "and" },
  created_at: "2026-06-01T09:30:00.000Z",
  updated_at: "2026-06-02T10:00:00.000Z",
}

const listSavedSearchesPayload = {
  data: { views: [savedSearchRow] },
  meta: { total: 4, params: { limit: 25, offset: 0 } },
}

const errorEnvelope = { error: { code: "invalid_input" as const, retryable: false, message: "boom" } }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("discover tools: registration", () => {
  it("registers all five tools with non-empty descriptions", () => {
    for (const name of [
      "Find-People",
      "List-Saved-Searches",
      "Get-Saved-Search",
      "Create-Saved-Search",
      "Delete-Saved-Search",
    ]) {
      const tool = registeredTools.get(name)
      expect(tool, name).toBeDefined()
      expect(tool!.description.length, name).toBeGreaterThan(0)
      expect(tool!.description, name).toMatch(/Free to call\.$/)
    }
  })

  it("Find-People description bridges Find-Companies to Domain-Search and explains the aggregations", () => {
    const description = registeredTools.get("Find-People")!.description
    expect(description).toContain("Find-Companies")
    expect(description).toContain("Domain-Search")
    expect(description).toContain("emails_count.personal")
    expect(description).toContain("emails_count.generic")
    expect(description).toContain("meta.total_emails")
    expect(description).toMatch(/credits/)
  })

  it("List-Saved-Searches offers to rerun a previous search", () => {
    expect(registeredTools.get("List-Saved-Searches")!.description).toMatch(/rerun/)
  })

  it("Delete-Saved-Search explains delete-and-recreate (no update endpoint)", () => {
    const description = registeredTools.get("Delete-Saved-Search")!.description
    expect(description).toMatch(/recreate/)
    expect(description).toContain("Create-Saved-Search")
  })

  it("no discover tool mentions the forbidden legacy term", () => {
    for (const [name, tool] of registeredTools) {
      expect(tool.description, name).not.toMatch(/campaign/i)
    }
  })
})

describe("discover tools: annotations", () => {
  it("Find-People is a public-index read (open world)", () => {
    expect(registeredTools.get("Find-People")!.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    })
  })

  it("List-Saved-Searches and Get-Saved-Search are private reads", () => {
    for (const name of ["List-Saved-Searches", "Get-Saved-Search"]) {
      expect(registeredTools.get(name)!.annotations, name).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      })
    }
  })

  it("Create-Saved-Search is a private create-only write", () => {
    expect(registeredTools.get("Create-Saved-Search")!.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    })
  })

  it("Delete-Saved-Search is a private destructive write", () => {
    expect(registeredTools.get("Delete-Saved-Search")!.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    })
  })
})

describe("Find-People handler", () => {
  it("POSTs the natural-language query (and paging) as URL parameters, like Find-Companies", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(findPeoplePayload))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Find-People")!.handler({
      query: "payment companies in Europe",
      limit: 10,
      offset: 20,
    })

    expect(result.isError).toBeUndefined()
    const [url, opts] = mockFetch.mock.calls[0] as [string, { method: string; body?: string }]
    expect(url).toBe("https://api.hunter.io/v2/discover/people?query=payment+companies+in+Europe&limit=10&offset=20")
    expect(opts.method).toBe("POST")
    expect(opts.body).toBeUndefined()
  })

  it("POSTs explicit domains as organization[domain][] form params", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(findPeoplePayload))
    vi.stubGlobal("fetch", mockFetch)

    await registeredTools.get("Find-People")!.handler({ domains: ["stripe.com", "adyen.com"] })

    const [url, opts] = mockFetch.mock.calls[0] as [string, { method: string; body?: string }]
    expect(url).toBe("https://api.hunter.io/v2/discover/people")
    expect(opts.method).toBe("POST")
    const body = new URLSearchParams(opts.body)
    expect(body.getAll("organization[domain][]")).toEqual(["stripe.com", "adyen.com"])
  })

  it("query takes precedence: domains are not sent when both are provided", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(findPeoplePayload))
    vi.stubGlobal("fetch", mockFetch)

    await registeredTools.get("Find-People")!.handler({ query: "fintechs", domains: ["stripe.com"] })

    const [url, opts] = mockFetch.mock.calls[0] as [string, { method: string; body?: string }]
    expect(url).toBe("https://api.hunter.io/v2/discover/people?query=fintechs")
    expect(opts.body).toBeUndefined()
  })

  it("rejects locally (no Hunter call) when neither query nor domains is provided", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Find-People")!.handler({})

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("invalid_input")
    // The local error envelope must validate against the published schema too.
    expect(() => publishedOutputSchema("Find-People").parse(result.structuredContent)).not.toThrow()
  })

  it("published output schema validates the jbuilder success payload and the error envelope", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(findPeoplePayload))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Find-People")!.handler({ query: "payment companies in Europe" })
    const schema = publishedOutputSchema("Find-People")
    const parsed = schema.parse(result.structuredContent)
    expect(parsed.data).toHaveLength(2)
    expect(parsed.meta.total_emails.total).toBe(176)
    expect(() => schema.parse(errorEnvelope)).not.toThrow()
  })

  it("passes a 422 Rails error body through as a typed isError envelope", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(railsErrorResponse(422, [{ id: "invalid_query", code: 422, details: "Bad query." }]))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Find-People")!.handler({ query: "x" })

    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string; message: string } }).error
    expect(error.code).toBe("invalid_input")
    expect(error.message).toContain("Bad query.")
    expect(() => publishedOutputSchema("Find-People").parse(result.structuredContent)).not.toThrow()
  })
})

describe("List-Saved-Searches handler", () => {
  it("GETs /discover/views with offset/limit query params and deep-links to /discover", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(listSavedSearchesPayload))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("List-Saved-Searches")!.handler({ offset: 5, limit: 10 })

    const [url, opts] = mockFetch.mock.calls[0] as [string, { method: string }]
    expect(url).toBe("https://api.hunter.io/v2/discover/views?offset=5&limit=10")
    expect(opts.method).toBe("GET")
    expect((result.structuredContent as { viewInHunter?: string }).viewInHunter).toBe("https://hunter.io/discover")
  })

  it("published output schema validates the jbuilder success payload and the error envelope", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse(listSavedSearchesPayload))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("List-Saved-Searches")!.handler({})
    const schema = publishedOutputSchema("List-Saved-Searches")
    const parsed = schema.parse(result.structuredContent)
    expect(parsed.data.views[0].name).toBe("FR fintechs")
    expect(parsed.meta.total).toBe(4)
    expect(() => schema.parse(errorEnvelope)).not.toThrow()
  })

  it("passes a 422 Rails error body through as a typed isError envelope", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(railsErrorResponse(422, [{ id: "invalid_argument", code: 422, details: "Nope." }]))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("List-Saved-Searches")!.handler({})

    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("invalid_input")
  })
})

describe("Get-Saved-Search handler", () => {
  it("GETs /discover/views/:id and deep-links to /discover?view_id=:id", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse({ data: savedSearchRow }))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Get-Saved-Search")!.handler({ saved_search_id: 12 })

    const [url, opts] = mockFetch.mock.calls[0] as [string, { method: string }]
    expect(url).toBe("https://api.hunter.io/v2/discover/views/12")
    expect(opts.method).toBe("GET")
    expect((result.structuredContent as { viewInHunter?: string }).viewInHunter).toBe(
      "https://hunter.io/discover?view_id=12",
    )

    const schema = publishedOutputSchema("Get-Saved-Search")
    const parsed = schema.parse(result.structuredContent)
    expect(parsed.data.filters.company_size).toEqual(["11-50"])
    expect(() => schema.parse(errorEnvelope)).not.toThrow()
  })

  it("passes a 422 Rails error body through as a typed isError envelope", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(railsErrorResponse(422, [{ id: "invalid_argument", code: 422, details: "Nope." }]))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Get-Saved-Search")!.handler({ saved_search_id: 12 })

    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("invalid_input")
  })
})

describe("Create-Saved-Search handler", () => {
  it("POSTs name + filters as a JSON body with an auto-generated Idempotency-Key", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse({ data: savedSearchRow }, 201))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Create-Saved-Search")!.handler({
      name: "FR fintechs",
      filters: { company_size: ["11-50"], location_country_included: ["FR"], keywords_operator: "and" },
    })

    const [url, opts] = mockFetch.mock.calls[0] as [
      string,
      { method: string; body: string; headers: Record<string, string> },
    ]
    expect(url).toBe("https://api.hunter.io/v2/discover/views")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    // filters travels as JSON (not form-encoding) so its shape is stored verbatim.
    expect(opts.headers["Content-Type"]).toBe("application/json")
    const body = JSON.parse(opts.body) as { name: string; filters: Record<string, unknown> }
    expect(body.name).toBe("FR fintechs")
    expect(body.filters).toEqual({
      company_size: ["11-50"],
      location_country_included: ["FR"],
      keywords_operator: "and",
    })
    // Deep link derived from the created record's id.
    expect((result.structuredContent as { viewInHunter?: string }).viewInHunter).toBe(
      "https://hunter.io/discover?view_id=12",
    )
  })

  it("round-trips a nested array-of-objects filter verbatim via the JSON body", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse({ data: savedSearchRow }, 201))
    vi.stubGlobal("fetch", mockFetch)

    // Real shapes from Api::Discover::Params#append_headquarters_location_filters:
    // headquarters_location.include is an ARRAY of objects. Two hazards a form body
    // can't survive are both covered here — heterogeneous keys ({ country } then
    // { country, state }), and DISJOINT keys ({ continent } then { country }) which
    // `key[][..]` form encoding would MERGE into one hash.
    const filters = {
      headquarters_location: {
        include: [{ continent: "EU" }, { country: "US" }, { country: "US", state: "CA" }],
      },
    }
    await registeredTools.get("Create-Saved-Search")!.handler({ name: "US west-coast", filters })

    const [, opts] = mockFetch.mock.calls[0] as [string, { body: string; headers: Record<string, string> }]
    expect(opts.headers["Content-Type"]).toBe("application/json")
    // The array stays an array of the exact same objects — no "[object Object]"
    // corruption, no array→hash collapse, no disjoint-object merge.
    expect(opts.body).not.toContain("[object Object]")
    const body = JSON.parse(opts.body) as { filters: typeof filters }
    expect(body.filters).toEqual(filters)
    expect(Array.isArray(body.filters.headquarters_location.include)).toBe(true)
  })

  it("published output schema validates the create.jbuilder payload and the error envelope", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okResponse({ data: savedSearchRow }, 201))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Create-Saved-Search")!.handler({ name: "FR fintechs" })
    const schema = publishedOutputSchema("Create-Saved-Search")
    const parsed = schema.parse(result.structuredContent)
    expect(parsed.data.id).toBe(12)
    expect(() => schema.parse(errorEnvelope)).not.toThrow()
  })

  it("passes a 422 Rails validation error through as a typed isError envelope", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        railsErrorResponse(422, [{ id: "name_invalid", code: 422, details: "Name has already been taken" }]),
      )
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Create-Saved-Search")!.handler({ name: "dupe" })

    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string; message: string } }).error
    expect(error.code).toBe("invalid_input")
    expect(error.message).toContain("Name has already been taken")
    expect(() => publishedOutputSchema("Create-Saved-Search").parse(result.structuredContent)).not.toThrow()
  })
})

describe("Delete-Saved-Search handler", () => {
  it("DELETEs /discover/views/:id and returns the synthesised ack on 204", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(emptyResponse(204))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Delete-Saved-Search")!.handler({ saved_search_id: 12 })

    const [url, opts] = mockFetch.mock.calls[0] as [string, { method: string; headers: Record<string, string> }]
    expect(url).toBe("https://api.hunter.io/v2/discover/views/12")
    expect(opts.method).toBe("DELETE")
    // DELETE carries no Idempotency-Key (POST-only header).
    expect(opts.headers["Idempotency-Key"]).toBeUndefined()

    const schema = publishedOutputSchema("Delete-Saved-Search")
    const parsed = schema.parse(result.structuredContent)
    expect(parsed.kind).toBe("ack")
    expect(parsed.ok).toBe(true)
    expect(parsed.status).toBe(204)
    expect(() => schema.parse(errorEnvelope)).not.toThrow()
  })

  it("passes a 422 Rails error body through as a typed isError envelope", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(railsErrorResponse(422, [{ id: "invalid_argument", code: 422, details: "Nope." }]))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Delete-Saved-Search")!.handler({ saved_search_id: 12 })

    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("invalid_input")
    expect(() => publishedOutputSchema("Delete-Saved-Search").parse(result.structuredContent)).not.toThrow()
  })
})
