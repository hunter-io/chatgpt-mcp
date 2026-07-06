import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// HUN-20849 / HUN-20850: lead organization — tags, leads-list folders,
// favorites. Registration is tested against the register function directly
// (not src/index — the orchestrator wires registration afterwards), using the
// same MockMcpServer recipe as test/tools.test.ts.

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

// Mock the MCP SDK so we capture every registration as a plain object — no
// network, no real server. Mirrors test/tools.test.ts.
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
const { registerLeadOrganizationTools } = await import("../src/tools/lead-organization")

function registerAll() {
  registeredTools.clear()
  registerLeadOrganizationTools(new (McpServer as never)(), "test-api-key", "https://api.hunter.io/v2")
}

// Reconstruct a tool's PUBLISHED output schema EXACTLY as the MCP SDK does:
// `registerTool` receives `<schema>.shape` and re-wraps it in a FRESH
// `z.object(...)`, so the envelope-level `.loose()` is dropped and the
// published JSON Schema is `additionalProperties: false`. `.strict()` models
// that envelope rejection (see test/tools.test.ts).
const publishedOutputSchema = (shape: Record<string, z.ZodTypeAny>) => z.object(shape).strict()

const UUID_RE = /^[0-9a-f-]{36}$/

const READ = { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false }

const TOOLS = [
  "List-Lead-Tags",
  "Create-Lead-Tag",
  "Update-Lead-Tag",
  "Delete-Lead-Tag",
  "Add-Tag-To-Lead",
  "Remove-Tag-From-Lead",
  "List-Leads-List-Folders",
  "Create-Leads-List-Folder",
  "Update-Leads-List-Folder",
  "Delete-Leads-List-Folder",
  "Favorite-Leads-List",
  "Unfavorite-Leads-List",
] as const

function okJson(body: unknown, status = 200) {
  return { ok: true, status, text: () => Promise.resolve(JSON.stringify(body)) }
}

function noContent(status = 204) {
  return { ok: true, status, text: () => Promise.resolve("") }
}

function railsError(status: number, errors: Array<{ id: string; code?: number; details: string }>) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify({ errors })),
  }
}

// A typed error envelope every buildResponseSchema/mutationAck published
// schema must accept (HUN-20460): callHunterApi emits `{ error }` on 4xx/5xx.
const ERROR_ENVELOPE = {
  error: { code: "not_found", retryable: false, message: "This tag does not exist." },
}

