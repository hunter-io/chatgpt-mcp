import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { READ_ONLY_ANNOTATIONS, TOOL_NAMES, callHunterApi, desc } from "../helpers"
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
      description: desc`Enrich a person from their email address — name, title, company, social profiles, location, phone. Costs 1 enrichment credit — only charged if data is found. Use ${TOOL_NAMES.upsertLead} to save enriched data to your leads.`,
      inputSchema: { email: z.string().email().max(254).describe("Email address to enrich") },
      outputSchema: personEnrichmentOutputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ email }) => {
      return callHunterApi({ path: "/people/find", apiKey, baseUrl, params: { email } })
    },
  )

  server.registerTool(
    TOOL_NAMES.combinedEnrichment,
    {
      description: desc`Enrich a person and their company in a single request using email or LinkedIn handle. Costs 1 enrichment credit — only charged if person or company data is found. More efficient than calling ${TOOL_NAMES.personEnrichment} and ${TOOL_NAMES.companyEnrichment} separately. Use ${TOOL_NAMES.upsertLead} to save enriched data.`,
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
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ email, linkedin_handle }) => {
      const params: Record<string, string> = {}
      if (email) params.email = email
      if (linkedin_handle) params.linkedin_handle = linkedin_handle
      return callHunterApi({ path: "/combined/find", apiKey, baseUrl, params })
    },
  )
}
