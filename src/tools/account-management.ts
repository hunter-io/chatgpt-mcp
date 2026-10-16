import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { callHunterApi, PRIVATE_READ_ANNOTATIONS, TOOL_NAMES, withDeepLink } from "../helpers"
import { buildResponseSchema } from "../schemas/common"

// Usage (HUN-20861). The API-key tools are not registered here: the ChatGPT app
// connects via OAuth, and Api::ApiKeysController refuses OAuth tokens (HUN-23709).

// ─── Get-Usage ──────────────────────────────────────────────────────────────
//
// Per-quota usage from app/app/views/api/usage/show.jbuilder
// (Api::UsageController#show + Api::Concerns::UsageCalculation). `data`
// carries `reset_date` (the current billing period end, YYYY-MM-DD) and a
// `requests` block with one bucket per quota in `Call::QUOTAS` (%i[search
// verify], app/app/models/call.rb), keyed by
// `pretty_request_type(quota).pluralize` — "searches" and "verifications"
// (app/app/helpers/subscriptions_helper.rb maps :verify → "verification").
// Each search/verify bucket also reports `remaining`, the live balance
// (HUN-21880): `available` is the gross period allowance plus extra packs and
// does NOT decrease as the base quota is spent, so `remaining` is the value to
// pace work against. Teams on a single-credits-bucket plan additionally get a
// `credits` bucket with `remaining`. Credit values can be FRACTIONAL — `remaining` comes from
// Team#last_period_credits_remaining (a float, app/app/models/team/usages.rb)
// — so bucket values are deliberately NOT constrained to integers.
// `over_quota` appears on each bucket only when the team is shown overage
// requests (@show_overage_requests). `requests` stays `.loose()` because a
// new Hunter quota ships as a new bucket key. `meta.params` echoes
// `show_overage_requests`.
const usageBucketSchema = z.object({
  used: z.number().nonnegative(),
  available: z.number().nonnegative(),
  remaining: z.number().nonnegative().optional(),
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

export function registerAccountManagementTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.getUsage,
    {
      description:
        "Use this when the user wants to know how many Hunter credits or requests they have left in the current billing period — and proactively BEFORE any large credit-consuming action (many email verifications or company enrichments): check the remaining quota first and warn the user when the planned work would exceed it. Returns `reset_date` (the day the quota resets, i.e. the end of the current billing period) and buckets, each with `used`, `available`, and `remaining`. How to read the buckets depends on the plan. When `requests.credits` is present, the plan has ONE shared credit pool: plan with `credits.remaining`. A search costs 1 credit, a verification 0.5 credit and an enrichment 0.2 credit (an enrichment still needs at least 1 credit left to start). `searches` and `verifications` are then not separate quotas but approximate views of the same pool (rounded down, with request-pack usage counted per type): do not add them up, and do not use them to tell what one call cost. When `credits` is absent, `searches` and `verifications` are separate quotas: searches and enrichments use `searches`, Email-Verifier uses `verifications`. Reading usage consumes no credits and no requests. Free to call.",
      inputSchema: {},
      outputSchema: getUsageOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async () => {
      const result = await callHunterApi({ path: "/usage", apiKey, baseUrl })
      return withDeepLink(result, "/usage")
    },
  )
}
