import { describe, expect, it, vi } from "vitest"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js"
import { createServer } from "../src/index"
import { stripDialectOnSend } from "../src/schema-dialect"

// Unlike test/tools.test.ts, this suite does NOT mock the MCP SDK. It drives the
// real McpServer over a real transport and asserts on the JSON Schema the SDK
// actually emits. That distinction is the point: the existing suites capture the
// raw ZodRawShape handed to `registerTool`, and model the published schema with
// `publishedOutputSchema = z.object(shape).strict()` — a reconstruction. HUN-20460
// was a bug that reconstruction hid, because the real SDK re-wraps `.shape` and
// drops `.loose()`. A `$schema` assertion against a reconstruction would be
// vacuous, so this file reads the emitted payload instead (HUN-22545).

const DRAFT_07 = "http://json-schema.org/draft-07/schema#"

async function listTools(options: { strip: boolean }) {
  const onError = vi.fn()
  const server = createServer("test-api-key", "https://api.hunter.io/v2")
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  if (options.strip) stripDialectOnSend(serverTransport, onError)

  const client = new Client({ name: "schema-dialect-test", version: "1.0.0" })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

  const result = await client.request({ method: "tools/list", params: {} }, ListToolsResultSchema)
  // A strip failure would otherwise surface as a confusing count mismatch.
  expect(onError).not.toHaveBeenCalled()
  return result
}

function countSchemaKeys(node: unknown): number {
  if (Array.isArray(node)) return node.reduce<number>((total, item) => total + countSchemaKeys(item), 0)
  if (node === null || typeof node !== "object") return 0

  return Object.entries(node as Record<string, unknown>).reduce(
    (total, [key, value]) => total + (key === "$schema" ? 1 : 0) + countSchemaKeys(value),
    0,
  )
}

// Keywords that are valid in draft-07 but NOT in JSON Schema 2020-12, or that
// changed meaning. Removing the declaration leaves the bodies described by the
// protocol's 2020-12 default, so a body must never rely on one of these.
function findDraft07OnlyConstructs(node: unknown, path = ""): string[] {
  if (Array.isArray(node)) return node.flatMap((item, i) => findDraft07OnlyConstructs(item, `${path}/${i}`))
  if (node === null || typeof node !== "object") return []

  const entries = Object.entries(node as Record<string, unknown>)
  const found: string[] = []
  for (const [key, value] of entries) {
    const here = `${path}/${key}`
    if (key === "items" && Array.isArray(value)) found.push(`${here} (tuple-form items)`)
    if (key === "definitions" || key === "dependencies" || key === "additionalItems") found.push(here)
    if ((key === "exclusiveMinimum" || key === "exclusiveMaximum") && typeof value === "boolean") found.push(here)
    if (key === "$ref" && entries.length > 1) found.push(`${here} (siblings alongside $ref)`)
    found.push(...findDraft07OnlyConstructs(value, here))
  }
  return found
}

describe("tools/list dialect declaration", () => {
  it("the SDK declares draft-07 at each schema root and nowhere else", async () => {
    // This is the licence for a root-only strip. If the SDK ever emits `$schema`
    // below a root, or stops emitting it, this fails and the design is revisited.
    const raw = await listTools({ strip: false })

    expect(raw.tools.length).toBeGreaterThan(50)
    for (const tool of raw.tools) {
      expect(tool.inputSchema.$schema).toBe(DRAFT_07)
      expect(tool.outputSchema?.$schema).toBe(DRAFT_07)
    }
    // Two roots per tool accounts for every occurrence, so none is nested.
    expect(countSchemaKeys(raw)).toBe(raw.tools.length * 2)
  })

  it("removes the declaration and changes nothing else", async () => {
    const [stripped, raw] = await Promise.all([listTools({ strip: true }), listTools({ strip: false })])

    expect(countSchemaKeys(stripped)).toBe(0)

    // Oracle built by TEXTUAL removal, independent of the code under test — a
    // shared helper would hide an over-broad strip instead of catching it.
    const oracle = JSON.parse(
      JSON.stringify(raw).replaceAll(`"$schema":"${DRAFT_07}",`, "").replaceAll(`,"$schema":"${DRAFT_07}"`, ""),
    )
    expect(stripped).toEqual(oracle)
  })

  it("publishes bodies that are valid JSON Schema 2020-12", async () => {
    // Removing the declaration means the bodies are described by the protocol's
    // 2020-12 default. Nothing else pins that, so pin it here: a future z.tuple()
    // would emit array-form `items` and silently misdescribe the contract.
    const stripped = await listTools({ strip: true })

    const offenders = stripped.tools.flatMap((tool) => [
      ...findDraft07OnlyConstructs(tool.inputSchema, `${tool.name}.inputSchema`),
      ...findDraft07OnlyConstructs(tool.outputSchema, `${tool.name}.outputSchema`),
    ])
    expect(offenders).toEqual([])
  })
})

describe("stripDialectOnSend", () => {
  function fakeTransport() {
    const sent: { message: unknown; options: unknown }[] = []
    const transport = { send: async (message: unknown, options?: unknown) => void sent.push({ message, options }) }
    return { transport, sent }
  }

  it("forwards a tool result by identity", async () => {
    // Tool results carry user data and no tool schema. They must not be copied.
    const { transport, sent } = fakeTransport()
    stripDialectOnSend(transport as never, () => {})
    const message = { result: { content: [{ type: "text", text: "ok" }], structuredContent: { $schema: "kept" } } }

    await (transport as { send: (m: unknown) => Promise<void> }).send(message)

    expect(sent[0].message).toBe(message)
  })

  it("forwards a message with no result by identity", async () => {
    const { transport, sent } = fakeTransport()
    stripDialectOnSend(transport as never, () => {})
    const notification = { method: "notifications/tools/list_changed" }

    await (transport as { send: (m: unknown) => Promise<void> }).send(notification)

    expect(sent[0].message).toBe(notification)
  })

  it("forwards send options unchanged", async () => {
    // `relatedRequestId` routes a notification to its per-request SSE stream.
    // Dropping it sends the notification to a standalone stream that a stateless
    // worker never opens, and it vanishes with no error.
    const { transport, sent } = fakeTransport()
    stripDialectOnSend(transport as never, () => {})
    const notification = { method: "notifications/message", params: {} }

    await (transport as { send: (m: unknown, o?: unknown) => Promise<void> }).send(notification, {
      relatedRequestId: 7,
    })

    expect(sent[0].options).toEqual({ relatedRequestId: 7 })
  })

  it("reports and forwards the raw message when the strip throws", async () => {
    const { transport, sent } = fakeTransport()
    const onError = vi.fn()
    stripDialectOnSend(transport as never, onError)

    const exploding = {
      result: {
        get tools() {
          throw new Error("boom")
        },
      },
    }
    await (transport as { send: (m: unknown) => Promise<void> }).send(exploding)

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(sent[0].message).toBe(exploding)
  })

  it("still forwards when the error reporter itself throws", async () => {
    // A throw escaping the wrapper rejects `send`, which the SDK only funnels
    // into `_onerror` — the response is never written and the SSE stream hangs.
    const { transport, sent } = fakeTransport()
    const onError = vi.fn(() => {
      throw new Error("sentry is down")
    })
    stripDialectOnSend(transport as never, onError)

    const exploding = {
      result: {
        get tools() {
          throw new Error("boom")
        },
      },
    }
    const sending = (transport as { send: (m: unknown) => Promise<void> }).send(exploding)
    await expect(sending).resolves.toBeUndefined()

    expect(onError).toHaveBeenCalledOnce()
    expect(sent[0].message).toBe(exploding)
  })
})
