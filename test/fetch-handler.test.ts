import { beforeEach, describe, expect, it, vi } from "vitest"

// chatgpt-mcp is a stateless Streamable HTTP MCP worker. We mock the SDK
// server/transport so this unit test stays focused on the fetch handler's
// method routing — specifically that GET /mcp is answered with 405 instead of
// opening a standalone SSE stream that is never written or closed and which
// the Workers runtime then cancels ("your Worker's code had hung and would
// never generate a response"). Mirrors remote-mcp/test/fetch-handler.test.ts.
// (vitest hoists vi.mock factories, so anything they close over must be
// `mock`-prefixed.)
const mockHandleRequest = vi.fn()
const mockTransportCtor = vi.fn()
// The handler wraps `transport.send` to strip the SDK's draft-07 `$schema`
// (HUN-22545), so the stand-in must carry a `send` like a real Transport does.
const mockSend = vi.fn()
const mockTransportInstances: { send: (message: unknown, options?: unknown) => Promise<void> }[] = []

// Permissive McpServer mock: createServer registers many tools/resources, so
// any method is a no-op and connect resolves. We only care about routing here.
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    constructor() {
      return new Proxy(this, {
        get: (_target, prop) => (prop === "connect" ? async () => {} : () => {}),
      })
    }
  },
}))

vi.mock("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js", () => ({
  WebStandardStreamableHTTPServerTransport: class MockTransport {
    handleRequest = mockHandleRequest
    send = mockSend
    constructor(opts: unknown) {
      mockTransportCtor(opts)
      mockTransportInstances.push(this as unknown as { send: (message: unknown, options?: unknown) => Promise<void> })
    }
  },
}))

// Import after mocks are in place
const { default: worker } = await import("../src/index")

const env = {} as Env
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext

function mcpRequest(method: string, headers: Record<string, string> = {}): Request {
  return new Request("https://chatgpt.hunter.io/mcp", { method, headers })
}

describe("fetch handler /mcp method handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHandleRequest.mockResolvedValue(new Response("mcp ok", { status: 200 }))
  })

  it("returns 405 for GET /mcp instead of opening a dead SSE stream", async () => {
    // Unlike remote-mcp, this server allows keyless discovery, so a keyless GET
    // would otherwise reach the transport and hang — hence the 405 is answered
    // before auth.
    const res = await worker.fetch(mcpRequest("GET", { origin: "https://chatgpt.com" }), env, ctx)

    expect(res.status).toBe(405)
    expect(res.headers.get("Allow")).toBe("POST")
    // CORS is still applied to the rejection (allowed origin reflected).
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://chatgpt.com")
    // GET must never reach the transport — that is what hangs.
    expect(mockTransportCtor).not.toHaveBeenCalled()
    expect(mockHandleRequest).not.toHaveBeenCalled()
  })

  it("still routes POST /mcp to the stateless transport", async () => {
    const res = await worker.fetch(mcpRequest("POST", { origin: "https://chatgpt.com" }), env, ctx)

    expect(mockTransportCtor).toHaveBeenCalledWith({ sessionIdGenerator: undefined })
    expect(mockHandleRequest).toHaveBeenCalled()
    expect(await res.text()).toBe("mcp ok")
  })

  it("installs the dialect strip on the transport it serves /mcp with", async () => {
    // Proves the wiring, not the walker: schema-dialect.test.ts covers the strip
    // itself against real SDK output. Without this, deleting the
    // stripDialectOnSend call from src/index.ts leaves the whole suite green
    // and the fix becomes dead code on this worker (HUN-22545).
    mockTransportInstances.length = 0
    await worker.fetch(mcpRequest("POST", { origin: "https://chatgpt.com" }), env, ctx)

    const transport = mockTransportInstances.at(-1)
    expect(transport).toBeDefined()

    // Real options, not `undefined`: asserting against `undefined` would pin
    // arity only and pass even if the wrapper dropped `options` entirely.
    await transport?.send(
      { result: { tools: [{ name: "T", inputSchema: { $schema: "draft-07", type: "object" } }] } },
      { relatedRequestId: 7 },
    )

    expect(mockSend).toHaveBeenCalledWith(
      { result: { tools: [{ name: "T", inputSchema: { type: "object" } }] } },
      { relatedRequestId: 7 },
    )
  })
})
