import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  buildNextAction,
  callHunterApi,
  embedNextAction,
  HUNTER_SOURCE_SUFFIX,
  type McpTextResult,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  sanitizeUpstreamMessage,
  TOOL_NAMES,
  WRITE_ANNOTATIONS,
  withDeepLink,
} from "../helpers"
import { buildResponseSchema, paginationMetaSchema } from "../schemas/common"

// Mirror of app/app/models/integrations/admin/mcp/tool_helpers.rb#mask_url_path,
// the repo's existing precedent for webhook target_url redaction. Zapier-style
// webhooks embed a reusable secret in the URL PATH
// (https://hooks.zapier.com/hooks/catch/<id>/<SECRET>/), so passing the raw
// target_url through the MCP would leak that credential into the model/transcript
// for any account with such a webhook. The admin registry
// (integrations/admin/mcp/registry.rb) already flags `target_url` for this exact
// treatment via `redact_url_path`; the Ruby helper keeps `scheme://host` and
// replaces everything after with `/[REDACTED]`, falling back to `[REDACTED_URL]`
// when the value is unparseable or missing a scheme/host. These two markers keep
// the MCP output byte-for-byte consistent with the admin tool.
const REDACTED_URL_PATH = "[REDACTED]"
const REDACTED_URL = "[REDACTED_URL]"

// Ruby's URI#host excludes the port, so we use URL#hostname (also port-less) to
// reproduce the admin helper's `scheme://host/[REDACTED]` shape exactly.
function maskWebhookUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return REDACTED_URL
  }
  // A missing scheme or host makes the value undebuggable AND unsafe to echo —
  // the admin helper returns the full-redaction marker in that case.
  if (parsed.protocol === "" || parsed.hostname === "") return REDACTED_URL
  const scheme = parsed.protocol.replace(/:$/, "")
  return `${scheme}://${parsed.hostname}/${REDACTED_URL_PATH}`
}

// Redacts the secret-bearing `target_url` PATH on every webhook in a
// callHunterApi result, in BOTH the machine-readable `structuredContent.data`
// and the user-visible JSON-envelope text (which the model reads). `data` is an
// ARRAY for List-Webhooks and a single OBJECT for Update-Webhook; both shapes
// are handled. Mirrors `stripResponseFields` in helpers.ts: rebuild the
// structuredContent, then re-serialize + re-scrub the content text so the two
// channels can't desync. No-op on error results (no `data` envelope).
function redactWebhookTargetUrls(result: McpTextResult): McpTextResult {
  if (result.isError) return result
  const sc = result.structuredContent as { data?: unknown } | undefined
  if (!sc || !("data" in sc)) return result

  const redactOne = (webhook: unknown): unknown => {
    if (!webhook || typeof webhook !== "object") return webhook
    const record = webhook as Record<string, unknown>
    if (typeof record.target_url !== "string") return webhook
    return { ...record, target_url: maskWebhookUrl(record.target_url) }
  }

  const redactedData = Array.isArray(sc.data) ? sc.data.map(redactOne) : redactOne(sc.data)
  const redactedStructured = { ...sc, data: redactedData }
  // Re-run the credential scrub for the same reason stripResponseFields does:
  // callHunterApi scrubbed its own text, but we discard it and re-serialize from
  // the (now-redacted) structuredContent, so the scrub invariant is re-applied.
  const rawText = `${JSON.stringify(redactedStructured)}${HUNTER_SOURCE_SUFFIX}`
  return {
    ...result,
    content: [
      { ...result.content[0], type: "text" as const, text: sanitizeUpstreamMessage(rawText, Number.POSITIVE_INFINITY) },
    ],
    structuredContent: redactedStructured,
  }
}

// Webhook event types from app/app/models/webhook.rb (Webhook::EVENTS). The
// Rails model validates `event` inclusion against this exact list, so the
// input enum can't drift from what the API accepts without a deliberate bump
// here.
const WEBHOOK_EVENTS = [
  "lead.created",
  "message.sent",
  "message.read",
  "message.clicked",
  "message.replied",
  "export.completed",
  "import.completed",
  "sequence.paused",
  "sequence.resumed",
] as const

