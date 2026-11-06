import { AsyncLocalStorage } from "node:async_hooks"
import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js"

// Carries the name of the MCP tool being run down to `callHunterApi`, which
// forwards it to Rails as `X-MCP-TOOL`. Rails clamps it to a closed list
// (`Mcp::Tool` in app/) before it becomes a PostHog property, for the same
// reason client-context.ts leaves the User-Agent mapping to Rails: a caller can
// send the header straight to api.hunter.io, so only Rails can bound it.
//
// Only the name crosses. Tool arguments and results never do.
//
// AsyncLocalStorage for the reason given in client-context.ts: an isolate
// serves concurrent requests, so a module-level variable would cross-attribute.

const toolNameStorage = new AsyncLocalStorage<string>()

type ToolHandler = (...args: unknown[]) => unknown
type RegisterTool = (name: string, config: unknown, handler: ToolHandler) => RegisteredTool

// Public: run `fn` with `name` as the ambient tool name.
export function withToolName<T>(name: string, fn: () => T): T {
  return toolNameStorage.run(name, fn)
}

// Public: the ambient tool name, or undefined outside a tool handler.
export function currentToolName(): string | undefined {
  return toolNameStorage.getStore()
}

// Public: make every tool registered on `server` from now on run its handler
// inside a scope named after the tool. Call it before the first registerTool,
// so that one wrapper covers every tool, including ones added later.
//
// The wrapper forwards all arguments: the SDK calls a handler as
// `handler(args, extra)` when the tool has an input schema, and as
// `handler(extra)` when it has none.
export function scopeToolHandlers(server: McpServer): void {
  const registerTool = server.registerTool.bind(server) as RegisterTool
  const scoped: RegisterTool = (name, config, handler) =>
    registerTool(name, config, (...args) => withToolName(name, () => handler(...args)))
  server.registerTool = scoped as McpServer["registerTool"]
}
