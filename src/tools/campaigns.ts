import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  DESTRUCTIVE_ANNOTATIONS,
  EXTERNAL_SIDE_EFFECT_ANNOTATIONS,
  type McpTextResult,
  READ_ONLY_ANNOTATIONS,
  TOOL_NAMES,
  WRITE_ANNOTATIONS,
  buildNextAction,
  callHunterApi,
  embedNextAction,
  parseHunterApiResponse,
  withDeepLink,
} from "../helpers"
import { buildResponseSchema, nullableString, paginationMetaSchema } from "../schemas/common"

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
// 1500ms cap — the recipient-count fetch lives on the Start-Campaign
// confirmation critical path. Hunter's /recipients endpoint should respond in
// <500ms in practice; if it doesn't, we fall back to "all configured recipients".
// `Promise.all`-style parallelism doesn't help here: stub assembly is
// synchronous (microseconds) and the count is the only async dependency, so
// there's nothing to overlap. See HUN-19943 todos/020.
const RECIPIENT_COUNT_TIMEOUT_MS = 1500

// Hunter campaign + recipient shapes. .loose() at envelope level via
// buildResponseSchema; leaves are strict so jbuilder typos surface in vitest.
const campaignSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    // The jbuilder emits booleans, not a single status field. Keep all optional
    // to tolerate small jbuilder additions, and add a derived `status` only if
    // the upstream ever adds it.
    started: z.boolean().optional(),
    archived: z.boolean().optional(),
    paused: z.boolean().optional(),
    sending_status: nullableString().optional(),
    emails_count: z.number().int().nonnegative().optional(),
    recipients_count: z.number().int().nonnegative().optional(),
    created_at: z.string().optional(),
    status: z.string().optional(), // future-proof if upstream ever adds it
  })
  .loose()

const recipientSchema = z
  .object({
    email: z.string(),
    lead_id: z.number().int().positive().optional(),
    first_name: nullableString().optional(),
    last_name: nullableString().optional(),
    company: nullableString().optional(),
    // The recipients/index.jbuilder doesn't emit an `id` field, but accept it
    // optionally for forward-compat.
    id: z.union([z.number().int().positive(), z.string()]).optional(),
    status: z.string().optional(),
  })
  .loose()

const listCampaignsDataSchema = z.object({ campaigns: z.array(campaignSchema) }).loose()
const listRecipientsDataSchema = z.object({ recipients: z.array(recipientSchema) }).loose()

const listCampaignsOutputSchema = buildResponseSchema(listCampaignsDataSchema, paginationMetaSchema)
const listRecipientsOutputSchema = buildResponseSchema(listRecipientsDataSchema, paginationMetaSchema)
const addRecipientsOutputSchema = buildResponseSchema(
  z
    .object({
      recipients_added: z.number().int().nonnegative().optional(),
      skipped_recipients: z.array(z.unknown()).optional(),
      // Forward-compat / older API shape:
      recipients: z.array(recipientSchema).optional(),
      emails_added: z.number().int().nonnegative().optional(),
    })
    .loose(),
)
// Hunter Rails (`app/views/api/campaigns/recipients/destroy.jbuilder`) emits
// `{ data: { recipients_canceled: [...emails], messages_canceled: <count> } }`
// — there is no `emails_removed` field. The previous schema declared a
// fictional field that would have been advertised in the JSON Schema and
// always resolved to `undefined` against real payloads (silent misdirection).
const removeRecipientsOutputSchema = buildResponseSchema(
  z
    .object({
      recipients_canceled: z.array(z.string()).optional(),
      messages_canceled: z.number().int().nonnegative().optional(),
    })
    .loose(),
)
const startCampaignOutputSchema = buildResponseSchema(
  z
    .object({
      id: z.number().int().positive().optional(),
      status: z.string().optional(),
      message: z.string().optional(),
    })
    .loose(),
)

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
    TOOL_NAMES.listCampaigns,
    {
      description:
        "List all campaigns in your Hunter account. Free (no credits). Campaigns must be created in the Hunter UI (https://hunter.io/campaigns/new) — the API can only list, add/remove recipients, and start.",
      inputSchema: {},
      outputSchema: listCampaignsOutputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      return callHunterApi({ path: "/campaigns", apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.listCampaignRecipients,
    {
      description: "List recipients in a campaign. Free (no credits).",
      inputSchema: {
        campaign_id: z.number().int().positive().describe("ID of the campaign"),
        offset: z.number().int().nonnegative().optional().describe("Number of recipients to skip"),
        limit: z.number().int().positive().max(100).optional().describe("Maximum number of recipients to return"),
      },
      outputSchema: listRecipientsOutputSchema.shape,
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
    TOOL_NAMES.addCampaignRecipients,
    {
      description:
        "Add recipients to a campaign by email addresses or lead IDs. Max 50 per request — batch larger lists. Free (no credits).",
      inputSchema: {
        campaign_id: z.number().int().positive().describe("ID of the campaign"),
        emails: z
          .array(z.string().email().max(254))
          .max(50)
          .optional()
          .describe("Email addresses to add as recipients (max 50)"),
        lead_ids: z
          .array(z.number().int().positive())
          .max(50)
          .optional()
          .describe("Lead IDs to add as recipients (max 50)"),
      },
      outputSchema: addRecipientsOutputSchema.shape,
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
    TOOL_NAMES.removeCampaignRecipients,
    {
      description: "Remove recipients from a campaign by email addresses. Free (no credits).",
      inputSchema: {
        campaign_id: z.number().int().positive().describe("ID of the campaign"),
        emails: z
          .array(z.string().email().max(254))
          .min(1)
          .max(50)
          .describe("Email addresses to remove from the campaign"),
      },
      outputSchema: removeRecipientsOutputSchema.shape,
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
    TOOL_NAMES.startCampaign,
    {
      description:
        "Start a campaign to begin sending emails. WARNING: This sends real emails to all recipients. The campaign must have a subject, message body, and connected email account configured in the Hunter UI. Free (no credits). CRITICAL: the first call returns nextAction.kind === 'ask_user' with a pendingToolCall — relay the question to the user and do NOT auto-confirm. Only re-issue this tool with confirmed: true after the user has explicitly approved sending real emails.",
      inputSchema: {
        campaign_id: z.number().int().positive().describe("ID of the campaign to start"),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat that real emails should be sent. The first invocation (without confirmed) returns an ask_user nextAction; the second invocation (with confirmed: true) actually starts the campaign.",
          ),
      },
      outputSchema: startCampaignOutputSchema.shape,
      annotations: EXTERNAL_SIDE_EFFECT_ANNOTATIONS,
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
          content: [
            {
              type: "text" as const,
              text: `Awaiting user confirmation to start campaign ${campaign_id}.`,
              annotations: { audience: ["user"] },
            },
          ],
          structuredContent: {
            data: { id: campaign_id, status: "awaiting_confirmation" },
          },
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
