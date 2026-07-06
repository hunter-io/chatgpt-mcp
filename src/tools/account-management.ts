import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  buildNextAction,
  callHunterApi,
  embedNextAction,
  type McpTextResult,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  PRIVATE_WRITE_ANNOTATIONS,
  TOOL_NAMES,
  withDeepLink,
} from "../helpers"
import { buildResponseSchema, nullableString, paginationMetaSchema } from "../schemas/common"

// Usage + API key management (HUN-20861 / HUN-20862).
//
// The three API-key tools carry a hard auth caveat: Api::ApiKeysController
// runs `reject_oauth_token` before every action and returns HTTP 403 ("API
// keys can't be managed with an OAuth token. Use your API key instead.") when
// the request authenticates with an OAuth (Doorkeeper) token. The ChatGPT app
// connects via OAuth, so these tools 403 there — the descriptions state that
// plainly so the model relays the limitation instead of retrying.

// ─── Get-Usage ──────────────────────────────────────────────────────────────
//
// Per-quota usage from app/app/views/api/usage/show.jbuilder
// (Api::UsageController#show + Api::Concerns::UsageCalculation). `data`
// carries `reset_date` (the current billing period end, YYYY-MM-DD) and a
// `requests` block with one bucket per quota in `Call::QUOTAS` (%i[search
// verify], app/app/models/call.rb), keyed by
// `pretty_request_type(quota).pluralize` — "searches" and "verifications"
// (app/app/helpers/subscriptions_helper.rb maps :verify → "verification").
// Teams on a single-credits-bucket plan additionally get a `credits` bucket
// with `remaining`. Credit values can be FRACTIONAL — `remaining` comes from
// Team#last_period_credits_remaining (a float, app/app/models/team/usages.rb)
// — so bucket values are deliberately NOT constrained to integers.
// `over_quota` appears on each bucket only when the team is shown overage
// requests (@show_overage_requests). `requests` stays `.loose()` because a
// new Hunter quota ships as a new bucket key. `meta.params` echoes
// `show_overage_requests`.
const usageBucketSchema = z.object({
  used: z.number().nonnegative(),
  available: z.number().nonnegative(),
  over_quota: z.number().nonnegative().optional(),
})

const usageCreditsSchema = z.object({
  used: z.number().nonnegative(),
  available: z.number().nonnegative(),
  remaining: z.number().nonnegative(),
  over_quota: z.number().nonnegative().optional(),
})

const usageDataSchema = z.object({
  reset_date: z.string(),
  requests: z
    .object({
      credits: usageCreditsSchema.optional(),
      searches: usageBucketSchema,
      verifications: usageBucketSchema,
    })
    .loose(),
})

const getUsageOutputSchema = buildResponseSchema(
  usageDataSchema,
  z
    .object({
      params: z.object({ show_overage_requests: z.boolean() }).loose().optional(),
    })
    .loose(),
)

// ─── API keys ───────────────────────────────────────────────────────────────
//
// List item shape from app/app/views/api/api_keys/index.jbuilder: `data` is an
// ARRAY of `{ id, name, token, created_at }`. `token` is api_key.masked_token
// (app/app/models/api_key.rb) — a fixed 8-star prefix plus the LAST 4
// characters of the key ("********abcd"; fully masked when the stored token is
// 4 chars or fewer). The full key value NEVER appears in this response, and
// the leaf uses Zod's default strip-on-parse behavior so any future full-key
// field would be dropped before reaching the model. `name` is null for
// unnamed keys (the model normalizes blank names to nil). `meta` carries
// `{ total, limit, offset }`.
const apiKeyListItemSchema = z.object({
  id: z.number().int().positive(),
  name: nullableString(),
  token: z.string(),
  created_at: z.string(),
})

// index.jbuilder (and create.jbuilder below) also emit a TOP-LEVEL
// `json.status "success"` STRING. buildResponseSchema declares `status` as the
// synthesized ack envelope's HTTP-status INTEGER, and the published schema is
// closed (`additionalProperties: false` after the `.shape` re-wrap), so
// without widening the union every real payload would fail a schema-validating
// client with -32602. The integer branch keeps the 202/204 ack envelope
// validating.
const statusSuccessShape = {
  status: z.union([z.string(), z.number().int()]).optional(),
} as const

