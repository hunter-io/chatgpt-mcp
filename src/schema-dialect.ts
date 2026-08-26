import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"

// The MCP SDK stamps `"$schema": "http://json-schema.org/draft-07/schema#"` onto
// every tool schema it publishes. `server/mcp.js` builds `inputSchema` and
// `outputSchema` through `toJsonSchemaCompat` without a `target`, and
// `server/zod-json-schema-compat.js` maps an absent target to `'draft-7'`.
// `registerTool` exposes no option to change it, and SDK 1.30.0 keeps the same
// default, so an upgrade does not correct it.
//
// That declaration contradicts the protocol. The SDK's own `ToolSchema`
// describes `inputSchema` as "A JSON Schema 2020-12 object" and `outputSchema`
// likewise, so an ABSENT `$schema` resolves to 2020-12 by contract rather than
// by client guesswork. Our bodies are already valid 2020-12 — a test pins that
// — which makes the declaration the only part that disagrees.
//
// Remove it rather than rewrite it to 2020-12. The reference MCP client
// validator is `import Ajv from 'ajv'` (`validation/ajv-provider.js`) — the
// draft-07 build, not `Ajv2020`. A 2020-12 declaration would therefore break
// the SDK's own default consumer class, which is a concrete population rather
// than a hypothetical one. Declaring nothing breaks neither side.
//
// Root-only is enough, and it is structural rather than incidental. zod assigns
// `$schema` exactly once, onto a fresh `result` object, AFTER the schema tree is
// built (`zod/v4/core/to-json-schema.js`), then `Object.assign`s the body over
// it. `$defs` entries are filled afterwards and never receive one. It is a
// document-level key by construction, so a recursive walk could only ever find
// the two keys below — while risking silent corruption of `const`/`default`/
// `examples` values, `__proto__`-named properties, and any name-keyed keyword
// the walk forgot. schema-dialect.test.ts pins the root-only invariant.
//
// CAUTION (HUN-22545): this was never shown to correct the reported Claude
// Desktop fault. Production serves these draft-07 schemas to ~300 users a day,
// and live `Domain-Search` and `Email-Verifier` responses validate against their
// own declared `outputSchema` under every validator tested. Spec hygiene, not
// that bug's cure.

type ToolListMessage = { result?: { tools?: unknown } }

/** Return `schema` without its dialect declaration, or unchanged if it has none. */
function omitDialect(schema: unknown): unknown {
  if (schema === null || typeof schema !== "object" || !("$schema" in schema)) return schema

  const { $schema: _dialect, ...body } = schema as Record<string, unknown>
  return body
}

/** Copy a published tool, dropping the dialect declaration from both schemas. */
function withoutDialect(tool: unknown): unknown {
  if (tool === null || typeof tool !== "object") return tool

  const next: Record<string, unknown> = { ...(tool as Record<string, unknown>) }
  // `in` rather than truthiness: never introduce a key the SDK did not publish.
  if ("inputSchema" in next) next.inputSchema = omitDialect(next.inputSchema)
  if ("outputSchema" in next) next.outputSchema = omitDialect(next.outputSchema)
  return next
}

/**
 * Report a strip failure without ever letting the report itself break the send.
 *
 * A throw escaping here rejects `transport.send`, and the SDK only funnels that
 * into `_onerror` (`shared/protocol.js`) — the JSON-RPC response is never
 * written, so `stream.cleanup()` never runs and the client hangs on an open,
 * empty event-stream until its own timeout.
 */
function report(onError: (error: Error) => void, cause: unknown): void {
  try {
    onError(cause instanceof Error ? cause : new Error(String(cause)))
  } catch {
    // Intentionally empty — see above. HUN-20813 forbids swallowing silently,
    // and the `onError` call above is the reporting path; this guards only the
    // reporter's own failure, which has nowhere left to go.
  }
}

/**
 * Wrap `transport.send` so `tools/list` publishes no dialect declaration.
 *
 * Only `inputSchema` and `outputSchema` are rewritten. Every other message — a
 * tool result, an error, a notification — is forwarded by identity, so no user
 * data is ever copied or inspected.
 *
 * On failure the raw message is forwarded and the error is reported. Failing
 * loudly would not surface an error to the caller; it would hang the stream
 * (see `report`). The strip is cosmetic, so degrading to today's production
 * output is strictly better.
 */
export function stripDialectOnSend(transport: Transport, onError: (error: Error) => void): void {
  const send = transport.send.bind(transport)

  transport.send = async (message, options) => {
    // No `await` before `send(...)`: the body must run synchronously through to
    // the delegate so that interleaved messages keep their issue order on the
    // SSE stream. Adding an await above the call would introduce a microtask
    // gap and could reorder events.
    try {
      const result = (message as ToolListMessage).result
      const tools = result?.tools
      if (Array.isArray(tools)) {
        const stripped = { ...message, result: { ...result, tools: tools.map(withoutDialect) } }
        return send(stripped as typeof message, options)
      }
    } catch (error) {
      report(onError, error)
    }
    return send(message, options)
  }
}
