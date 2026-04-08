import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { callHunterApi, READ_ONLY_ANNOTATIONS } from "../helpers"

export function registerAccountTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    "Account",
    {
      description:
        "Get your Hunter account details: remaining credits (search, verification, enrichment), plan name, and team info. Free (no credits). Use to check remaining credits before running bulk operations.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      return callHunterApi({ path: "/account", apiKey, baseUrl })
    },
  )
}