const listApiKeysOutputSchema = buildResponseSchema(z.array(apiKeyListItemSchema), paginationMetaSchema).extend(
  statusSuccessShape,
)

// Created-key shape from app/app/views/api/api_keys/create.jbuilder (HTTP 201;
// Api::ApiKeysController#create renders it with `variants: [api_version]`,
// falling back to this template): `data: { id, name, token, created_at }`
// where `token` is the FULL, unmasked key — the ONLY response that ever
// carries it (index/update render masked_token). Fields are optional (plus a
// `status` string) because the same leaf also validates the
// awaiting_confirmation stub emitted by the confirmation gate below.
const createApiKeyDataSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: nullableString().optional(),
    token: z.string().optional(),
    created_at: z.string().optional(),
    status: z.string().optional(),
  })
  .loose()

const createApiKeyOutputSchema = buildResponseSchema(createApiKeyDataSchema).extend(statusSuccessShape)

// Delete-API-Key has two success shapes: the awaiting_confirmation stub
// (`data: { id, status }`) emitted by the confirmation gate, and the
// synthesized 204 ack envelope from callHunterApi once the DELETE goes
// through (Api::ApiKeysController#destroy responds `head :no_content`).
// buildResponseSchema declares the flat ack fields; the loose data leaf
// covers the stub.
const deleteApiKeyOutputSchema = buildResponseSchema(
  z
    .object({
      id: z.number().int().positive().optional(),
      status: z.string().optional(),
    })
    .loose(),
)

