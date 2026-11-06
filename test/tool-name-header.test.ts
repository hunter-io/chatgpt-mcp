import { afterEach, describe, expect, it, vi } from "vitest"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { callHunterApi } from "../src/helpers"
import { createServer } from "../src/index"
import { withToolName } from "../src/tool-context"

const BASE = "https://api.hunter.io/v2"

// `callHunterApi` forwards the running tool's name as `X-MCP-TOOL`, so Rails can
// record calls per tool (HUN-24972). Rails clamps the value; these tests cover
// what the worker sends.

function okResponse(body: unknown = { data: { id: 1 } }) {
  return {
    ok: true,
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

function headersOf(mockFetch: ReturnType<typeof vi.fn>, callIndex = 0): Record<string, string> {
  const [, opts] = mockFetch.mock.calls[callIndex] as [string, { headers: Record<string, string> }]
  return opts.headers
}

describe("X-MCP-TOOL forwarding", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends the ambient tool name on a GET", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await withToolName("Domain-Search", () => callHunterApi({ path: "/domain-search", apiKey: "k", baseUrl: BASE }))

    expect(headersOf(mockFetch)["X-MCP-TOOL"]).toBe("Domain-Search")
  })

  it("sends the ambient tool name on a POST", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await withToolName("Create-Sequence", () =>
      callHunterApi({ path: "/sequences", apiKey: "k", baseUrl: BASE, method: "POST", params: { name: "Q3" } }),
    )

    expect(headersOf(mockFetch)["X-MCP-TOOL"]).toBe("Create-Sequence")
  })

  // Rails records an absent header as `unknown`; a guessed value would hide it.
  it("sends no header outside a tool scope", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await callHunterApi({ path: "/account", apiKey: "k", baseUrl: BASE })

    expect(headersOf(mockFetch)).not.toHaveProperty("X-MCP-TOOL")
  })

  it("does not leak one scope into a later call", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await withToolName("Email-Verifier", () => callHunterApi({ path: "/email-verifier", apiKey: "k", baseUrl: BASE }))
    await callHunterApi({ path: "/account", apiKey: "k", baseUrl: BASE })

    expect(headersOf(mockFetch, 0)["X-MCP-TOOL"]).toBe("Email-Verifier")
    expect(headersOf(mockFetch, 1)).not.toHaveProperty("X-MCP-TOOL")
  })

  // An isolate serves concurrent requests; each must keep its own name across awaits.
  it("keeps concurrent scopes apart across an await", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    const call = (name: string, path: string, delayMs: number) =>
      withToolName(name, async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        return callHunterApi({ path, apiKey: "k", baseUrl: BASE })
      })

    await Promise.all([call("List-Leads", "/leads", 10), call("Get-Lead", "/leads/1", 0)])

    const toolByPath = Object.fromEntries(
      mockFetch.mock.calls.map(([url, opts]) => [new URL(String(url)).pathname, opts.headers["X-MCP-TOOL"]]),
    )
    expect(toolByPath).toEqual({ "/v2/leads": "List-Leads", "/v2/leads/1": "Get-Lead" })
  })
})

describe("X-MCP-TOOL through createServer", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function connectClient() {
    const server = createServer("test-api-key", BASE)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: "tool-name-header-test", version: "1.0.0" })
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
    return client
  }

  it("names a tool that takes no arguments", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse({ data: { plan_name: "Free" } }))
    vi.stubGlobal("fetch", mockFetch)
    const client = await connectClient()

    await client.callTool({ name: "Get-Account-Details", arguments: {} })

    expect(mockFetch).toHaveBeenCalled()
    expect(headersOf(mockFetch)["X-MCP-TOOL"]).toBe("Get-Account-Details")
  })

  // Only the name crosses: no argument may reach the header.
  it("names a tool that takes arguments, and sends none of them in the header", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse({ data: { status: "valid" } }))
    vi.stubGlobal("fetch", mockFetch)
    const client = await connectClient()

    await client.callTool({ name: "Email-Verifier", arguments: { email: "jane@example.com" } })

    expect(mockFetch).toHaveBeenCalled()
    expect(headersOf(mockFetch)["X-MCP-TOOL"]).toBe("Email-Verifier")
    expect(JSON.stringify(headersOf(mockFetch))).not.toContain("jane@example.com")
  })
})
