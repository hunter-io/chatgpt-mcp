import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { callHunterApi, READ_ONLY_ANNOTATIONS, TOOL_NAMES } from "../helpers"
import { buildResponseSchema } from "../schemas/common"

// Hunter account exposes per-product credit buckets under `requests` (typed
// explicitly — agent's call-planning oracle, never a `.loose()` bag). The
// top-level `calls` key is the DEPRECATED flat sum kept for backwards-compat
// (see HUN-19943 plan + PR #12212 Claude bot review).
const callsBucketSchema = z
  .object({
    used: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    reset_date: z.string().optional(),
  })
  .loose()

const accountDataSchema = z
  .object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    plan_name: z.string(),
    plan_level: z.number().int().optional(),
    reset_date: z.string().optional(),
    team_id: z.number().int().optional(),
    // `requests` is the source-of-truth per-product credit accounting. Keys are
    // derived from `Call::QUOTAS` (currently `:search` + `:verify`), pluralised
    // to `searches` + `verifications`. New product buckets are added here when
    // Hunter ships a new QUOTA — `.loose()` keeps the envelope tolerant.
    requests: z
      .object({
        searches: callsBucketSchema.optional(),
        verifications: callsBucketSchema.optional(),
      })
      .loose(),
    // `calls` is the DEPRECATED top-level flat sum (carries
    // `_deprecation_notice`, `used`, `available` only). Kept typed so agents
    // that still read the sum see correct field names, but the canonical
    // per-product oracle is `requests`.
    calls: z
      .object({
        _deprecation_notice: z.string().optional(),
        used: z.number().int().nonnegative().optional(),
        available: z.number().int().nonnegative().optional(),
      })
      .loose()
      .optional(),
  })
  .loose()

const accountOutputSchema = buildResponseSchema(accountDataSchema)

export function registerAccountTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.account,
    {
      description:
        "Get your Hunter account details: remaining credits (search, verification, enrichment), plan name, and team info. Free (no credits). Use to check remaining credits before running bulk operations.",
      inputSchema: {},
      outputSchema: accountOutputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      return callHunterApi({ path: "/account", apiKey, baseUrl })
    },
  )
}
