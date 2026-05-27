import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { BILLABLE_LOOKUP_ANNOTATIONS, TOOL_NAMES, callHunterApi } from "../helpers"
import { buildResponseSchema, nullableString } from "../schemas/common"

// Hunter enrichment shapes are wide and evolving (Clearbit-style); declare the
// keys the model commonly reasons about and let everything else fall through
// via .loose() at envelope level. Leaves are mostly .loose() too because
// `social`, `geo`, `metrics`, etc. are themselves growing bags.
const personEnrichmentDataSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z
      .object({
        fullName: nullableString().optional(),
        givenName: nullableString().optional(),
        familyName: nullableString().optional(),
      })
      .loose()
      .optional(),
    email: nullableString().optional(),
    location: nullableString().optional(),
    bio: nullableString().optional(),
    site: nullableString().optional(),
    employment: z
      .object({
        title: nullableString().optional(),
        role: nullableString().optional(),
        seniority: nullableString().optional(),
        name: nullableString().optional(),
        domain: nullableString().optional(),
      })
      .loose()
      .optional(),
    // Clearbit-style social profile bags. Genuinely evolving surface
    // (followers count, verified flag, profile metadata vary per provider) —
    // intentionally loose. See HUN-19943 todos/018.
    twitter: z.object({}).loose().optional(),
    linkedin: z.object({}).loose().optional(),
    github: z.object({}).loose().optional(),
    facebook: z.object({}).loose().optional(),
    geo: z.object({}).loose().optional(),
  })
  .loose()

// Combined-Enrichment returns { person: {...}, company: {...} } envelope.
// Company shape is shared with the widget-backed Company-Enrichment tool;
// kept loose here to allow growth.
const combinedEnrichmentDataSchema = z
  .object({
    person: personEnrichmentDataSchema.optional(),
    company: z.object({}).loose().optional(),
  })
  .loose()

const personEnrichmentOutputSchema = buildResponseSchema(personEnrichmentDataSchema)
const combinedEnrichmentOutputSchema = buildResponseSchema(combinedEnrichmentDataSchema)

export function registerEnrichmentTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.personEnrichment,
    {
      description:
        "Use this when the user wants to look up a person by email address and see their name, job title, employer, location, phone number, and social profiles. Costs 1 enrichment credit, only charged when data is found.",
      inputSchema: { email: z.string().email().max(254).describe("Email address to enrich") },
      outputSchema: personEnrichmentOutputSchema.shape,
      annotations: BILLABLE_LOOKUP_ANNOTATIONS,
    },
    async ({ email }) => {
      return callHunterApi({ path: "/people/find", apiKey, baseUrl, params: { email } })
    },
  )

  server.registerTool(
    TOOL_NAMES.combinedEnrichment,
    {
      description:
        "Use this when the user provides an email address or LinkedIn handle and wants both the person's profile and their company's profile in a single response. Costs 1 enrichment credit, only charged when data is found.",
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
      annotations: BILLABLE_LOOKUP_ANNOTATIONS,
    },
    async ({ email, linkedin_handle }) => {
      const params: Record<string, string> = {}
      if (email) params.email = email
      if (linkedin_handle) params.linkedin_handle = linkedin_handle
      return callHunterApi({ path: "/combined/find", apiKey, baseUrl, params })
    },
  )
}
