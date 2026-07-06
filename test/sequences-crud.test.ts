import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Sequence CRUD + follow-up authoring tools (HUN-20840, HUN-20841, HUN-20843,
// HUN-20844). Mirrors the MockMcpServer recipe from test/tools.test.ts but
// registers ONLY the sequence tools via a direct registerSequenceTools import
// — no src/index, so this suite stays independent of orchestrator wiring.

type ToolHandler = (...args: any[]) => any

interface RegisteredTool {
  description: string
  inputSchema: Record<string, unknown>
  outputSchema?: Record<string, z.ZodTypeAny>
  annotations: Record<string, unknown>
  handler: ToolHandler
}

const registeredTools = new Map<string, RegisteredTool>()

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
const { registerSequenceTools } = await import("../src/tools/sequences")
const { nextActionSchema, deleteSequenceArgsSchema } = await import("../src/schemas/common")

registerSequenceTools(
  new McpServer({ name: "sequences-crud-test", version: "0.0.0" }),
  "test-api-key",
  "https://api.hunter.io/v2",
)

const BASE = "https://api.hunter.io/v2"
// callHunterApi auto-generates a UUID Idempotency-Key on every POST.
const UUID_RE = /^[0-9a-f-]{36}$/

// Reconstruct a tool's PUBLISHED output schema EXACTLY as the MCP SDK does:
// `registerTool` receives `<schema>.shape` and re-wraps it in a FRESH
// `z.object(...)`, so the envelope-level `.loose()` is dropped and the
// published JSON Schema is `additionalProperties: false`. `.strict()` models
// that; leaf sub-objects keep their own Zod behavior. (See test/tools.test.ts.)
const publishedOutputSchema = (shape: Record<string, z.ZodTypeAny>) => z.object(shape).strict()

function tool(name: string): RegisteredTool {
  const registered = registeredTools.get(name)
  if (!registered) throw new Error(`tool ${name} is not registered`)
  return registered
}

function okJson(body: unknown) {
  return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) }
}

function noContent() {
  return { ok: true, status: 204, text: () => Promise.resolve("") }
}

function railsError(status: number, id: string, details: string) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify({ errors: [{ id, code: status, details }] })),
  }
}

