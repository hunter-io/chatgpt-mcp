import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  withDeepLink,
  DESTRUCTIVE_ANNOTATIONS,
  READ_ONLY_ANNOTATIONS,
  WRITE_ANNOTATIONS,
} from "../helpers"

export function registerCampaignTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    "List-Campaigns",
    {
      description:
        "List all campaigns in your Hunter account. Free (no credits). Campaigns must be created in the Hunter UI (https://hunter.io/campaigns/new) — the API can only list, add/remove recipients, and start.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      return callHunterApi({ path: "/campaigns", apiKey, baseUrl })
    },
  )

  server.registerTool(
    "List-Campaign-Recipients",
    {
      description: "List recipients in a campaign. Free (no credits).",
      inputSchema: {
        campaign_id: z.number().describe("ID of the campaign"),
        offset: z.number().optional().describe("Number of recipients to skip"),
        limit: z.number().optional().describe("Maximum number of recipients to return"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ campaign_id, offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({
        path: `/campaigns/${campaign_id}/recipients`,
        apiKey,
        baseUrl,
        params,
      })
    },
  )

  server.registerTool(
    "Add-Campaign-Recipients",
    {
      description:
        "Add recipients to a campaign by email addresses or lead IDs. Max 50 per request — batch larger lists. Free (no credits).",
      inputSchema: {
        campaign_id: z.number().describe("ID of the campaign"),
        emails: z.array(z.string()).optional().describe("Email addresses to add as recipients (max 50)"),
        lead_ids: z.array(z.number()).optional().describe("Lead IDs to add as recipients (max 50)"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ campaign_id, emails, lead_ids }) => {
      const params: Record<string, string | string[]> = {}
      if (emails) params.emails = emails
      if (lead_ids) params.lead_ids = lead_ids.map(String)
      const result = await callHunterApi({
        path: `/campaigns/${campaign_id}/recipients`,
        apiKey,
        baseUrl,
        method: "POST",
        params,
      })
      return withDeepLink(result, `/campaigns/${campaign_id}`)
    },
  )

  server.registerTool(
    "Remove-Campaign-Recipients",
    {
      description: "Remove recipients from a campaign by email addresses. Free (no credits).",
      inputSchema: {
        campaign_id: z.number().describe("ID of the campaign"),
        emails: z.array(z.string()).describe("Email addresses to remove from the campaign"),
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ campaign_id, emails }) => {
      const result = await callHunterApi({
        path: `/campaigns/${campaign_id}/recipients`,
        apiKey,
        baseUrl,
        method: "DELETE",
        params: { emails },
      })
      return withDeepLink(result, `/campaigns/${campaign_id}`)
    },
  )

  server.registerTool(
    "Start-Campaign",
    {
      description:
        "Start a campaign to begin sending emails. WARNING: This sends real emails to all recipients. The campaign must have a subject, message body, and connected email account configured in the Hunter UI. Free (no credits). Check campaign status with List-Campaigns.",
      inputSchema: {
        campaign_id: z.number().describe("ID of the campaign to start"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ campaign_id }) => {
      const result = await callHunterApi({
        path: `/campaigns/${campaign_id}/start`,
        apiKey,
        baseUrl,
        method: "POST",
      })
      return withDeepLink(result, `/campaigns/${campaign_id}`)
    },
  )
}
