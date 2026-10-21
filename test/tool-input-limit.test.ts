import { afterEach, describe, expect, it, vi } from "vitest"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import worker, { MAX_REQUEST_BODY_BYTES, MAX_TOOL_INPUT_ELEMENTS, createServer } from "../src/index"

// Drives the real McpServer (no SDK mock) so the element cap is exercised in
// the SDK's own tools/call validation (GHSA-46jr-4wx8-v453).

async function connectClient() {
  const server = createServer("test-api-key", "https://api.hunter.io/v2")
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: "tool-input-limit-test", version: "1.0.0" })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  return client
}

describe("tools/call input element cap", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejects arguments with more elements than MAX_TOOL_INPUT_ELEMENTS before the handler runs", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const client = await connectClient()

    const result = await client.callTool({
      name: "Email-Count",
      arguments: { domain: "stripe.com", padding: Array.from({ length: 10_001 }, () => 0) },
    })

    expect(MAX_TOOL_INPUT_ELEMENTS).toBe(10_000)
    expect(result.isError).toBe(true)
    expect((result.content as { text: string }[])[0].text).toContain("more than the maximum of 10000 elements")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("accepts the largest legitimate input, a 100-id bulk selection", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const client = await connectClient()

    // Unconfirmed, the tool answers with a confirmation prompt and makes no API call.
    const result = await client.callTool({
      name: "Bulk-Move-Leads",
      arguments: {
        leads_list_id: 1,
        target_leads_list_id: 2,
        lead_ids: Array.from({ length: 100 }, (_, i) => i + 1),
      },
    })

    expect(result.isError).not.toBe(true)
    expect(JSON.stringify(result.structuredContent)).toContain("up to 100 leads")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("/mcp request body cap", () => {
  const env = {} as Env
  const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext

  // Keyless, like ChatGPT's discovery calls: the cap has to hold before any auth.
  function keylessToolCall(domain: string): Request {
    return new Request("https://chatgpt.hunter.io/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "Email-Count", arguments: { domain } },
      }),
    })
  }

  it("answers 413 for a body over MAX_REQUEST_BODY_BYTES", async () => {
    const response = await worker.fetch(keylessToolCall("a".repeat(MAX_REQUEST_BODY_BYTES)), env, ctx)

    expect(response.status).toBe(413)
  })

  it("still serves a body just under the limit", async () => {
    // The oversized domain fails the tool's own schema, which is a tool result, not a transport refusal.
    const response = await worker.fetch(keylessToolCall("a".repeat(MAX_REQUEST_BODY_BYTES - 1_000)), env, ctx)

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('"isError":true')
  })
})
