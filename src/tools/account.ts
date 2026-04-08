import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { callHunterApi, READ_ONLY_ANNOTATIONS } from "../helpers"

export function registerAccountTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    "Account",
    {
      description: "Get information about the Hunter account (usage, credits, plan details)",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      return callHunterApi({ path: "/account", apiKey, baseUrl })
    },
  )
}
