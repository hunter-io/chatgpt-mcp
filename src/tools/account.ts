import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  minimizeResponseData,
  PRIVATE_READ_ANNOTATIONS,
  stripResponseFields,
  TOOL_NAMES,
} from "../helpers"
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

// Hunter's `/account` upstream returns `first_name`, `last_name`, `email`, and
// `team_id` in addition to the plan/credit fields below. Those four are PII
// not necessary for the common-case "how many credits do I have?" question
// the ChatGPT tool serves, and OpenAI's app-submission privacy rules require
// response minimization. The handler strips the four named PII fields
// server-side via `stripResponseFields(result, ACCOUNT_PII_FIELDS)` before
// the response reaches `structuredContent`. The schema below documents the
// kept surface.
//
// The top-level schema uses Zod's default strip-on-parse behavior (no `.strict()`
// and no `.loose()`): any field Hunter adds in the future that isn't listed
// here is silently dropped at schema-parse time and never reaches the model.
// Adding a new top-level field to the surface requires a deliberate schema
// bump here + privacy-policy disclosure update. `requests` stays `.loose()`
// because Hunter regularly adds new product buckets (new QUOTAS) under
// `requests` and those are intentionally forward-compatible.
// All fields optional so `minimizeResponseData(result, accountDataSchema)`
// always parses successfully and strips unknown keys. The MCP SDK's
// outputSchema validation runs against the same schema; in normal operation
// Hunter always returns plan_name and requests, so the looser required-ness
// only affects degraded-upstream cases (where the user already sees a
// broken response either way).
const accountDataSchema = z.object({
  plan_name: z.string().optional(),
  plan_level: z.number().int().optional(),
  reset_date: z.string().optional(),
  requests: z
    .object({
      searches: callsBucketSchema.optional(),
      verifications: callsBucketSchema.optional(),
    })
    .loose()
    .optional(),
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

const accountOutputSchema = buildResponseSchema(accountDataSchema)

// PII fields that Hunter's `/account` upstream returns but the ChatGPT MCP
// must strip before responding. Listed explicitly so a future Hunter API
// addition that introduces a new PII field is a deliberate schema decision,
// not an automatic passthrough.
const ACCOUNT_PII_FIELDS = new Set(["first_name", "last_name", "email", "team_id"])

export function registerAccountTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.account,
    {
      description:
        "Use this when the user asks about their Hunter plan or remaining credits. Returns plan name and per-product credit balances (search, verification, enrichment). Does not return personal identifiers such as name, email, or team ID. Free to call.",
      inputSchema: {},
      outputSchema: accountOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async () => {
      const result = await callHunterApi({ path: "/account", apiKey, baseUrl })
      // Belt-and-suspenders: stripResponseFields runs FIRST so the four
      // named PII fields are removed even if the schema parse below somehow
      // fails. minimizeResponseData then enforces the schema's allowlist
      // (drops any future Hunter field outside it) by actually using
      // Zod's parsed-and-stripped result.
      return minimizeResponseData(stripResponseFields(result, ACCOUNT_PII_FIELDS), accountDataSchema)
    },
  )
}