export function registerAccountManagementTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.getUsage,
    {
      description:
        "Use this when the user wants to know how many Hunter credits or requests they have left in the current billing period — and proactively BEFORE any large credit-consuming action (a Domain-Search loop over many companies, bulk email verification, bulk enrichment): check the remaining quota first and warn the user when the planned work would exceed it. Reports per-bucket usage — `searches` and `verifications`, plus a `credits` summary (with `remaining`) on plans with a single credits bucket — each with `used` and `available`, and `reset_date` (the day the quota resets, i.e. the end of the current billing period). Reading usage consumes no credits and no requests. Free to call.",
      inputSchema: {},
      outputSchema: getUsageOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async () => {
      const result = await callHunterApi({ path: "/usage", apiKey, baseUrl })
      return withDeepLink(result, "/usage")
    },
  )

  server.registerTool(
    TOOL_NAMES.listApiKeys,
    {
      description:
        "Use this when the user wants to list their Hunter API keys. Keys are scoped to the requesting user, not the team — another team member's keys are never visible here. Key values are masked (only the last 4 characters are shown, e.g. `********abcd`); the full value of a key is visible only once, in the Create-API-Key response. Managing keys requires connecting with an API key: connections authorized via OAuth get an unauthorized error (\"API keys can't be managed with an OAuth token. Use your API key instead.\") — relay that message to the user instead of retrying. Supports `limit` and `offset` pagination. Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of API keys to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of API keys to return (default 20, max 100)"),
      },
      outputSchema: listApiKeysOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      const result = await callHunterApi({ path: "/api-keys", apiKey, baseUrl, params })
      return withDeepLink(result, "/api-keys")
    },
  )

  server.registerTool(
    TOOL_NAMES.createApiKey,
    {
      description:
        "Use this when the user wants to create a new Hunter API key, optionally with a name (names must be unique among the user's keys; a user can have at most 100 keys). SECURITY: this tool's response is the ONLY time the full key value is ever visible — every later listing shows it masked. Treat it as a secret: surface it to the user once so they can save it, never repeat it back into the conversation more than once, and never write it into leads, notes, or other tools. Managing keys requires connecting with an API key: connections authorized via OAuth get an unauthorized error — relay it to the user instead of retrying. Creating a key requires explicit user confirmation: the first call returns a confirmation prompt without creating anything, and only re-issuing with `confirmed: true` creates the key. Free to call.",
      inputSchema: {
        name: z
          .string()
          .max(255)
          .optional()
          .describe(
            "Optional label for the key (max 255 chars, unique among the user's keys; blank is treated as unnamed)",
          ),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat that a new API key should be created. The first invocation (without confirmed) returns an ask_user nextAction; the second invocation (with confirmed: true) actually creates the key.",
          ),
      },
      outputSchema: createApiKeyOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ name, confirmed }) => {
      if (!confirmed) {
        // Hard gate: short-circuit and emit ask_user with pendingToolCall.
        // No POST to /api-keys until the model re-issues with confirmed: true.
        // The echoed args include ONLY the fields createApiKeyArgsSchema
        // (src/schemas/common.ts) declares, and only when provided.
        const namePhrase = name !== undefined ? ` named "${name}"` : ""
        const stub: McpTextResult = {
          content: [
            {
              type: "text" as const,
              text: `Awaiting user confirmation to create a new API key${namePhrase}.`,
              annotations: { audience: ["user"] },
            },
          ],
          structuredContent: {
            data: { status: "awaiting_confirmation", ...(name !== undefined && { name }) },
          },
        }
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `Confirm: create a new Hunter API key${namePhrase}? The full key value is shown only once, in the creation response — treat it as a secret.`,
            pendingToolCall: {
              tool: TOOL_NAMES.createApiKey,
              args: { ...(name !== undefined && { name }), confirmed: true },
            },
          }),
        )
      }

      const params: Record<string, string> = {}
      if (name !== undefined) params.name = name
      // callHunterApi auto-attaches an Idempotency-Key header on every POST.
      // On 422 (duplicate name, 100-key cap) or 403 (OAuth token) it returns
      // the typed error envelope unchanged; we pass it through so the model
      // gets `structuredContent.error`.
      const result = await callHunterApi({ path: "/api-keys", apiKey, baseUrl, method: "POST", params })
      return withDeepLink(result, "/api-keys")
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteApiKey,
    {
      description:
        "Use this when the user wants to permanently delete one of their Hunter API keys. Deletion is immediate and irreversible: anything still authenticating with the key — scripts, integrations, connected tools, possibly this very connection — stops working the moment it is deleted. The server refuses to delete the user's LAST remaining key (a user must always keep at least one; that request fails with a validation error). Keys are scoped to the requesting user: a key belonging to someone else returns a not-found error. Managing keys requires connecting with an API key: connections authorized via OAuth get an unauthorized error — relay it to the user instead of retrying. Deleting requires explicit user confirmation: the first call returns a confirmation prompt without deleting, and only re-issuing with `confirmed: true` deletes the key. Free to call.",
      inputSchema: {
        api_key_id: z.number().int().positive().describe("ID of the API key to delete (see List-API-Keys)"),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat that the key should be deleted. The first invocation (without confirmed) returns an ask_user nextAction; the second invocation (with confirmed: true) actually deletes the key.",
          ),
      },
      outputSchema: deleteApiKeyOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ api_key_id, confirmed }) => {
      if (!confirmed) {
        // Hard gate: short-circuit and emit ask_user with pendingToolCall.
        // No DELETE until the model re-issues with confirmed: true.
        const stub: McpTextResult = {
          content: [
            {
              type: "text" as const,
              text: `Awaiting user confirmation to delete API key ${api_key_id}.`,
              annotations: { audience: ["user"] },
            },
          ],
          structuredContent: {
            data: { id: api_key_id, status: "awaiting_confirmation" },
          },
        }
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `Confirm: delete API key ${api_key_id}? Anything still authenticating with it — scripts, integrations, possibly this very connection — stops working immediately. This cannot be undone.`,
            pendingToolCall: {
              tool: TOOL_NAMES.deleteApiKey,
              args: { api_key_id, confirmed: true },
            },
          }),
        )
      }

      // On 422 (last-key guard — ApiKey#prevent_having_no_api_key aborts the
      // destroy), 404 (not found / owned by another user), or 403 (OAuth
      // token) callHunterApi returns the typed error envelope unchanged; we
      // pass it through so the model gets `structuredContent.error`. Success
      // is a 204 → synthesized ack envelope.
      const result = await callHunterApi({ path: `/api-keys/${api_key_id}`, apiKey, baseUrl, method: "DELETE" })
      return withDeepLink(result, "/api-keys")
    },
  )
}
