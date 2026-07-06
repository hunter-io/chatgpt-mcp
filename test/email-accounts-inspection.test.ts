import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

type ToolHandler = (...args: any[]) => any

const registeredTools = new Map<
  string,
  {
    description: string
    inputSchema: Record<string, unknown>
    outputSchema?: Record<string, z.ZodTypeAny>
    annotations: Record<string, unknown>
    handler: ToolHandler
  }
>()

// Mock the MCP SDK so we capture every registration as a plain object — no
// network, no real server. Mirrors chatgpt-mcp/test/tools.test.ts, but the
// register function is imported DIRECTLY (no src/index) so this suite stays
// independent of orchestrator wiring.
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
const { registerEmailAccountTools } = await import("../src/tools/email-accounts")

// Reconstruct a tool's PUBLISHED output schema EXACTLY as the MCP SDK does:
// `registerTool` receives `<schema>.shape` and re-wraps it in a fresh
// `z.object(...)`, dropping the envelope-level `.loose()` — so the published
// JSON Schema is `additionalProperties: false`. `.strict()` models that.
const publishedOutputSchema = (shape: Record<string, z.ZodTypeAny>) => z.object(shape).strict()

function registerTools() {
  registerEmailAccountTools(new (McpServer as never)(), "test-api-key", "https://api.hunter.io/v2")
}

// Realistic payload derived from
// app/app/views/api/email_accounts/show.jbuilder (the `_email_account`
// partial fields plus the show-only config block).
const accountDetail = {
  id: 12,
  email: "alice@acme.com",
  first_name: "Alice",
  last_name: "Martin",
  sending_status: "active",
  daily_limit: 200,
  provider: "gmail",
  sender_name: "Alice Martin",
  default_account: true,
  signature: "<div>Alice Martin<br>Head of Growth, Acme</div>",
  profile_picture_url: "https://www.gravatar.com/avatar/abc123?s=256&d=https%3A%2F%2Fui-avatars.com/api/AM/256",
  custom_tracking_domain: "track.acme.com",
  sending_schedule: {
    days: [0, 1, 2, 3, 4],
    start_time: "09:00",
    end_time: "16:59",
    time_zone: "Europe/Paris",
  },
  warmup: { enabled: true, status: "in_progress", end_date: "2026-07-20" },
}

// Sparse/legacy row: nullable columns emitted as null (send_email_as, the
// owner's names, display_name, signature, tracking domain, schedule columns)
// and no live warmup mailbox. `default_account` is a nullable boolean column
// (db/structure.sql: no NOT NULL, no default), so legacy rows predating the
// default-sender backfill render it as `null` — show.jbuilder emits it raw.
const sparseAccountDetail = {
  id: 7,
  email: null,
  first_name: null,
  last_name: null,
  sending_status: "paused",
  daily_limit: 30,
  provider: "smtp",
  sender_name: null,
  default_account: null,
  signature: null,
  profile_picture_url: null,
  custom_tracking_domain: null,
  sending_schedule: { days: null, start_time: null, end_time: null, time_zone: "UTC" },
  warmup: { enabled: false, status: null, end_date: null },
}

// Realistic items derived from
// app/app/views/api/email_accounts/sequences/index.jbuilder.
const activeSequence = {
  id: 3101,
  name: "Q3 outbound",
  status: "active",
  recipients_allocated: 148,
  emails_scheduled: 12,
}

const draftSequence = {
  id: 2987,
  name: "Onboarding nudges",
  status: "draft",
  recipients_allocated: 0,
  emails_scheduled: 0,
}

const errorEnvelope = {
  error: {
    code: "not_found",
    retryable: false,
    message: "The email account does not exist.",
  },
}

function stubFetchOnce(payload: unknown) {
  const mockFetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(payload)),
  })
  vi.stubGlobal("fetch", mockFetch)
  return mockFetch
}

function stubFetchError(status: number, body: unknown) {
  const mockFetch = vi.fn().mockResolvedValueOnce({
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
  })
  vi.stubGlobal("fetch", mockFetch)
  return mockFetch
}