beforeEach(() => {
  registerAll()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("lead-organization registration", () => {
  it("registers all 12 tools with non-empty descriptions ending in the free-to-call marker", () => {
    for (const name of TOOLS) {
      const tool = registeredTools.get(name)
      expect(tool, `${name} should be registered`).toBeDefined()
      expect(tool!.description.length).toBeGreaterThan(50)
      expect(tool!.description.endsWith("Free to call.")).toBe(true)
    }
  })

  it("descriptions carry the organize-as-you-go guidance (HUN-20850)", () => {
    expect(registeredTools.get("List-Lead-Tags")!.description).toContain("near-duplicate")
    expect(registeredTools.get("Create-Lead-Tag")!.description).toContain("List-Lead-Tags")
    expect(registeredTools.get("Add-Tag-To-Lead")!.description).toContain("List-Lead-Tags")
    expect(registeredTools.get("Add-Tag-To-Lead")!.description).toContain("created automatically")
    expect(registeredTools.get("Favorite-Leads-List")!.description).toContain("default destination")
    expect(registeredTools.get("List-Leads-List-Folders")!.description).toContain("many")
  })

  it("destructive-consequence facts from the Rails code are stated in the descriptions", () => {
    // Tag#taggings is `dependent: :destroy` — deleting a tag detaches it from
    // every lead (app/app/models/tag.rb).
    expect(registeredTools.get("Delete-Lead-Tag")!.description).toContain("EVERY lead")
    // LeadsList::Folder#leads_lists is `dependent: :nullify` — lists survive
    // and become unfiled (app/app/models/leads_list/folder.rb).
    expect(registeredTools.get("Delete-Leads-List-Folder")!.description).toContain("does not delete")
    expect(registeredTools.get("Delete-Leads-List-Folder")!.description).toContain("unfiled")
  })

  it("exposes exact annotation values per tool", () => {
    expect(registeredTools.get("List-Lead-Tags")!.annotations).toEqual(READ)
    expect(registeredTools.get("List-Leads-List-Folders")!.annotations).toEqual(READ)

    expect(registeredTools.get("Create-Lead-Tag")!.annotations).toEqual(WRITE)
    expect(registeredTools.get("Add-Tag-To-Lead")!.annotations).toEqual(WRITE)
    // Remove-Tag-From-Lead mirrors Remove-Company-From-List: a reversible
    // detach (the tag survives), so NOT destructive.
    expect(registeredTools.get("Remove-Tag-From-Lead")!.annotations).toEqual(WRITE)
    expect(registeredTools.get("Create-Leads-List-Folder")!.annotations).toEqual(WRITE)
    expect(registeredTools.get("Favorite-Leads-List")!.annotations).toEqual(WRITE)
    expect(registeredTools.get("Unfavorite-Leads-List")!.annotations).toEqual(WRITE)

    expect(registeredTools.get("Update-Lead-Tag")!.annotations).toEqual(DESTRUCTIVE)
    expect(registeredTools.get("Delete-Lead-Tag")!.annotations).toEqual(DESTRUCTIVE)
    expect(registeredTools.get("Update-Leads-List-Folder")!.annotations).toEqual(DESTRUCTIVE)
    expect(registeredTools.get("Delete-Leads-List-Folder")!.annotations).toEqual(DESTRUCTIVE)
  })
})

describe("Lead tags CRUD", () => {
  it("List-Lead-Tags GETs /tags forwarding stringified pagination params", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: { tags: [] }, meta: { total: 0 } }))
    vi.stubGlobal("fetch", mockFetch)

    await registeredTools.get("List-Lead-Tags")!.handler({ offset: 10, limit: 50 })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/tags?offset=10&limit=50")
    expect(opts.method).toBe("GET")
  })

  it("List-Lead-Tags omits pagination params when not provided (server defaults limit to 25)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: { tags: [] }, meta: { total: 0 } }))
    vi.stubGlobal("fetch", mockFetch)

    await registeredTools.get("List-Lead-Tags")!.handler({})

    expect(mockFetch.mock.calls[0][0]).toBe("https://api.hunter.io/v2/tags")
  })

  it("List-Lead-Tags published output schema validates the jbuilder payload and the error envelope", () => {
    const schema = publishedOutputSchema(
      registeredTools.get("List-Lead-Tags")!.outputSchema as Record<string, z.ZodTypeAny>,
    )
    // Realistic payload from app/app/views/api/tags/index.jbuilder.
    const payload = {
      data: {
        tags: [
          { id: 7, name: "Customers", color: "EF4444", created_at: "2026-07-01T09:12:33.000Z" },
          { id: 6, name: "Q3 outreach", color: "3489F9", created_at: "2026-06-12T08:00:00.000Z" },
        ],
      },
      meta: { total: 2, params: { limit: 25, offset: 0 } },
    }
    expect(schema.safeParse(payload).success).toBe(true)
    expect(schema.safeParse(ERROR_ENVELOPE).success).toBe(true)
  })

  it("Create-Lead-Tag POSTs /tags with a Rails form body and an Idempotency-Key header", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        okJson({ data: { id: 9, name: "VIP", color: "EF4444", created_at: "2026-07-02T10:00:00.000Z" } }, 201),
      )
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Create-Lead-Tag")!.handler({ name: "VIP", color: "EF4444" })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/tags")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    const body = new URLSearchParams(opts.body)
    expect(body.get("name")).toBe("VIP")
    expect(body.get("color")).toBe("EF4444")
    expect(result.isError).toBeUndefined()

    const schema = publishedOutputSchema(
      registeredTools.get("Create-Lead-Tag")!.outputSchema as Record<string, z.ZodTypeAny>,
    )
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
    expect(schema.safeParse(ERROR_ENVELOPE).success).toBe(true)
  })

  it("Create-Lead-Tag omits color when not provided (Rails samples a random valid color)", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        okJson({ data: { id: 9, name: "VIP", color: "10B981", created_at: "2026-07-02T10:00:00.000Z" } }, 201),
      )
    vi.stubGlobal("fetch", mockFetch)

    await registeredTools.get("Create-Lead-Tag")!.handler({ name: "VIP" })

    const body = new URLSearchParams(mockFetch.mock.calls[0][1].body)
    expect(body.get("name")).toBe("VIP")
    expect(body.has("color")).toBe(false)
  })

  it("Create-Lead-Tag input schema accepts an allowed color and rejects an arbitrary hex", () => {
    const schema = z.object(registeredTools.get("Create-Lead-Tag")!.inputSchema as Record<string, z.ZodType>)
    expect(schema.safeParse({ name: "VIP", color: "374151" }).success).toBe(true)
    expect(schema.safeParse({ name: "VIP" }).success).toBe(true)
    expect(schema.safeParse({ name: "VIP", color: "FF0000" }).success).toBe(false)
    expect(schema.safeParse({ name: "", color: "374151" }).success).toBe(false)
  })

  it("Create-Lead-Tag surfaces a 422 duplicate-name as the typed invalid_input envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          railsError(422, [{ id: "validation_failed", code: 422, details: "Name has already been taken" }]),
        ),
    )

    const result = await registeredTools.get("Create-Lead-Tag")!.handler({ name: "VIP" })

    expect(result.isError).toBe(true)
    const err = (result.structuredContent as { error: { code: string; message: string } }).error
    expect(err.code).toBe("invalid_input")
    expect(err.message).toBe("Name has already been taken")
  })

  it("Update-Lead-Tag PUTs /tags/:id with only the provided fields and returns the updated tag", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        okJson({ data: { id: 7, name: "Champions", color: "EF4444", created_at: "2026-07-01T09:12:33.000Z" } }),
      )
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Update-Lead-Tag")!.handler({ id: 7, name: "Champions" })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/tags/7")
    expect(opts.method).toBe("PUT")
    expect(opts.headers["Idempotency-Key"]).toBeUndefined()
    const body = new URLSearchParams(opts.body)
    expect(body.get("name")).toBe("Champions")
    expect(body.has("color")).toBe(false)
    expect(result.isError).toBeUndefined()

    // update.jbuilder renders the tag body (200), so the single-tag envelope
    // must validate the response.
    const schema = publishedOutputSchema(
      registeredTools.get("Update-Lead-Tag")!.outputSchema as Record<string, z.ZodTypeAny>,
    )
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("Update-Lead-Tag surfaces a 404 as the typed not_found error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(railsError(404, [{ id: "not_found", code: 404, details: "This tag does not exist." }])),
    )

    const result = await registeredTools.get("Update-Lead-Tag")!.handler({ id: 999, name: "Champions" })

    expect(result.isError).toBe(true)
    const err = (result.structuredContent as { error: { code: string; message: string } }).error
    expect(err.code).toBe("not_found")
    expect(err.message).toBe("This tag does not exist.")
  })

  it("Delete-Lead-Tag DELETEs /tags/:id and returns the mutationAck on a 204", async () => {
    const mockFetch = vi.fn().mockResolvedValue(noContent())
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Delete-Lead-Tag")!.handler({ id: 7 })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/tags/7")
    expect(opts.method).toBe("DELETE")
    expect(result.isError).toBeUndefined()
    const structured = result.structuredContent as { kind: string; status: number }
    expect(structured.kind).toBe("ack")
    expect(structured.status).toBe(204)

    const schema = publishedOutputSchema(
      registeredTools.get("Delete-Lead-Tag")!.outputSchema as Record<string, z.ZodTypeAny>,
    )
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
    expect(schema.safeParse(ERROR_ENVELOPE).success).toBe(true)
  })

  it("Delete-Lead-Tag surfaces a 403 (not owner/admin) as the typed unauthorized envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          railsError(403, [{ id: "forbidden", code: 403, details: "You are not allowed to perform this action" }]),
        ),
    )

    const result = await registeredTools.get("Delete-Lead-Tag")!.handler({ id: 7 })

    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("unauthorized")
  })
})

