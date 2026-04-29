import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  type McpTextResult,
  TOOL_NAMES,
  buildNextAction,
  callHunterApi,
  embedNextAction,
  parseHunterApiResponse,
  withDeepLink,
  DESTRUCTIVE_ANNOTATIONS,
  READ_ONLY_ANNOTATIONS,
  WRITE_ANNOTATIONS,
} from "../helpers"

interface RecipientsResponse {
  meta?: {
    count?: number
    results?: number
  }
}

interface StartCampaignResponse {
  data?: {
    message?: string
  }
}

// The Hunter Rails endpoint at /api/campaigns/:id/start short-circuits with
// HTTP 200 + data.message: "Sequence already started." when the campaign is
// already running (see app/app/controllers/api/campaigns/start_controller.rb).
// We surface this as isError in the MCP layer so the model doesn't treat a
// no-op as a fresh successful start.
const ALREADY_STARTED_MESSAGE = "Sequence already started."
const RECIPIENT_COUNT_TIMEOUT_MS = 2000

async function fetchRecipientCount(campaign_id: number, apiKey: string, baseUrl: string): Promise<number | null> {
  try {
    const result = await callHunterApi({
      path: `/campaigns/${campaign_id}/recipients`,
      apiKey,
      baseUrl,
      params: { limit: "1" },
      signal: AbortSignal.timeout(RECIPIENT_COUNT_TIMEOUT_MS),
    })
    if (result.isError) return null
    const response = parseHunterApiResponse<RecipientsResponse>(result)
    return response?.meta?.count ?? response?.meta?.results ?? null
  } catch {
    return null
  }
}

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
        "Start a campaign to begin sending emails. WARNING: This sends real emails to all recipients. The campaign must have a subject, message body, and connected email account configured in the Hunter UI. Free (no credits). CRITICAL: the first call returns nextAction.kind === 'ask_user' with a pendingToolCall — relay the question to the user and do NOT auto-confirm. Only re-issue this tool with confirmed: true after the user has explicitly approved sending real emails.",
      inputSchema: {
        campaign_id: z.number().describe("ID of the campaign to start"),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat that real emails should be sent. The first invocation (without confirmed) returns an ask_user nextAction; the second invocation (with confirmed: true) actually starts the campaign.",
          ),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ campaign_id, confirmed }) => {
      if (!confirmed) {
        // Hard gate: short-circuit and emit ask_user with pendingToolCall.
        // No POST to /start until the model re-issues with confirmed: true.
        const recipient_count = await fetchRecipientCount(campaign_id, apiKey, baseUrl)
        const recipientPhrase =
          recipient_count !== null
            ? `${recipient_count} recipient${recipient_count === 1 ? "" : "s"}`
            : "all configured recipients"
        const stub: McpTextResult = {
          content: [{ type: "text" as const, text: `Awaiting user confirmation to start campaign ${campaign_id}.` }],
        }
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `Confirm: start campaign ${campaign_id}? This will send real emails to ${recipientPhrase}. This action cannot be undone.`,
            pendingToolCall: {
              tool: TOOL_NAMES.startCampaign,
              args: { campaign_id, confirmed: true },
            },
          }),
        )
      }

      const result = await callHunterApi({
        path: `/campaigns/${campaign_id}/start`,
        apiKey,
        baseUrl,
        method: "POST",
      })
      if (result.isError) return result

      // Hunter Rails endpoint returns HTTP 200 with data.message:
      // "Sequence already started." when the campaign is already running.
      // Surface as isError so the model doesn't relay a no-op as success.
      const response = parseHunterApiResponse<StartCampaignResponse>(result)
      if (response?.data?.message === ALREADY_STARTED_MESSAGE) {
        return { ...result, isError: true }
      }

      return embedNextAction(
        withDeepLink(result, `/campaigns/${campaign_id}`),
        buildNextAction({
          kind: "complete",
          summary: `Campaign ${campaign_id} started.`,
        }),
      )
    },
  )
}