function fetchCall(mockFetch: ReturnType<typeof vi.fn>, index = 0) {
  const [url, opts] = mockFetch.mock.calls[index] as [
    string,
    { method: string; headers: Record<string, string>; body?: string },
  ]
  return { url, opts }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// Realistic detail payload grounded in app/app/views/api/sequences/
// _sequence.jbuilder (rendered by api/sequences/show.jbuilder for GET /
// POST 201 / PUT).
const SEQUENCE_DETAIL = {
  data: {
    id: 42,
    name: "Q3 outreach",
    status: "draft",
    recipients_count: 3,
    started: false,
    paused: false,
    archived: false,
    schedule: { start_at: null, time_start: "09:00", time_end: "17:30", days: [1, 2, 3, 4, 5] },
    settings: {
      tracked: true,
      tracked_links: false,
      add_unsubscribe_link: true,
      ai_assistant_enabled: false,
      bcc_recipient: null,
    },
    email_account_ids: [7],
    follow_ups: { unique_steps_count: 2, steps: [0, 1] },
    owner: { id: 1, email: "owner@example.com" },
    created_at: "2026-07-01T09:00:00.000Z",
    updated_at: "2026-07-01T10:00:00.000Z",
  },
}

describe("sequence CRUD registration", () => {
  const NEW_TOOLS = [
    "List-Sequences",
    "Get-Sequence",
    "Create-Sequence",
    "Update-Sequence",
    "Delete-Sequence",
    "Get-Sequence-Follow-Up",
    "Create-Sequence-Follow-Up",
    "Delete-Sequence-Follow-Up",
  ]

  it("registers every tool with a chatgpt-style description", () => {
    for (const name of NEW_TOOLS) {
      const registered = tool(name)
      expect(registered.description.length).toBeGreaterThan(50)
      expect(registered.description.startsWith("Use this when the user wants to")).toBe(true)
      expect(registered.description.endsWith("Free to call.")).toBe(true)
    }
  })

  it("List-Sequences mentions Create-Sequence and the new filters", () => {
    const description = tool("List-Sequences").description
    expect(description).toContain("Create-Sequence")
    expect(description).toContain("started")
    expect(description).toContain("archived")
    expect(description).toContain("limit")
  })

  it("Get-Sequence names the lifecycle statuses and configuration blocks", () => {
    const description = tool("Get-Sequence").description
    expect(description).toContain("status")
    expect(description).toContain("schedule")
    expect(description).toContain("email_account_ids")
  })

  it("Create-Sequence guides required fields, lifecycle, and next steps", () => {
    const description = tool("Create-Sequence").description
    expect(description).toContain("DRAFT")
    expect(description).toContain("Start-Sequence")
    expect(description).toContain("Add-Sequence-Recipients")
    expect(description).toContain("Create-Sequence-Follow-Up")
  })

  it("Update-Sequence documents the post-start field locks", () => {
    const description = tool("Update-Sequence").description
    expect(description).toContain("locked")
    expect(description).toContain("sequence_locked")
    expect(description).toContain("email_account_ids")
  })

  it("Delete-Sequence states drafts-only, permanence, and the confirmation gate", () => {
    const description = tool("Delete-Sequence").description
    expect(description).toContain("drafts-only")
    expect(description).toContain("cannot be undone")
    expect(description).toContain("confirmed")
  })

  it("Get-Sequence-Follow-Up explains the raw-subject difference", () => {
    const description = tool("Get-Sequence-Follow-Up").description
    expect(description).toContain("List-Sequence-Follow-Ups")
    expect(description).toContain("placeholder")
  })

  it("Create-Sequence-Follow-Up guides step-by-step authoring, templates, and the 6-step cap", () => {
    const description = tool("Create-Sequence-Follow-Up").description
    expect(description).toContain("List-Sequence-Follow-Ups")
    expect(description).toContain("List-Message-Templates")
    expect(description).toContain("6 steps")
    expect(description).toContain("wait_days")
  })

  it("Delete-Sequence-Follow-Up documents the last-step-only rule", () => {
    const description = tool("Delete-Sequence-Follow-Up").description
    expect(description).toContain("LAST step")
    expect(description).toContain("step 0")
  })

  it("read tools use private-read annotations", () => {
    for (const name of ["List-Sequences", "Get-Sequence", "Get-Sequence-Follow-Up"]) {
      expect(tool(name).annotations).toEqual({ readOnlyHint: true, destructiveHint: false, openWorldHint: false })
    }
  })

  it("create tools use private-write annotations", () => {
    for (const name of ["Create-Sequence", "Create-Sequence-Follow-Up"]) {
      expect(tool(name).annotations).toEqual({ readOnlyHint: false, destructiveHint: false, openWorldHint: false })
    }
  })

  it("update/delete tools use private-destructive annotations", () => {
    for (const name of ["Update-Sequence", "Delete-Sequence", "Delete-Sequence-Follow-Up"]) {
      expect(tool(name).annotations).toEqual({ readOnlyHint: false, destructiveHint: true, openWorldHint: false })
    }
  })
})

describe("List-Sequences (enriched)", () => {
  it("passes started/archived/limit/offset as query params", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: { sequences: [] }, meta: { limit: 50, offset: 10 } }))
    vi.stubGlobal("fetch", mockFetch)
    await tool("List-Sequences").handler({ started: true, archived: false, limit: 50, offset: 10 })
    const { url, opts } = fetchCall(mockFetch)
    expect(opts.method).toBe("GET")
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/v2/sequences")
    expect(parsed.searchParams.get("started")).toBe("true")
    expect(parsed.searchParams.get("archived")).toBe("false")
    expect(parsed.searchParams.get("limit")).toBe("50")
    expect(parsed.searchParams.get("offset")).toBe("10")
  })

  it("omits filters that were not provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: { sequences: [] } }))
    vi.stubGlobal("fetch", mockFetch)
    await tool("List-Sequences").handler({})
    const { url } = fetchCall(mockFetch)
    expect(url).toBe(`${BASE}/sequences`)
  })

  it("published output schema accepts a realistic page and the error envelope", () => {
    const schema = publishedOutputSchema(tool("List-Sequences").outputSchema!)
    expect(
      schema.safeParse({
        data: {
          sequences: [
            {
              id: 42,
              name: "Q3 outreach",
              recipients_count: 3,
              editable: true,
              started: false,
              archived: false,
              paused: false,
              owner: { id: 1, email: "owner@example.com" },
            },
          ],
        },
        meta: { limit: 20, offset: 0 },
      }).success,
    ).toBe(true)
    expect(
      schema.safeParse({ error: { code: "unauthorized", retryable: false, message: "Unauthorized" } }).success,
    ).toBe(true)
  })

  // index.jbuilder emits the RAW nullable columns: campaigns.started/paused
  // (nullable booleans, no default) and recipients_count (nullable int). A
  // legacy NULL row must parse instead of -32602-failing the whole list.
  it("published output schema accepts a legacy row with null started/paused/recipients_count", () => {
    const schema = publishedOutputSchema(tool("List-Sequences").outputSchema!)
    expect(
      schema.safeParse({
        data: {
          sequences: [{ id: 7, name: "Legacy import", started: null, paused: null, recipients_count: null }],
        },
        meta: { limit: 20, offset: 0 },
      }).success,
    ).toBe(true)
  })

  // campaigns.name is nullable with no model presence validation, so a
  // dashboard-created sequence saved without a name renders `name: null`. The
  // whole list must still parse.
  it("published output schema accepts a sequence with a null name", () => {
    const schema = publishedOutputSchema(tool("List-Sequences").outputSchema!)
    expect(
      schema.safeParse({
        data: { sequences: [{ id: 8, name: null, started: false, paused: false, recipients_count: 0 }] },
        meta: { limit: 20, offset: 0 },
      }).success,
    ).toBe(true)
  })
})

