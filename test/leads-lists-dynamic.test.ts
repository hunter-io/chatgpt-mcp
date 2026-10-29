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