describe("Per-lead tagging", () => {
  const addTagBody = {
    data: {
      tags: [
        { id: 7, name: "Customers", color: "EF4444" },
        { id: 9, name: "VIP", color: "10B981" },
      ],
    },
    meta: { params: { id: "42", tag_id: "7" } },
  }

  it("Add-Tag-To-Lead POSTs /leads/:id/tags with tag_id, an Idempotency-Key, and a lead deep link", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson(addTagBody, 201))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Add-Tag-To-Lead")!.handler({ lead_id: 42, tag_id: 7 })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads/42/tags")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    const body = new URLSearchParams(opts.body)
    expect(body.get("tag_id")).toBe("7")
    expect(result.isError).toBeUndefined()
    expect((result.structuredContent as { viewInHunter: string }).viewInHunter).toBe("https://hunter.io/leads/42")
    expect(result.content[0].text).toContain("View in Hunter: https://hunter.io/leads/42")

    const schema = publishedOutputSchema(
      registeredTools.get("Add-Tag-To-Lead")!.outputSchema as Record<string, z.ZodTypeAny>,
    )
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
    expect(schema.safeParse(ERROR_ENVELOPE).success).toBe(true)
  })

  it("Add-Tag-To-Lead sends tag_name when no tag_id is given, and prefers tag_id when both are", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson(addTagBody, 201))
    vi.stubGlobal("fetch", mockFetch)

    await registeredTools.get("Add-Tag-To-Lead")!.handler({ lead_id: 42, tag_name: "Customers" })
    let body = new URLSearchParams(mockFetch.mock.calls[0][1].body)
    expect(body.get("tag_name")).toBe("Customers")
    expect(body.has("tag_id")).toBe(false)

    await registeredTools.get("Add-Tag-To-Lead")!.handler({ lead_id: 42, tag_id: 7, tag_name: "Customers" })
    body = new URLSearchParams(mockFetch.mock.calls[1][1].body)
    expect(body.get("tag_id")).toBe("7")
    expect(body.has("tag_name")).toBe(false)
  })

  it("Add-Tag-To-Lead passes the Rails 422 tag_required error through when neither tag_id nor tag_name is given", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          railsError(422, [{ id: "tag_required", code: 422, details: "Either tag_id or tag_name is required" }]),
        ),
    )

    const result = await registeredTools.get("Add-Tag-To-Lead")!.handler({ lead_id: 42 })

    expect(result.isError).toBe(true)
    const err = (result.structuredContent as { error: { code: string; field?: string } }).error
    expect(err.code).toBe("invalid_input")
    expect(err.field).toBe("tag_required")
  })

  it("Remove-Tag-From-Lead DELETEs /leads/:id/tags/:tag_id and returns the mutationAck on a 204", async () => {
    const mockFetch = vi.fn().mockResolvedValue(noContent())
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Remove-Tag-From-Lead")!.handler({ lead_id: 42, tag_id: 7 })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads/42/tags/7")
    expect(opts.method).toBe("DELETE")
    expect(opts.headers["Idempotency-Key"]).toBeUndefined()
    expect(result.isError).toBeUndefined()
    expect((result.structuredContent as { kind: string }).kind).toBe("ack")
  })
})