// Per-item shape from app/app/views/api/webhooks/_webhook.jbuilder: exactly
// `{ id, target_url, event }` — no source/filter/timestamps are exposed on the
// v2 surface. Leaf declares every key (not `.loose()`) so a jbuilder rename
// surfaces in vitest; unknown future fields are stripped, not rejected.
// `event` is a plain string in the OUTPUT schema (tolerate events Hunter adds
// later); the INPUT enum below is the strict, validated list.
// NOTE: `target_url` reaches this schema already redacted to `scheme://host/[REDACTED]`
// (or `[REDACTED_URL]`) by redactWebhookTargetUrls — the handlers strip the
// secret PATH before the value is ever published (see maskWebhookUrl above).
const webhookSchema = z.object({
  id: z.number().int().positive(),
  target_url: z.string(),
  event: z.string(),
})

// The webhooks jbuilders (app/app/views/api/webhooks/{index,show,update}.jbuilder)
// emit a TOP-LEVEL `json.status "success"` string — unlike most v2 views.
// buildResponseSchema declares `status` as the 202/204 ack envelope's HTTP
// integer, and the SDK republishes `.shape` as a closed object, so without
// widening `status` every successful webhooks response would fail the
// published output-schema validation (-32602). Admit both shapes.
const jbuilderStatusShape = {
  status: z.union([z.number().int(), z.literal("success")]).optional(),
} as const

// index.jbuilder emits `json.data @webhooks, partial: ...`, so `data` is an
// ARRAY of webhooks (not a `{ webhooks: [...] }` object). `meta` carries
// `{ total, limit, offset }` (app/app/views/api/webhooks/index.jbuilder).
const listWebhooksOutputSchema = buildResponseSchema(z.array(webhookSchema), paginationMetaSchema).extend(
  jbuilderStatusShape,
)

// update.jbuilder wraps the same per-item partial under a single `data`
// object (app/app/views/api/webhooks/update.jbuilder).
const updateWebhookOutputSchema = buildResponseSchema(webhookSchema).extend(jbuilderStatusShape)

// Hard cap on explicit lead-id selections, mirroring MAX_BULK_IDS in
// src/tools/bulk-operations.ts. The confirmation gate echoes lead_ids back
// inside pendingToolCall, and embedNextAction downgrades any payload over its
// 2048-byte cap to a generic ask_user WITHOUT pendingToolCall — silently
// breaking the confirm-and-re-issue loop. 100 ids stay comfortably under the
// cap; larger pushes should be batched or expressed via leads_list_id.
const MAX_PUSH_LEAD_IDS = 100

// Push-Leads-To-CRM success renders HTTP 202 with a jbuilder body (NOT an
// empty ack): app/app/views/api/connected_apps/push/create.jbuilder emits
// `{ data: { connected_app_id, provider, leads_count, status: "queued" },
//    meta: { params: { lead_ids, leads_list_id } } }`.
// The controller (app/app/controllers/api/connected_apps/push_controller.rb)
// hands the work to Leads::PushToConnectedAppJob, so `status: "queued"` means
// scheduled, not delivered. All leaf fields are optional + `.loose()` because
// this same schema must also admit the confirmation-gate stub
// `{ data: { connected_app_id, status: "awaiting_confirmation" } }` — the
// Start-Sequence pattern.
const pushLeadsToCrmDataSchema = z
  .object({
    connected_app_id: z.number().int().positive().optional(),
    provider: z.string().optional(),
    leads_count: z.number().int().nonnegative().optional(),
    status: z.string().optional(),
  })
  .loose()

// meta.params echoes the request selection back verbatim: `lead_ids` is the
// raw form param (an array of strings when sent form-encoded) or null, and
// `leads_list_id` is the raw string (or null when only lead_ids were sent).
const pushLeadsToCrmMetaSchema = z
  .object({
    params: z
      .object({
        lead_ids: z.union([z.array(z.union([z.string(), z.number()])), z.null()]).optional(),
        leads_list_id: z.union([z.string(), z.number(), z.null()]).optional(),
      })
      .loose()
      .optional(),
  })
  .loose()

const pushLeadsToCrmOutputSchema = buildResponseSchema(pushLeadsToCrmDataSchema, pushLeadsToCrmMetaSchema)

