import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  EXTERNAL_SIDE_EFFECT_ANNOTATIONS,
  type McpTextResult,
  PRIVATE_READ_ANNOTATIONS,
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

// Recipient PII categories are disclosed in the OpenAI dashboard data form.
// Schema uses Zod's default strip-on-parse behavior: any new field Hunter
// adds to recipients/index.jbuilder is silently dropped at parse time and
// never reaches the model. Adding a new recipient field to the surface
// requires a deliberate schema bump here + disclosure update.
const recipientSchema = z.object({
  email: z.string(),
  lead_id: z.number().int().positive().optional(),
  first_name: nullableString().optional(),
  last_name: nullableString().optional(),
  company: nullableString().optional(),
  // The recipients/index.jbuilder doesn't emit an `id` field, but accept it
  // optionally for forward-compat with future Hunter API revisions.
  id: z.union([z.number().int().positive(), z.string()]).optional(),
  status: z.string().optional(),
})

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
        "Use this when the user wants to list the campaigns in their Hunter account with name, status, and counts. Campaigns are created in the Hunter web UI; the API can list them, manage recipients, and start them. Free to call.",
      inputSchema: {},
      outputSchema: listCampaignsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async () => {
      return callHunterApi({ path: "/campaigns", apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.listCampaignRecipients,
    {
      description:
        "Use this when the user wants to list the recipients of a campaign with per-recipient status. Free to call.",
      inputSchema: {
        campaign_id: z.number().int().positive().describe("ID of the campaign"),
        offset: z.number().int().nonnegative().optional().describe("Number of recipients to skip"),
        limit: z.number().int().positive().max(100).optional().describe("Maximum number of recipients to return"),
      },
      outputSchema: listRecipientsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
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

  // Add-Campaign-Recipients uses WRITE_ANNOTATIONS (openWorldHint: true): for an
  // ALREADY-STARTED campaign, adding a recipient enqueues message creation
  // (Campaigns::CreateMessagesForRecipientJob — app/models/campaign/audience.rb)
  // so it can schedule real outbound email to external recipients WITHOUT a
  // separate Start-Campaign call. That externally-visible send is open-world, so
  // this is NOT a private-only staging write. (HUN-20797; Codex review on #13429)
  server.registerTool(
    TOOL_NAMES.addCampaignRecipients,
    {
      description:
        "Use this when the user wants to add recipients to an existing campaign by email address or by lead ID. Up to 50 per call; batch larger sets across multiple calls. For a draft (not-yet-started) campaign this only stages recipients and does not send email — use Start-Campaign to begin sending. For an ALREADY-STARTED campaign, adding a recipient can immediately schedule a real outbound email to that recipient (no separate Start-Campaign call). Free to call.",
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

  // Remove-Campaign-Recipients uses PRIVATE_DESTRUCTIVE_ANNOTATIONS
  // (destructiveHint: true, openWorldHint: false). The v2 DELETE handler calls
  // campaign.cancel_messages_to_recipients (app/models/campaign.rb) — this is
  // NOT blocked on started campaigns (the started-guard lives in the unused
  // remove_recipients path, app/models/campaign/audience.rb). It cancels the
  // recipient's PENDING (not-yet-sent) outbound messages and their future
  // pending follow-ups; already-sent messages are untouched. destructive: true
  // captures the lost queued progress. openWorld stays FALSE because canceling
  // an unsent message creates NO externally-visible artifact: the recipient was
  // never sent the email and still isn't, so nothing reaches the outside world.
  // This is the mirror of Add-Campaign-Recipients (open-world — it makes an
  // email arrive) and the same external-visibility posture as Pause-Sequence.
  // (HUN-20797; Cursor Bugbot review on #13429)
  server.registerTool(
    TOOL_NAMES.removeCampaignRecipients,
    {
      description:
        "Use this when the user wants to remove recipients from a campaign by email address. Pending messages scheduled for the removed recipients are cancelled; messages already sent are not recalled. Free to call.",
      inputSchema: {
        campaign_id: z.number().int().positive().describe("ID of the campaign"),
        emails: z
          .array(z.string().email().max(254))
          .min(1)
          .max(50)
          .describe("Email addresses to remove from the campaign"),
      },
      outputSchema: removeRecipientsOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
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
        "Use this when the user wants to start an existing campaign, which begins sending real emails to its recipients. The campaign must have a subject, message body, and connected email account configured in the Hunter UI. Free to call. Starting a campaign sends real emails to recipients and requires an explicit user confirmation: the first call returns a confirmation prompt without sending, and only re-issuing with `confirmed: true` actually starts the campaign.",
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