describe("Leads-list folders CRUD", () => {
  const folder = {
    id: 3,
    name: "Q3 pipelines",
    color: "3489F9",
    leads_lists_count: 4,
    created_at: "2026-06-01T08:00:00.000Z",
  }

  it("List-Leads-List-Folders GETs the hyphenated /leads-lists/folders path with pagination params", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(okJson({ data: { folders: [folder] }, meta: { total: 1, params: { limit: 20, offset: 0 } } }))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("List-Leads-List-Folders")!.handler({ offset: 0, limit: 20 })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads-lists/folders?offset=0&limit=20")
    expect(opts.method).toBe("GET")

    const schema = publishedOutputSchema(
      registeredTools.get("List-Leads-List-Folders")!.outputSchema as Record<string, z.ZodTypeAny>,
    )
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
    expect(schema.safeParse(ERROR_ENVELOPE).success).toBe(true)
  })

  it("Create-Leads-List-Folder POSTs the name (color optional) with an Idempotency-Key", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: folder }, 201))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Create-Leads-List-Folder")!.handler({ name: "Q3 pipelines" })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads-lists/folders")
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    const body = new URLSearchParams(opts.body)
    expect(body.get("name")).toBe("Q3 pipelines")
    expect(body.has("color")).toBe(false)
    expect(result.isError).toBeUndefined()

    const schema = publishedOutputSchema(
      registeredTools.get("Create-Leads-List-Folder")!.outputSchema as Record<string, z.ZodTypeAny>,
    )
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("Create-Leads-List-Folder input schema accepts an allowed color and rejects an arbitrary hex", () => {
    const schema = z.object(registeredTools.get("Create-Leads-List-Folder")!.inputSchema as Record<string, z.ZodType>)
    expect(schema.safeParse({ name: "My Folder", color: "374151" }).success).toBe(true)
    expect(schema.safeParse({ name: "My Folder" }).success).toBe(true)
    expect(schema.safeParse({ name: "My Folder", color: "FF0000" }).success).toBe(false)
  })

  it("Create-Leads-List-Folder surfaces a 422 (duplicate name / folder limit) as invalid_input", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          railsError(422, [{ id: "validation_failed", code: 422, details: "Name has already been taken" }]),
        ),
    )

    const result = await registeredTools.get("Create-Leads-List-Folder")!.handler({ name: "Q3 pipelines" })

    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("invalid_input")
  })

  it("Update-Leads-List-Folder PUTs /leads-lists/folders/:id and returns the mutationAck on a 204", async () => {
    const mockFetch = vi.fn().mockResolvedValue(noContent())
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools
      .get("Update-Leads-List-Folder")!
      .handler({ id: 3, name: "Renamed", color: "EF4444" })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads-lists/folders/3")
    expect(opts.method).toBe("PUT")
    const body = new URLSearchParams(opts.body)
    expect(body.get("name")).toBe("Renamed")
    expect(body.get("color")).toBe("EF4444")
    expect(result.isError).toBeUndefined()
    expect((result.structuredContent as { kind: string; status: number }).kind).toBe("ack")

    const schema = publishedOutputSchema(
      registeredTools.get("Update-Leads-List-Folder")!.outputSchema as Record<string, z.ZodTypeAny>,
    )
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
    expect(schema.safeParse(ERROR_ENVELOPE).success).toBe(true)
  })

  it("Delete-Leads-List-Folder DELETEs and surfaces a 404 as the typed not_found envelope", async () => {
    const mockFetch = vi.fn().mockResolvedValue(noContent())
    vi.stubGlobal("fetch", mockFetch)

    const ok = await registeredTools.get("Delete-Leads-List-Folder")!.handler({ id: 3 })
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.hunter.io/v2/leads-lists/folders/3")
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE")
    expect((ok.structuredContent as { status: number }).status).toBe(204)

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(railsError(404, [{ id: "not_found", code: 404, details: "This folder does not exist." }])),
    )
    const notFound = await registeredTools.get("Delete-Leads-List-Folder")!.handler({ id: 999 })
    expect(notFound.isError).toBe(true)
    expect((notFound.structuredContent as { error: { code: string } }).error.code).toBe("not_found")
  })
})