export function registerIntegrationTools(server: McpServer, apiKey: string, baseUrl: string) {
  // WRITE_ANNOTATIONS (openWorldHint: true) is deliberate: a push copies lead
  // data OUT of Hunter into the user's external CRM (HubSpot, Pipedrive,
  // Salesforce, Zapier, Zoho) where it becomes visible to other systems and
  // people and cannot be recalled by Hunter — an externally-visible effect,
  // not a private-workspace staging write. destructiveHint stays false (it
  // creates/updates CRM records, it doesn't delete anything); the hard
  // confirmation gate below covers the irreversibility of the data leaving
  // Hunter. (HUN-20858)
  server.registerTool(
    TOOL_NAMES.pushLeadsToCrm,
    {
      description:
        'Use this when the user wants to push Hunter leads into the CRM behind one of their connected apps (lead-syncing providers: HubSpot, Pipedrive, Salesforce, Zapier, and Zoho). First call List-Connected-Apps to find the target app and its `id`. Select the leads with EITHER `lead_ids` (specific leads) OR `leads_list_id` (every lead in that list); when both are provided the list takes precedence. The push is asynchronous: success only means the job was queued (`status: "queued"` plus the matched `leads_count`) — tell the user to check their CRM shortly for the synced leads. Returns a not-found error for an unknown connected app or leads list, and an invalid_input error when the app does not support lead syncing or no leads match the selection. Pushing writes lead data into the user\'s external CRM and requires an explicit user confirmation: the first call returns a confirmation prompt without pushing, and only re-issuing with `confirmed: true` actually queues the push. Free to call.',
      inputSchema: {
        connected_app_id: z
          .number()
          .int()
          .positive()
          .describe("ID of the connected app to push leads to (from List-Connected-Apps)"),
        lead_ids: z
          .array(z.number().int().positive())
          .max(MAX_PUSH_LEAD_IDS)
          .optional()
          .describe(
            "IDs of the specific leads to push (ignored when leads_list_id is also provided). Maximum 100 IDs per call — batch larger selections into multiple calls, or select via leads_list_id instead",
          ),
        leads_list_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("ID of a leads list whose leads should all be pushed (takes precedence over lead_ids)"),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat that lead data should be pushed to the external CRM. The first invocation (without confirmed) returns an ask_user nextAction; the second invocation (with confirmed: true) actually queues the push.",
          ),
      },
      outputSchema: pushLeadsToCrmOutputSchema.shape,
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ connected_app_id, lead_ids, leads_list_id, confirmed }) => {
      // Rails would answer 400 wrong_params, but a selection-less call must
      // not reach the confirmation gate either — asking the user to confirm a
      // push that cannot succeed is worse than failing fast locally.
      if ((lead_ids === undefined || lead_ids.length === 0) && leads_list_id === undefined) {
        const message = "Provide lead_ids (a non-empty array) or leads_list_id — there is nothing to push."
        return {
          content: [{ type: "text" as const, text: message, annotations: { audience: ["user"] } }],
          structuredContent: { error: { code: "invalid_input" as const, retryable: false, message } },
          isError: true,
        }
      }

      if (!confirmed) {
        // Hard gate: short-circuit and emit ask_user with pendingToolCall.
        // No POST to /push until the model re-issues with confirmed: true.
        // The lead count is stated when it's cheaply available (lead_ids
        // length); a list push names the list instead of fetching its size.
        const target =
          leads_list_id !== undefined
            ? `all leads from leads list ${leads_list_id}`
            : `${lead_ids?.length ?? 0} lead${lead_ids?.length === 1 ? "" : "s"}`
        const stub: McpTextResult = {
          content: [
            {
              type: "text" as const,
              text: `Awaiting user confirmation to push leads to connected app ${connected_app_id}.`,
              annotations: { audience: ["user"] },
            },
          ],
          structuredContent: {
            data: { connected_app_id, status: "awaiting_confirmation" },
          },
        }
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `Confirm: push ${target} to connected app ${connected_app_id}? Lead data will leave Hunter and be written into the connected CRM; the push runs asynchronously.`,
            pendingToolCall: {
              tool: TOOL_NAMES.pushLeadsToCrm,
              // Echo ONLY the fields pushLeadsToCrmArgsSchema declares
              // (src/schemas/common.ts), and only those that were provided.
              args: {
                connected_app_id,
                ...(lead_ids !== undefined && { lead_ids }),
                ...(leads_list_id !== undefined && { leads_list_id }),
                confirmed: true,
              },
            },
          }),
        )
      }

      const params: Record<string, string | string[]> = {}
      if (lead_ids !== undefined) params.lead_ids = lead_ids.map(String)
      if (leads_list_id !== undefined) params.leads_list_id = String(leads_list_id)
      // On 404 (unknown app / unknown list), 422 (app doesn't support lead
      // syncing / zero leads matched), or 400 (malformed selection)
      // callHunterApi returns the typed error envelope unchanged; we pass it
      // through so the model gets `structuredContent.error`.
      const result = await callHunterApi({
        path: `/connected-apps/${connected_app_id}/push`,
        apiKey,
        baseUrl,
        method: "POST",
        params,
      })
      return withDeepLink(result, "/leads")
    },
  )

  server.registerTool(
    TOOL_NAMES.listWebhooks,
    {
      description:
        "Use this when the user wants to inspect the webhooks configured on their Hunter account — typically to debug an integration: is my webhook configured, which event does it listen to, and where does it deliver? Each webhook reports its `id`, `target_url` (the endpoint Hunter POSTs the event payload to), and `event` — one of lead.created, message.sent, message.read, message.clicked, message.replied, export.completed, import.completed, sequence.paused, or sequence.resumed. Results are ordered newest first and support `limit` and `offset` pagination (`meta.total` carries the overall count). Returns an empty list when no webhooks are configured. Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of webhooks to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of webhooks to return (default 20, max 100)"),
      },
      outputSchema: listWebhooksOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      // No deep link: webhooks have no standalone hunter.io dashboard page
      // (the only webhook UI is nested inside a sequence's settings).
      const result = await callHunterApi({ path: "/webhooks", apiKey, baseUrl, params })
      // Redact the secret target_url PATH on every webhook before it leaves the
      // tool (Zapier-style webhooks embed a reusable secret in the path). Mirrors
      // the admin registry precedent — see maskWebhookUrl above.
      return redactWebhookTargetUrls(result)
    },
  )

  server.registerTool(
    TOOL_NAMES.updateWebhook,
    {
      description:
        "Use this when the user wants to re-point an existing webhook to a different `target_url` (the endpoint Hunter POSTs to) and/or subscribe it to a different `event` (one of lead.created, message.sent, message.read, message.clicked, message.replied, export.completed, import.completed, sequence.paused, or sequence.resumed). This OVERWRITES configuration another system may already rely on: an integration listening on the old URL or event stops receiving deliveries immediately, so review the webhook with List-Webhooks first and make sure the user really wants to change it. Provide at least one of `target_url` or `event` — a call with neither returns an invalid_input error without contacting the API. Returns the updated webhook. Fails with an invalid_input error when the new `target_url` is not a valid 12-500 character HTTP(S) URL or the `event` is not supported, and a not-found error if the webhook does not exist or is not visible to the account. Free to call.",
      inputSchema: {
        webhook_id: z.number().int().positive().describe("ID of the webhook to update (from List-Webhooks)"),
        // PUT /webhooks/:id permits exactly `target_url` and `event`
        // (app/app/controllers/api/webhooks_controller.rb update_params).
        target_url: z
          .url()
          .min(12)
          .max(500)
          .optional()
          .describe("New endpoint URL Hunter should POST the event payload to (HTTP or HTTPS, 12-500 characters)"),
        event: z
          .enum(WEBHOOK_EVENTS)
          .optional()
          .describe("New event the webhook should listen to (replaces the current event)"),
      },
      outputSchema: updateWebhookOutputSchema.shape,
      // DESTRUCTIVE: updating overwrites delivery configuration another system
      // may rely on — the old target_url/event stops receiving events with no
      // undo history — so destructiveHint:true makes the host confirm first.
      // openWorld stays false: the change only rewires the user's own Hunter
      // webhook row; deliveries to the (user-chosen) endpoint are the webhook
      // feature itself, not a new externally-visible effect of this call.
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ webhook_id, target_url, event }) => {
      // Local pre-flight gate (mirrors invalidInput in bulk-operations.ts):
      // a call with neither updatable field would be a no-op PUT, so fail
      // fast with the typed envelope instead of round-tripping to Rails.
      // buildResponseSchema declares `error`, so the published output schema
      // admits this envelope.
      if (target_url === undefined && event === undefined) {
        const message = "Provide target_url and/or event — there is nothing to update."
        return {
          content: [{ type: "text" as const, text: message, annotations: { audience: ["user"] } }],
          structuredContent: { error: { code: "invalid_input" as const, retryable: false, message } },
          isError: true,
        }
      }

      const params: Record<string, string> = {}
      if (target_url !== undefined) params.target_url = target_url
      if (event !== undefined) params.event = event
      // On 422 (invalid target_url / unsupported event → validation_failed)
      // or 404 (not found / another team's webhook) callHunterApi returns the
      // typed error envelope unchanged; we pass it through so the model gets
      // `structuredContent.error`.
      const result = await callHunterApi({ path: `/webhooks/${webhook_id}`, apiKey, baseUrl, method: "PUT", params })
      // update.jbuilder echoes the updated webhook (including its target_url)
      // back under `data`, so apply the same PATH redaction as List-Webhooks —
      // a Zapier secret must not surface just because the row was updated.
      return redactWebhookTargetUrls(result)
    },
  )
}
