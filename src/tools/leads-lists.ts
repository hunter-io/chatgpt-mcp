import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  withDeepLink,
  withDeepLinkFromId,
  DESTRUCTIVE_ANNOTATIONS,
  READ_ONLY_ANNOTATIONS,
  WRITE_ANNOTATIONS,
} from "../helpers"

export function registerLeadsListTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    "List-Leads-Lists",
    {
      description: "List all leads lists in your Hunter account. Free (no credits).",
      inputSchema: {
        offset: z.number().optional().describe("Number of lists to skip"),
        limit: z.number().optional().describe("Maximum number of lists to return"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: "/leads_lists", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    "Get-Leads-List",
    {
      description: "Get a single leads list by ID. Free (no credits).",
      inputSchema: {
        id: z.number().describe("ID of the leads list to retrieve"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads_lists/${id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    "Create-Leads-List",
    {
      description: "Create a new leads list. Free (no credits).",
      inputSchema: {
        name: z.string().describe("Name of the new leads list"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ name }) => {
      const result = await callHunterApi({
        path: "/leads_lists",
        apiKey,
        baseUrl,
        method: "POST",
        params: { name },
      })
      return withDeepLinkFromId(result, (id) => `/leads?leads_list_id=${id}`)
    },
  )

  server.registerTool(
    "Update-Leads-List",
    {
      description: "Rename an existing leads list. Free (no credits).",
      inputSchema: {
        id: z.number().describe("ID of the leads list to update"),
        name: z.string().describe("New name for the leads list"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ id, name }) => {
      const result = await callHunterApi({
        path: `/leads_lists/${id}`,
        apiKey,
        baseUrl,
        method: "PUT",
        params: { name },
      })
      return withDeepLink(result, `/leads?leads_list_id=${id}`)
    },
  )

  server.registerTool(
    "Delete-Leads-List",
    {
      description: "Delete a leads list by ID. Free (no credits).",
      inputSchema: {
        id: z.number().describe("ID of the leads list to delete"),
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads_lists/${id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    "Merge-Leads-Lists",
    {
      description:
        "Merge one leads list into another. All leads from the source list are moved to the destination list, and the source list is deleted. Free (no credits).",
      inputSchema: {
        id: z.number().describe("ID of the source leads list (will be merged and deleted)"),
        destination_leads_list_id: z
          .number()
          .describe("ID of the destination leads list (will receive all leads and be kept)"),
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id, destination_leads_list_id }) => {
      const result = await callHunterApi({
        path: `/leads_lists/${id}/merge`,
        apiKey,
        baseUrl,
        method: "POST",
        params: { destination_leads_list_id: String(destination_leads_list_id) },
      })
      return withDeepLink(result, `/leads?leads_list_id=${destination_leads_list_id}`)
    },
  )
}