describe("List-Sequence-Recipients recipient shape", () => {
  // Grounded in app/app/views/api/campaigns/recipients/index.jbuilder: the
  // per-recipient item is exactly email, first_name, last_name, position,
  // company, website, sending_status, and lead_id (raw nullable column) — no
  // `id` and no `status` field.
  it("published output schema accepts a real recipients/index.jbuilder item", () => {
    const schema = publishedOutputSchema(tool("List-Sequence-Recipients").outputSchema!)
    expect(
      schema.safeParse({
        data: {
          recipients: [
            {
              email: "jane@acme.com",
              first_name: "Jane",
              last_name: "Doe",
              position: "CTO",
              company: "Acme",
              website: "acme.com",
              sending_status: "pending",
              lead_id: null,
            },
          ],
        },
        meta: { limit: 20, offset: 0 },
      }).success,
    ).toBe(true)
  })
})

describe("Get-Sequence", () => {
  it("GETs /sequences/:id and the published schema validates the jbuilder payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson(SEQUENCE_DETAIL))
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Get-Sequence").handler({ sequence_id: 42 })
    const { url, opts } = fetchCall(mockFetch)
    expect(url).toBe(`${BASE}/sequences/42`)
    expect(opts.method).toBe("GET")
    expect(result.isError).toBeUndefined()
    const schema = publishedOutputSchema(tool("Get-Sequence").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("published output schema accepts the typed error envelope", () => {
    const schema = publishedOutputSchema(tool("Get-Sequence").outputSchema!)
    expect(
      schema.safeParse({ error: { code: "not_found", retryable: false, message: "Sequence not found." } }).success,
    ).toBe(true)
  })

  // _sequence.jbuilder renders `sequence.name` raw; campaigns.name is nullable
  // with no model presence validation, so a dashboard sequence saved without a
  // name renders `name: null`. Get-Sequence must still return its config.
  it("published output schema accepts a detail payload with a null name", () => {
    const schema = publishedOutputSchema(tool("Get-Sequence").outputSchema!)
    expect(schema.safeParse({ data: { ...SEQUENCE_DETAIL.data, name: null } }).success).toBe(true)
  })

  it("passes a 404 through as a typed error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(railsError(404, "sequence_not_found", "Sequence not found.")))
    const result = await tool("Get-Sequence").handler({ sequence_id: 999 })
    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("not_found")
  })
})

describe("Create-Sequence", () => {
  it("POSTs a Rails-form body with an Idempotency-Key header and deep-links the created sequence", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson(SEQUENCE_DETAIL))
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Create-Sequence").handler({
      name: "Q3 outreach",
      email_account_ids: [7, 9],
      schedule_days: [1, 2, 3],
      schedule_time_start: 32400,
      schedule_time_end: 63000,
      start_at: "2026-08-01",
      bcc_recipient: "archive@example.com",
      tracked: true,
      tracked_links: false,
      add_unsubscribe_link: true,
    })
    const { url, opts } = fetchCall(mockFetch)
    expect(url).toBe(`${BASE}/sequences`)
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    const body = new URLSearchParams(opts.body)
    expect(body.get("name")).toBe("Q3 outreach")
    expect(body.getAll("email_account_ids[]")).toEqual(["7", "9"])
    expect(body.getAll("schedule_days[]")).toEqual(["1", "2", "3"])
    expect(body.get("schedule_time_start")).toBe("32400")
    expect(body.get("schedule_time_end")).toBe("63000")
    expect(body.get("start_at")).toBe("2026-08-01")
    expect(body.get("bcc_recipient")).toBe("archive@example.com")
    expect(body.get("tracked")).toBe("true")
    expect(body.get("tracked_links")).toBe("false")
    expect(body.get("add_unsubscribe_link")).toBe("true")
    expect(result.isError).toBeUndefined()
    expect((result.structuredContent as { viewInHunter?: string }).viewInHunter).toBe("https://hunter.io/sequences/42")
    const schema = publishedOutputSchema(tool("Create-Sequence").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("passes a 422 validation failure through as a typed error the published schema accepts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(railsError(422, "name_required", "name can't be blank")))
    const result = await tool("Create-Sequence").handler({ name: "x" })
    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string; field?: string } }).error
    expect(error.code).toBe("invalid_input")
    expect(error.field).toBe("name_required")
    const schema = publishedOutputSchema(tool("Create-Sequence").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })
})