describe("Leads-list favorite / unfavorite", () => {
  it("Favorite-Leads-List POSTs /leads-lists/:id/favorite with no body", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: { id: 5, favorited: true } }, 201))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Favorite-Leads-List")!.handler({ id: 5 })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads-lists/5/favorite")
    expect(opts.method).toBe("POST")
    expect(opts.body).toBeUndefined()
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    expect(result.isError).toBeUndefined()
    const structured = result.structuredContent as { data: { id: number; favorited: boolean } }
    expect(structured.data.id).toBe(5)
    expect(structured.data.favorited).toBe(true)

    const schema = publishedOutputSchema(
      registeredTools.get("Favorite-Leads-List")!.outputSchema as Record<string, z.ZodTypeAny>,
    )
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
    expect(schema.safeParse(ERROR_ENVELOPE).success).toBe(true)
  })

  it("Unfavorite-Leads-List DELETEs /leads-lists/:id/favorite and returns favorited: false", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: { id: 5, favorited: false } }))
    vi.stubGlobal("fetch", mockFetch)

    const result = await registeredTools.get("Unfavorite-Leads-List")!.handler({ id: 5 })

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/leads-lists/5/favorite")
    expect(opts.method).toBe("DELETE")
    expect(result.isError).toBeUndefined()
    expect((result.structuredContent as { data: { favorited: boolean } }).data.favorited).toBe(false)
  })

  it("Favorite-Leads-List surfaces a 404 as the typed not_found error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          railsError(404, [{ id: "not_found", code: 404, details: "This leads list does not exist." }]),
        ),
    )

    const result = await registeredTools.get("Favorite-Leads-List")!.handler({ id: 999 })

    expect(result.isError).toBe(true)
    const err = (result.structuredContent as { error: { code: string; message: string } }).error
    expect(err.code).toBe("not_found")
    expect(err.message).toBe("This leads list does not exist.")
  })

  it("Unfavorite-Leads-List surfaces a 404 as the typed not_found error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          railsError(404, [{ id: "not_found", code: 404, details: "This leads list does not exist." }]),
        ),
    )

    const result = await registeredTools.get("Unfavorite-Leads-List")!.handler({ id: 999 })

    expect(result.isError).toBe(true)
    const err = (result.structuredContent as { error: { code: string; message: string } }).error
    expect(err.code).toBe("not_found")
    expect(err.message).toBe("This leads list does not exist.")
  })
})
