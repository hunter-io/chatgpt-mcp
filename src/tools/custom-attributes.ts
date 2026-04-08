import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { callHunterApi, DESTRUCTIVE_ANNOTATIONS, READ_ONLY_ANNOTATIONS, WRITE_ANNOTATIONS } from "../helpers"

export function registerCustomAttributeTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    "List-Custom-Attributes",
    {
      description: "List all custom attributes for leads",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      return callHunterApi({ path: "/leads_custom_attributes", apiKey, baseUrl })
    },
  )

  server.registerTool(
    "Get-Custom-Attribute",
    {
      description: "Get a single custom attribute by ID",
      inputSchema: {
        id: z.number().describe("ID of the custom attribute to retrieve"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads_custom_attributes/${id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    "Create-Custom-Attribute",
    {
      description: "Create a new custom attribute for leads",
      inputSchema: {
        label: z.string().describe("Label for the new custom attribute"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ label }) => {
      return callHunterApi({
        path: "/leads_custom_attributes",
        apiKey,
        baseUrl,
        method: "POST",
        params: { label },
      })
    },
  )

  server.registerTool(
    "Update-Custom-Attribute",
    {
      description: "Rename an existing custom attribute",
      inputSchema: {
        id: z.number().describe("ID of the custom attribute to update"),
        label: z.string().describe("New label for the custom attribute"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ id, label }) => {
      return callHunterApi({
        path: `/leads_custom_attributes/${id}`,
        apiKey,
        baseUrl,
        method: "PUT",
        params: { label },
      })
    },
  )

  server.registerTool(
    "Delete-Custom-Attribute",
    {
      description: "Delete a custom attribute by ID",
      inputSchema: {
        id: z.number().describe("ID of the custom attribute to delete"),
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({
        path: `/leads_custom_attributes/${id}`,
        apiKey,
        baseUrl,
        method: "DELETE",
      })
    },
  )
}