beforeEach(() => {
  registeredTools.clear()
  registerTools()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("email-account tool registration", () => {
  const ALL = ["List-Email-Accounts", "Get-Email-Account", "List-Email-Account-Sequences"]

  it("registers exactly the three email-account tools (List-Email-Accounts is untouched)", () => {
    expect(registeredTools.size).toBe(ALL.length)
    for (const name of ALL) expect(registeredTools.has(name)).toBe(true)
  })

  it.each(ALL)("tool '%s' has a non-empty description ending 'Free to call.'", (name) => {
    const tool = registeredTools.get(name)!
    expect(tool.description.length).toBeGreaterThan(0)
    expect(tool.description.endsWith("Free to call.")).toBe(true)
  })

  it.each(ALL)("tool '%s' declares an outputSchema", (name) => {
    expect(registeredTools.get(name)!.outputSchema).toBeDefined()
  })

  // HUN-20864: Get-Email-Account is the "how is alice@acme.com set up?"
  // pre-check — and must warn that settings can NOT be changed via this API.
  it("Get-Email-Account frames the pre-check flow and the read-only limitation", () => {
    const description = registeredTools.get("Get-Email-Account")!.description
    expect(description).toMatch(/pre-check/i)
    expect(description).toMatch(/settings can NOT be changed through this API/)
    expect(description).toContain("List-Email-Accounts")
    expect(description).toContain("sending_schedule")
    expect(description).toContain("warmup")
  })

  // HUN-20865: List-Email-Account-Sequences is the "what's using this email
  // account?" dependency check, paired with the other two account tools.
  it("List-Email-Account-Sequences frames the dependency check and pairs with the account tools", () => {
    const description = registeredTools.get("List-Email-Account-Sequences")!.description
    expect(description).toMatch(/dependency check/i)
    expect(description).toMatch(/before pausing, reconfiguring, or disconnecting/i)
    expect(description).toContain("List-Email-Accounts")
    expect(description).toContain("Get-Email-Account")
    expect(description).toContain("recipients_allocated")
    expect(description).toContain("emails_scheduled")
  })
})

describe("email-account tool annotations", () => {
  it.each(["List-Email-Accounts", "Get-Email-Account", "List-Email-Account-Sequences"])(
    "tool '%s' is a private read",
    (name) => {
      expect(registeredTools.get(name)!.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      })
    },
  )
})

describe("Get-Email-Account handler", () => {
  it("GETs /email-accounts/:id (hyphenated path)", async () => {
    const mockFetch = stubFetchOnce({ data: accountDetail })
    const result = await registeredTools.get("Get-Email-Account")!.handler({ email_account_id: 12 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/email-accounts/12")
    expect(opts.method).toBe("GET")
    expect(opts.headers.Authorization).toBe("Bearer test-api-key")
    expect(result.isError).toBeUndefined()
  })

  it("published output schema validates the show.jbuilder envelope and the error envelope", () => {
    const schema = publishedOutputSchema(registeredTools.get("Get-Email-Account")!.outputSchema!)
    expect(schema.safeParse({ data: accountDetail }).success).toBe(true)
    expect(schema.safeParse({ data: sparseAccountDetail }).success).toBe(true)
    expect(schema.safeParse(errorEnvelope).success).toBe(true)
  })

  // Regression: legacy rows with a NULL `default_account` column (no NOT NULL,
  // no default in db/structure.sql — show.jbuilder emits it raw) must NOT be
  // rejected. A strict `z.boolean()` would fail the whole response at SDK
  // output validation for those rows; `nullableBoolean()` admits the null.
  it("accepts a null default_account (legacy row) without rejecting the response", () => {
    const schema = publishedOutputSchema(registeredTools.get("Get-Email-Account")!.outputSchema!)
    expect(schema.safeParse({ data: { ...accountDetail, default_account: null } }).success).toBe(true)
    expect(schema.safeParse({ data: { ...accountDetail, default_account: false } }).success).toBe(true)
    expect(schema.safeParse({ data: { ...accountDetail, default_account: true } }).success).toBe(true)
  })

  it("strips secret-ish fields the schema does not declare (Zod default strip)", () => {
    const schema = publishedOutputSchema(registeredTools.get("Get-Email-Account")!.outputSchema!)
    const parsed = schema.parse({
      data: {
        ...accountDetail,
        // If a future Rails revision ever leaked credentials into the show
        // payload, the undeclared keys must be dropped at parse time and
        // never reach the model.
        access_token: "ya29.secret-token",
        refresh_token: "1//refresh-secret",
        smtp_password: "hunter2",
      },
    }) as { data: Record<string, unknown> }
    expect(parsed.data).not.toHaveProperty("access_token")
    expect(parsed.data).not.toHaveProperty("refresh_token")
    expect(parsed.data).not.toHaveProperty("smtp_password")
    // The declared config fields survive the strip.
    expect(parsed.data.signature).toBe(accountDetail.signature)
    expect(parsed.data.sending_schedule).toEqual(accountDetail.sending_schedule)
  })

  it("passes a 404 through as a typed not_found error", async () => {
    stubFetchError(404, { errors: [{ id: "not_found", code: 404, details: "The email account does not exist." }] })
    const result = await registeredTools.get("Get-Email-Account")!.handler({ email_account_id: 999 })
    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("not_found")
    // The typed error envelope must satisfy the published schema.
    const schema = publishedOutputSchema(registeredTools.get("Get-Email-Account")!.outputSchema!)
    expect(schema.safeParse(result.structuredContent).success).toBe(true)
  })
})

describe("List-Email-Account-Sequences handler", () => {
  it("GETs /email-accounts/:id/sequences with stringified query params", async () => {
    const mockFetch = stubFetchOnce({ data: [activeSequence], meta: { total: 1, limit: 20, offset: 40 } })
    const result = await registeredTools.get("List-Email-Account-Sequences")!.handler({
      email_account_id: 12,
      include_archived: true,
      offset: 40,
      limit: 20,
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/email-accounts/12/sequences?include_archived=true&offset=40&limit=20")
    expect(opts.method).toBe("GET")
    expect(opts.headers.Authorization).toBe("Bearer test-api-key")
    expect(result.isError).toBeUndefined()
  })

  it("omits query params when none are given", async () => {
    const mockFetch = stubFetchOnce({ data: [], meta: { total: 0, limit: 20, offset: 0 } })
    await registeredTools.get("List-Email-Account-Sequences")!.handler({ email_account_id: 12 })
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.hunter.io/v2/email-accounts/12/sequences")
  })

  it("published output schema validates the index.jbuilder envelope and the error envelope", () => {
    const schema = publishedOutputSchema(registeredTools.get("List-Email-Account-Sequences")!.outputSchema!)
    // index.jbuilder: data is an ARRAY + meta { total, limit, offset }.
    const success = schema.safeParse({
      data: [activeSequence, draftSequence],
      meta: { total: 2, limit: 20, offset: 0 },
    })
    expect(success.success).toBe(true)
    expect(schema.safeParse(errorEnvelope).success).toBe(true)
  })

  it("accepts a null name for an unnamed legacy sequence (campaigns.name is nullable)", () => {
    const schema = publishedOutputSchema(registeredTools.get("List-Email-Account-Sequences")!.outputSchema!)
    const unnamed = { ...draftSequence, name: null }
    expect(schema.safeParse({ data: [unnamed], meta: { total: 1, limit: 20, offset: 0 } }).success).toBe(true)
  })

  it("passes a 404 through as a typed not_found error", async () => {
    stubFetchError(404, { errors: [{ id: "not_found", code: 404, details: "The email account does not exist." }] })
    const result = await registeredTools.get("List-Email-Account-Sequences")!.handler({ email_account_id: 999 })
    expect(result.isError).toBe(true)
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe("not_found")
  })

  it("passes a 400 pagination error through with isError true", async () => {
    stubFetchError(400, {
      errors: [
        { id: "pagination_error", code: 400, details: "The parameter 'limit' should range between 1 and 100." },
      ],
    })
    const result = await registeredTools.get("List-Email-Account-Sequences")!.handler({
      email_account_id: 12,
      limit: 100,
    })
    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string; message: string } }).error
    expect(error.code).toBe("validation")
    expect(error.message).toContain("The parameter 'limit' should range between 1 and 100.")
  })
})
