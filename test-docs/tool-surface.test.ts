import { describe, expect, it } from "vitest"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js"
import { createServer } from "../src/index"

// Records the tool surface this server publishes in docs/tool-surface.json,
// the input of scripts/render-mcp-docs.mjs for the ChatGPT README table. A tool
// change fails here until `pnpm run docs:update` rewrites the file. It only
// reads tools/list: editing a description here would start an OpenAI re-scan.

async function listTools() {
  const server = createServer("test-api-key", "https://api.hunter.io/v2")
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: "tool-surface-docs", version: "1.0.0" })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  const { tools } = await client.request({ method: "tools/list", params: {} }, ListToolsResultSchema)
  return tools
}

describe("published tool surface", () => {
  it("matches docs/tool-surface.json", async () => {
    const rows = (await listTools())
      .map((tool) => ({
        name: tool.name,
        title: tool.title ?? tool.annotations?.title ?? null,
        readOnlyHint: tool.annotations?.readOnlyHint ?? null,
        destructiveHint: tool.annotations?.destructiveHint ?? null,
      }))
      .toSorted((a, b) => a.name.localeCompare(b.name))

    await expect(`${JSON.stringify({ server: "chatgpt-mcp", tools: rows }, null, 2)}\n`).toMatchFileSnapshot(
      "../docs/tool-surface.json",
    )
  })
})