describe("Update-Sequence", () => {
  it("PUTs only the provided fields, without an Idempotency-Key", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson(SEQUENCE_DETAIL))
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Update-Sequence").handler({ sequence_id: 42, name: "Renamed", schedule_days: [1, 5] })
    const { url, opts } = fetchCall(mockFetch)
    expect(url).toBe(`${BASE}/sequences/42`)
    expect(opts.method).toBe("PUT")
    expect(opts.headers["Idempotency-Key"]).toBeUndefined()
    const body = new URLSearchParams(opts.body)
    expect(body.get("name")).toBe("Renamed")
    expect(body.getAll("schedule_days[]")).toEqual(["1", "5"])
    expect(body.has("tracked")).toBe(false)
    expect(body.has("email_account_ids[]")).toBe(false)
    expect((result.structuredContent as { viewInHunter?: string }).viewInHunter).toBe("https://hunter.io/sequences/42")
    const schema = publishedOutputSchema(tool("Update-Sequence").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("passes the sequence_locked 422 through as a typed error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          railsError(
            422,
            "sequence_locked",
            "Started or archived sequences cannot have schedule_days changed via the API.",
          ),
        ),
    )
    const result = await tool("Update-Sequence").handler({ sequence_id: 42, schedule_days: [1] })
    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string; field?: string } }).error
    expect(error.code).toBe("invalid_input")
    expect(error.field).toBe("sequence_locked")
  })
})

