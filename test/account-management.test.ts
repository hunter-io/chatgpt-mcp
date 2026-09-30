import { beforeEach, describe, expect, it, vi } from "vitest"
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
// network, no real server. Mirrors chatgpt-mcp/test/tools.test.ts, but this
// suite imports registerAccountManagementTools directly instead of src/index
// (the orchestrator wires index registration separately).
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
const { registerAccountManagementTools } = await import("../src/tools/account-management")

registerAccountManagementTools(new (McpServer as never)(), "test-api-key", "https://api.hunter.io/v2")

// Reconstruct a tool's PUBLISHED output schema EXACTLY as the MCP SDK does:
// `registerTool` receives `<schema>.shape` and re-wraps it in a fresh
// `z.object(...)`, dropping the envelope-level `.loose()` — so the published
// JSON Schema is `additionalProperties: false`. `.strict()` models that.
const publishedOutputSchema = (shape: Record<string, z.ZodTypeAny>) => z.object(shape).strict()

function tool(name: string) {
  const entry = registeredTools.get(name)
  if (!entry) throw new Error(`tool ${name} not registered`)
  return entry
}

function jsonOk(body: unknown, status = 200) {
  return { ok: true, status, text: () => Promise.resolve(JSON.stringify(body)) }
}

function jsonError(body: unknown, status = 422) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal("fetch", mockFetch)
})

describe("account-management registration", () => {
  // The ChatGPT app connects via OAuth, and Api::ApiKeysController refuses
  // OAuth tokens, so the API-key tools are not registered (HUN-23709).
  it("registers Get-Usage only, with the ChatGPT description conventions", () => {
    expect([...registeredTools.keys()]).toEqual(["Get-Usage"])
    const description = tool("Get-Usage").description
    expect(description.startsWith("Use this when the user wants to")).toBe(true)
    expect(description.endsWith("Free to call.")).toBe(true)
  })

  it("Get-Usage tells the model to check quota proactively before credit-consuming actions", () => {
    const description = tool("Get-Usage").description
    expect(description).toContain("BEFORE")
    expect(description).toContain("email verifications")
    expect(description).toContain("warn the user")
    expect(description).toContain("consumes no credits")
  })

  it("marks Get-Usage as a private read", () => {
    expect(tool("Get-Usage").annotations).toEqual({ readOnlyHint: true, destructiveHint: false, openWorldHint: false })
  })
})

describe("Get-Usage", () => {
  it("GETs /usage and deep-links to hunter.io/usage", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk({
        data: {
          reset_date: "2026-07-15",
          requests: {
            searches: { used: 12, available: 500 },
            verifications: { used: 40, available: 1000 },
          },
        },
        meta: { params: { show_overage_requests: false } },
      }),
    )
    const result = await tool("Get-Usage").handler({})
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.hunter.io/v2/usage")
    expect(opts.method).toBe("GET")
    expect(result.isError).toBeUndefined()
    const sc = result.structuredContent as any
    expect(sc.viewInHunter).toBe("https://hunter.io/usage?utm_source=hunter-chatgpt&utm_medium=chatgpt-app")
    const schema = publishedOutputSchema(tool("Get-Usage").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })

  it("published output schema validates the jbuilder payload (credits bucket + overage) and the error envelope", () => {
    const schema = publishedOutputSchema(tool("Get-Usage").outputSchema!)
    // app/app/views/api/usage/show.jbuilder — single-credits-bucket premium
    // team with overage shown; credits values can be fractional floats.
    expect(() =>
      schema.parse({
        data: {
          reset_date: "2026-07-15",
          requests: {
            credits: { used: 120.5, available: 500, remaining: 379.5, over_quota: 0 },
            searches: { used: 12, available: 500, over_quota: 3 },
            verifications: { used: 40, available: 1000, over_quota: 0 },
          },
        },
        meta: { params: { show_overage_requests: true } },
      }),
    ).not.toThrow()
    expect(() =>
      schema.parse({
        error: { code: "rate_limited", retryable: true, message: "Too many requests." },
      }),
    ).not.toThrow()
  })

  it("passes a 429 restricted-account error through as isError", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError(
        { errors: [{ id: "restricted_account", code: 429, details: "Your account has no usable subscription." }] },
        429,
      ),
    )
    const result = await tool("Get-Usage").handler({})
    expect(result.isError).toBe(true)
    const sc = result.structuredContent as any
    expect(sc.error.code).toBe("rate_limited")
    const schema = publishedOutputSchema(tool("Get-Usage").outputSchema!)
    expect(() => schema.parse(sc)).not.toThrow()
  })
})
