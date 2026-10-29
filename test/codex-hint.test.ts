import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { withClientUserAgent } from "../src/client-context"
import { CODEX_FULL_SERVER_HINT, isCodexClient, withCodexFullServerHint } from "../src/codex-hint"

// HUN-24659: Codex users who install Hunter from OpenAI's directory get this
// server. The company and count tools they reach first tell them how to add the
// full server.

type ToolHandler = (...args: any[]) => any

const registeredTools = new Map<string, { outputSchema?: Record<string, unknown>; handler: ToolHandler }>()

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    registerTool(name: string, config: { outputSchema?: Record<string, unknown> }, handler: ToolHandler) {
      registeredTools.set(name, { outputSchema: config.outputSchema, handler })
    }

    registerResource() {}

    registerPrompt() {}
  },
}))

const { createServer } = await import("../src/index")
createServer("test-api-key", "https://api.hunter.io/v2")

// The SDK re-wraps `outputSchema` in a plain `z.object`, so the published schema
// is `additionalProperties: false`: the hint must not add a top-level field.
const publishedOutputSchema = (name: string) =>
  z.object(registeredTools.get(name)!.outputSchema as Record<string, z.ZodTypeAny>).strict()

const CODEX_RELAY = "openai-mcp/1.0.0 (Codex)"
const CHATGPT_RELAY = "openai-mcp/1.0.0"

function okResponse(body: unknown) {
  return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("isCodexClient", () => {
  it.each([CODEX_RELAY, "openai-mcp/1.2.0 (codex)", "codex-mcp-client/0.154.0", "codex-mcp-client/0.166.0-alpha.6"])(
    "names %s as Codex",
    (userAgent) => {
      expect(withClientUserAgent(userAgent, isCodexClient)).toBe(true)
    },
  )

  it.each([CHATGPT_RELAY, "openai-mcp/1.0.0 (Agent Builder)", "python-httpx/0.28.1", "claude-code/2.1.271 (cli)"])(
    "does not name %s as Codex",
    (userAgent) => {
      expect(withClientUserAgent(userAgent, isCodexClient)).toBe(false)
    },
  )

  it("is false outside a request scope", () => {
    expect(isCodexClient()).toBe(false)
  })
})

describe("withCodexFullServerHint", () => {
  const ok = { content: [], structuredContent: { data: { total: 1 } } }

  it("names both commands, since `add` alone leaves older Codex builds without a token", () => {
    expect(CODEX_FULL_SERVER_HINT).toContain(
      "`codex mcp add hunter --url https://mcp.hunter.io/mcp`, then `codex mcp login hunter`",
    )
  })

  it("leaves an error result alone", () => {
    const error = { content: [], structuredContent: { error: { code: "rate_limited" } }, isError: true }
    expect(withClientUserAgent(CODEX_RELAY, () => withCodexFullServerHint(error))).toBe(error)
  })

  it("keeps an existing message", () => {
    const ack = { content: [], structuredContent: { kind: "ack", ok: true, status: 202, message: "Accepted" } }
    expect(withClientUserAgent(CODEX_RELAY, () => withCodexFullServerHint(ack))).toBe(ack)
  })

  it("leaves a ChatGPT result alone", () => {
    expect(withClientUserAgent(CHATGPT_RELAY, () => withCodexFullServerHint(ok))).toBe(ok)
  })
})

describe.each([
  {
    tool: "Find-Companies",
    args: { query: "payment companies in Europe" },
    payload: {
      data: [{ domain: "stripe.com", organization: "Stripe", emails_count: { personal: 120, generic: 8, total: 128 } }],
      meta: { results: 1, limit: 100, offset: 0 },
    },
  },
  {
    tool: "Company-Enrichment",
    args: { domain: "stripe.com" },
    payload: { data: { name: "Stripe", domain: "stripe.com", emailsCount: { personal: 120, generic: 8, total: 128 } } },
  },
  {
    tool: "Find-Similar-Companies",
    args: { domain: "stripe.com" },
    payload: {
      data: [
        { domain: "adyen.com", company_name: "Adyen", country: "NL", industry: null, size: null, similarity_score: 85 },
      ],
      meta: { results: 1, limit: 20, params: { domain: "stripe.com" } },
    },
  },
  {
    tool: "Email-Count",
    args: { domain: "stripe.com" },
    payload: { data: { total: 128, personal_emails: 120, generic_emails: 8 } },
  },
  {
    tool: "Count-Company-Emails",
    args: { domains: ["stripe.com"] },
    payload: {
      data: [{ domain: "stripe.com", organization: "Stripe", emails_count: { personal: 120, generic: 8, total: 128 } }],
      meta: { results: 1, total_emails: { personal: 120, generic: 8, total: 128 }, limit: 100, offset: 0 },
    },
  },
])("$tool result", ({ tool, args, payload }) => {
  async function call(userAgent: string) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(okResponse(payload)))
    return withClientUserAgent(userAgent, () => registeredTools.get(tool)!.handler(args))
  }

  // Codex shows the model only `structuredContent` when a result has one.
  it("carries the hint in structuredContent and for the assistant for Codex, within the published schema", async () => {
    const result = await call(CODEX_RELAY)

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent.message).toBe(CODEX_FULL_SERVER_HINT)
    expect(result.content.at(-1)).toEqual({
      type: "text",
      text: CODEX_FULL_SERVER_HINT,
      annotations: { audience: ["assistant"] },
    })
    expect(() => publishedOutputSchema(tool).parse(result.structuredContent)).not.toThrow()
  })

  it("carries no hint for ChatGPT", async () => {
    const result = await call(CHATGPT_RELAY)

    expect(result.structuredContent.message).toBeUndefined()
    expect(JSON.stringify(result)).not.toContain("mcp.hunter.io")
  })
})