describe("Delete-Sequence confirmation gate", () => {
  it("first call does NOT hit the DELETE endpoint and emits ask_user with a strict pendingToolCall", async () => {
    // Only the recipient-count pre-fetch (GET /sequences/:id) may run — the
    // recipients index meta carries only { limit, offset }, never a total, so
    // the gate reads the detail payload's `recipients_count`.
    const mockFetch = vi.fn().mockResolvedValue(okJson({ data: { id: 42, recipients_count: 47 } }))
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Delete-Sequence").handler({ sequence_id: 42, confirmed: false })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const { url, opts } = fetchCall(mockFetch)
    expect(opts.method).toBe("GET")
    expect(url).toBe(`${BASE}/sequences/42`)
    expect(result.isError).toBeUndefined()
    const structured = result.structuredContent as {
      data: { id: number; status: string }
      nextAction: { kind: string; question: string; pendingToolCall: { tool: string; args: Record<string, unknown> } }
    }
    expect(structured.data).toEqual({ id: 42, status: "awaiting_confirmation" })
    expect(structured.nextAction.kind).toBe("ask_user")
    expect(structured.nextAction.question).toContain("47 staged recipients")
    expect(structured.nextAction.pendingToolCall.tool).toBe("Delete-Sequence")
    // The echoed args must satisfy the STRICT per-tool schema (exact fields)…
    expect(structured.nextAction.pendingToolCall.args).toEqual({ sequence_id: 42, confirmed: true })
    expect(deleteSequenceArgsSchema.safeParse(structured.nextAction.pendingToolCall.args).success).toBe(true)
    // …and the whole nextAction must parse with the shared schema.
    expect(nextActionSchema.safeParse(structured.nextAction).success).toBe(true)
    const schema = publishedOutputSchema(tool("Delete-Sequence").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("falls back to generic phrasing when the recipient count is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))
    const result = await tool("Delete-Sequence").handler({ sequence_id: 7, confirmed: false })
    const structured = result.structuredContent as { nextAction: { question: string } }
    expect(structured.nextAction.question).toContain("all of its staged recipients")
  })

  it("confirmed call DELETEs /sequences/:id and returns the ack + complete nextAction", async () => {
    const mockFetch = vi.fn().mockResolvedValue(noContent())
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Delete-Sequence").handler({ sequence_id: 42, confirmed: true })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const { url, opts } = fetchCall(mockFetch)
    expect(url).toBe(`${BASE}/sequences/42`)
    expect(opts.method).toBe("DELETE")
    expect(result.isError).toBeUndefined()
    const structured = result.structuredContent as {
      kind: string
      ok: boolean
      status: number
      nextAction: { kind: string; summary: string }
    }
    expect(structured.kind).toBe("ack")
    expect(structured.ok).toBe(true)
    expect(structured.status).toBe(204)
    expect(structured.nextAction.kind).toBe("complete")
    expect(structured.nextAction.summary).toContain("42")
    const schema = publishedOutputSchema(tool("Delete-Sequence").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("passes the drafts-only 422 through as a typed error without a nextAction", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          railsError(
            422,
            "sequence_not_destroyable",
            "Only draft sequences can be deleted. Started or archived sequences cannot be removed.",
          ),
        ),
    )
    const result = await tool("Delete-Sequence").handler({ sequence_id: 42, confirmed: true })
    expect(result.isError).toBe(true)
    const structured = result.structuredContent as { error: { code: string; field?: string }; nextAction?: unknown }
    expect(structured.error.code).toBe("invalid_input")
    expect(structured.error.field).toBe("sequence_not_destroyable")
    expect(structured.nextAction).toBeUndefined()
    const schema = publishedOutputSchema(tool("Delete-Sequence").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })
})

describe("Get-Sequence-Follow-Up", () => {
  // Grounded in app/app/views/api/campaigns/follow_ups/show.jbuilder: raw
  // subject (inheritance placeholder is NOT resolved), always-string body.
  const FOLLOW_UP_DETAIL = {
    data: {
      id: 9,
      step: 1,
      wait_days: 3,
      message_format: "html",
      messages_sent: 0,
      subject: "{{__previous_subject__}}",
      body: "<p>Just following up.</p>",
      variant: null,
    },
  }

  it("GETs /sequences/:sequence_id/follow-ups/:id and the published schema validates the payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson(FOLLOW_UP_DETAIL))
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Get-Sequence-Follow-Up").handler({ sequence_id: 42, follow_up_id: 9 })
    const { url, opts } = fetchCall(mockFetch)
    expect(url).toBe(`${BASE}/sequences/42/follow-ups/9`)
    expect(opts.method).toBe("GET")
    expect(result.isError).toBeUndefined()
    const schema = publishedOutputSchema(tool("Get-Sequence-Follow-Up").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("published output schema accepts the typed error envelope", () => {
    const schema = publishedOutputSchema(tool("Get-Sequence-Follow-Up").outputSchema!)
    expect(
      schema.safeParse({ error: { code: "not_found", retryable: false, message: "Follow up not found." } }).success,
    ).toBe(true)
  })
})

describe("Create-Sequence-Follow-Up", () => {
  // Grounded in app/app/views/api/campaigns/follow_ups/create.jbuilder: the
  // created step nests under `follow_up`; meta.params echoes raw request
  // params (strings / null). `internal_parent_ref` stands in for the legacy
  // internal parent-id key the jbuilder also emits — the leaf is `.loose()`
  // so undeclared keys must not break validation.
  const CREATED_FOLLOW_UP = {
    data: {
      follow_up: {
        id: 9,
        step: 1,
        wait_days: 3,
        subject: "Quick follow-up",
        body: "<p>Hi again</p>",
        message_format: "html",
        internal_parent_ref: 42,
      },
    },
    meta: { params: { sequence_id: "42", step: null, wait_days: "3" } },
  }

  it("POSTs the step params with an Idempotency-Key header and deep-links the sequence", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson(CREATED_FOLLOW_UP))
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Create-Sequence-Follow-Up").handler({
      sequence_id: 42,
      subject: "Quick follow-up",
      body: "<p>Hi again</p>",
      wait_days: 3,
      message_format: "html",
      message_template_id: 5,
    })
    const { url, opts } = fetchCall(mockFetch)
    expect(url).toBe(`${BASE}/sequences/42/follow-ups`)
    expect(opts.method).toBe("POST")
    expect(opts.headers["Idempotency-Key"]).toMatch(UUID_RE)
    const body = new URLSearchParams(opts.body)
    expect(body.get("subject")).toBe("Quick follow-up")
    expect(body.get("body")).toBe("<p>Hi again</p>")
    expect(body.get("wait_days")).toBe("3")
    expect(body.get("message_format")).toBe("html")
    expect(body.get("message_template_id")).toBe("5")
    expect(result.isError).toBeUndefined()
    expect((result.structuredContent as { viewInHunter?: string }).viewInHunter).toBe("https://hunter.io/sequences/42")
    const schema = publishedOutputSchema(tool("Create-Sequence-Follow-Up").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("passes the step-limit 422 through as a typed error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(railsError(422, "validation_failed", "Sequence already has too many follow-ups")),
    )
    const result = await tool("Create-Sequence-Follow-Up").handler({ sequence_id: 42, subject: "s", body: "b" })
    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string; message: string } }).error
    expect(error.code).toBe("invalid_input")
    expect(error.message).toContain("too many follow-ups")
    const schema = publishedOutputSchema(tool("Create-Sequence-Follow-Up").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  // Rails accepts a body-less follow-up at create time (the body-presence check
  // only fires at Start-Sequence), and there is no update-follow-up tool, so a
  // blank step would be unfixable except by delete + recreate. Fail fast locally.
  it("rejects a step with neither body nor message_template_id before any fetch", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Create-Sequence-Follow-Up").handler({ sequence_id: 42, wait_days: 3 })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string; field: string; message: string } }).error
    expect(error.code).toBe("invalid_input")
    expect(error.field).toBe("body")
    expect(error.message).toContain("message_template_id")
    const schema = publishedOutputSchema(tool("Create-Sequence-Follow-Up").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("rejects a whitespace-only body with no template before any fetch", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Create-Sequence-Follow-Up").handler({ sequence_id: 42, body: "   " })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string } }).error
    expect(error.code).toBe("invalid_input")
  })

  it("accepts message_template_id with no body (template supplies the body server-side)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson(CREATED_FOLLOW_UP))
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Create-Sequence-Follow-Up").handler({ sequence_id: 42, message_template_id: 5 })
    expect(mockFetch).toHaveBeenCalledOnce()
    const { url } = fetchCall(mockFetch)
    expect(url).toBe(`${BASE}/sequences/42/follow-ups`)
    expect(result.isError).toBeUndefined()
  })

  it("accepts a non-empty body with no template", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okJson(CREATED_FOLLOW_UP))
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Create-Sequence-Follow-Up").handler({ sequence_id: 42, body: "<p>Hi again</p>" })
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(result.isError).toBeUndefined()
  })
})

