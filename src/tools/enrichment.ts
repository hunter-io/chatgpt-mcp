import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { BILLABLE_LOOKUP_ANNOTATIONS, TOOL_NAMES, callHunterApi, minimizeResponseData } from "../helpers"
import { buildResponseSchema, nullableString } from "../schemas/common"

// Hunter person-enrichment shapes are wide and Clearbit-style, but submission
// privacy guidance requires response minimization. The schema below uses an
// explicit allowlist for every leaf bag (social, geo, name, employment); any
// field Hunter returns that isn't listed is silently STRIPPED by Zod's
// default object behavior (drops unknown keys at parse time) and never
// reaches `structuredContent` or the model. Adding a new field to the
// surface requires a deliberate schema bump here + privacy-policy
// disclosure update.
//
// Why strip, not strict-reject: real Hunter `/people/find` responses emit
// fields outside our minimization allowlist (e.g. `timeZone`, `utcOffset`,
// `bio`, `avatar`, `phone`, `activeAt`, `twitter.id`). `.strict()` would
// REJECT those responses at the MCP SDK's outputSchema validation boundary,
// breaking the tool. Strip mode achieves the privacy goal (model never sees
// unknowns) without failing validation when Hunter ships normal fields we
// haven't explicitly allowlisted.
//
// `bio` is intentionally absent from the allowlist (was free-form user-
// generated text on the prior `.loose()` shape; reviewers flagged this kind
// of open-ended text content as undisclosed PII risk). Same for other
// unknown PII categories that may appear on future Hunter responses.
const personSocialLeafSchema = z.object({
  handle: nullableString().optional(),
  url: nullableString().optional(),
  name: nullableString().optional(),
})

const personEnrichmentDataSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  name: z
    .object({
      fullName: nullableString().optional(),
      givenName: nullableString().optional(),
      familyName: nullableString().optional(),
    })
    .optional(),
  email: nullableString().optional(),
  location: nullableString().optional(),
  site: nullableString().optional(),
  employment: z
    .object({
      title: nullableString().optional(),
      role: nullableString().optional(),
      seniority: nullableString().optional(),
      name: nullableString().optional(),
      domain: nullableString().optional(),
    })
    .optional(),
  // Social profile leaves narrowed to handle/url/name only. Drops follower
  // counts, verified flags, profile metadata, provider-specific subfields
  // (e.g. `twitter.id`), and any future provider additions.
  twitter: personSocialLeafSchema.optional(),
  linkedin: personSocialLeafSchema.optional(),
  github: personSocialLeafSchema.optional(),
  facebook: personSocialLeafSchema.optional(),
  // Geo intentionally narrowed to coarse signals only (city/country/state).
  // Coordinates, IP-geo, and other granular location data are not exposed.
  geo: z
    .object({
      city: nullableString().optional(),
      state: nullableString().optional(),
      country: nullableString().optional(),
    })
    .optional(),
})

// Combined-Enrichment returns { person: {...}, company: {...} } envelope.
// Person side uses the allowlist schema above. Company side uses a narrowed
// leaf — the full Company-Enrichment data shape is owned by the widget tool
// in index.ts; here we expose only the subset that's safe to surface
// alongside a person profile (name, domain, industry-level signals).
// Anything richer goes through the dedicated Company-Enrichment tool.
const combinedCompanyLeafSchema = z.object({
  name: nullableString().optional(),
  domain: nullableString().optional(),
  description: nullableString().optional(),
  industry: nullableString().optional(),
  location: nullableString().optional(),
})

const combinedEnrichmentDataSchema = z.object({
  person: personEnrichmentDataSchema.optional(),
  company: combinedCompanyLeafSchema.optional(),
})

const personEnrichmentOutputSchema = buildResponseSchema(personEnrichmentDataSchema)
const combinedEnrichmentOutputSchema = buildResponseSchema(combinedEnrichmentDataSchema)

export function registerEnrichmentTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.personEnrichment,
    {
      description:
        "Use this when the user wants to look up a professional contact by email address and see their name, job title, employer, location, phone number, and social profiles. Uses Hunter credits, charged only when data is found. Do not use this for consumer profiles — Hunter's enrichment covers business contacts.",
      inputSchema: { email: z.string().email().max(254).describe("Email address to enrich") },
      outputSchema: personEnrichmentOutputSchema.shape,
      annotations: { ...BILLABLE_LOOKUP_ANNOTATIONS, title: "Enrich Person" },
    },
    async ({ email }) => {
      const result = await callHunterApi({ path: "/people/find", apiKey, baseUrl, params: { email } })
      // Actually apply the allowlist. The MCP SDK validates structuredContent
      // against the declared outputSchema but discards the stripped parse
      // result, so without this explicit minimization step Hunter's extra
      // fields (`bio`, `phone`, `avatar`, `twitter.id`, `geo.lat`, etc.)
      // continue reaching the model. Codex flagged this on PR #12677.
      return minimizeResponseData(result, personEnrichmentDataSchema)
    },
  )

  server.registerTool(
    TOOL_NAMES.combinedEnrichment,
    {
      description:
        "Use this when the user provides an email address or LinkedIn handle and wants both the person's profile and their company's profile in a single response. Uses Hunter credits, charged only when data is found. Do not use this when the user only needs one side of the picture — call Person-Enrichment or Company-Enrichment directly to keep the response narrow.",
      inputSchema: {
        email: z.string().email().max(254).optional().describe("Email address of the person to enrich"),
        linkedin_handle: z
          .string()
          .min(1)
          .max(200)
          .optional()
          .describe("LinkedIn handle of the person to enrich (e.g. john-doe-123)"),
      },
      outputSchema: combinedEnrichmentOutputSchema.shape,
      annotations: { ...BILLABLE_LOOKUP_ANNOTATIONS, title: "Enrich Person And Company" },
    },
    async ({ email, linkedin_handle }) => {
      const params: Record<string, string> = {}
      if (email) params.email = email
      if (linkedin_handle) params.linkedin_handle = linkedin_handle
      const result = await callHunterApi({ path: "/combined/find", apiKey, baseUrl, params })
      // Same explicit minimization as Person-Enrichment — drop fields outside
      // the combined-enrichment allowlist (extras on `person` and `company`
      // sub-bags as well as top-level).
      return minimizeResponseData(result, combinedEnrichmentDataSchema)
    },
  )
}
