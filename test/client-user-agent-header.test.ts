import { afterEach, describe, expect, it, vi } from "vitest"
import { callHunterApi } from "../src/helpers"
import { withClientUserAgent } from "../src/client-context"

const BASE = "https://api.hunter.io/v2"

// The seam between the ambient client scope (client-context.ts) and the upstream
// call: `callHunterApi` has to pick the User-Agent up out of AsyncLocalStorage and
// forward it as `X-MCP-USER-AGENT`, alongside the `X-SOURCE` that Rails already
// reads. Without this, Rails sees `source: hunter-mcp` and nothing more.

function okResponse(body: unknown = { data: { id: 1 } }) {
  return {
    ok: true,
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

function headersOf(mockFetch: ReturnType<typeof vi.fn>, callIndex = 0): Record<string, string> {
  const [, opts] = mockFetch.mock.calls[callIndex] as [string, { headers: Record<string, string> }]
  return opts.headers
}

describe("X-MCP-USER-AGENT forwarding", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("forwards the ambient User-Agent on a GET", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await withClientUserAgent("claude-code/2.1.271 (claude-desktop, agent-sdk/0.3.271)", () =>
      callHunterApi({ path: "/account", apiKey: "k", baseUrl: BASE }),
    )

    expect(headersOf(mockFetch)["X-MCP-USER-AGENT"]).toBe("claude-code/2.1.271 (claude-desktop, agent-sdk/0.3.271)")
  })

  it("forwards the ambient User-Agent on a POST", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await withClientUserAgent("codex-mcp-client/0.154.0", () =>
      callHunterApi({ path: "/sequences", apiKey: "k", baseUrl: BASE, method: "POST", params: { name: "Q3" } }),
    )

    expect(headersOf(mockFetch)["X-MCP-USER-AGENT"]).toBe("codex-mcp-client/0.154.0")
  })

  it("keeps sending X-SOURCE, which existing Rails dashboards filter on", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await withClientUserAgent("cursor/3.20.23 (darwin arm64)", () =>
      callHunterApi({ path: "/account", apiKey: "k", baseUrl: BASE }),
    )

    expect(headersOf(mockFetch)["X-SOURCE"]).toBe("hunter-chatgpt")
  })

  // Outside a request scope there is no User-Agent to report. Rails records an
  // absent header as `unknown`, which is a different fact from a User-Agent it
  // could not name, so inventing a value here would destroy that distinction.
  it("omits the header entirely when there is no ambient User-Agent", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await callHunterApi({ path: "/account", apiKey: "k", baseUrl: BASE })

    expect(headersOf(mockFetch)).not.toHaveProperty("X-MCP-USER-AGENT")
  })

  it("does not leak one request's User-Agent into the next", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await withClientUserAgent("goose/1.39.0", () => callHunterApi({ path: "/account", apiKey: "k", baseUrl: BASE }))
    await callHunterApi({ path: "/account", apiKey: "k", baseUrl: BASE })

    expect(headersOf(mockFetch, 0)["X-MCP-USER-AGENT"]).toBe("goose/1.39.0")
    expect(headersOf(mockFetch, 1)).not.toHaveProperty("X-MCP-USER-AGENT")
  })
})