describe("Delete-Sequence-Follow-Up", () => {
  it("DELETEs /sequences/:sequence_id/follow-ups/:id and returns the synthesized ack", async () => {
    const mockFetch = vi.fn().mockResolvedValue(noContent())
    vi.stubGlobal("fetch", mockFetch)
    const result = await tool("Delete-Sequence-Follow-Up").handler({ sequence_id: 42, follow_up_id: 9 })
    const { url, opts } = fetchCall(mockFetch)
    expect(url).toBe(`${BASE}/sequences/42/follow-ups/9`)
    expect(opts.method).toBe("DELETE")
    expect(opts.headers["Idempotency-Key"]).toBeUndefined()
    expect(result.isError).toBeUndefined()
    expect((result.structuredContent as { kind: string }).kind).toBe("ack")
    const schema = publishedOutputSchema(tool("Delete-Sequence-Follow-Up").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })

  it("passes the last-step-only 422 through as a typed error the published schema accepts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(railsError(422, "validation_failed", "can't be removed; only the last one can")),
    )
    const result = await tool("Delete-Sequence-Follow-Up").handler({ sequence_id: 42, follow_up_id: 8 })
    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string; message: string } }).error
    expect(error.code).toBe("invalid_input")
    expect(error.message).toContain("only the last one can")
    const schema = publishedOutputSchema(tool("Delete-Sequence-Follow-Up").outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })
})
