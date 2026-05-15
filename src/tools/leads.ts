import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  DESTRUCTIVE_ANNOTATIONS,
  READ_ONLY_ANNOTATIONS,
  TOOL_NAMES,
  WRITE_ANNOTATIONS,
  buildNextAction,
  callHunterApi,
  carryLoopFilters,
  desc,
  embedNextAction,
  loopRecoveryAction,
  pendingCompaniesSchema,
  withDeepLink,
  withDeepLinkFromId,
} from "../helpers"
import {
  buildResponseSchema,
  mutationAckSchema,
  nullableNumber,
  nullableString,
  paginationMetaSchema,
  verificationSchema,
} from "../schemas/common"

const leadFieldsSchema = {
  email: z.string().optional().describe("Email address of the lead"),
  first_name: z.string().optional().describe("First name of the lead"),
  last_name: z.string().optional().describe("Last name of the lead"),
  position: z.string().optional().describe("Job title or position"),
  company: z.string().optional().describe("Company name"),
  company_industry: z.string().optional().describe("Industry of the company"),
  company_size: z.string().optional().describe("Size range of the company (e.g. 1-10, 11-50)"),
  company_type: z.string().optional().describe("Type of company (e.g. public, private, non-profit)"),
  website: z.string().optional().describe("Company website URL"),
  country_code: z.string().optional().describe("Two-letter country code (e.g. US, FR)"),
  linkedin_url: z.string().optional().describe("LinkedIn profile URL"),
  phone_number: z.string().optional().describe("Phone number"),
  twitter: z.string().optional().describe("Twitter/X handle"),
  notes: z.string().optional().describe("Notes about the lead"),
  source: z.string().optional().describe("Source of the lead"),
  leads_list_id: z.number().int().positive().optional().describe("ID of the leads list to add the lead to"),
}

// Hunter lead shape — covers fields the model and the UI both reason about.
// `.loose()` on the leaf because (a) `_lead.jbuilder` emits user-defined
// custom-attribute values as FLAT sibling keys via `json.set! slug, value`
// (so they must flow through unenumerated), and (b) the jbuilder may add
// fields over time. `leads_list` fields are all nullable because the
// jbuilder unconditionally emits the block via safe-nav for orphan leads
// (lead with zero leads_list_memberships) — see HUN-19943 review.
const leadSchema = z
  .object({
    id: z.number().int().positive(),
    email: z.string(),
    first_name: nullableString().optional(),
    last_name: nullableString().optional(),
    position: nullableString().optional(),
    company: nullableString().optional(),
    company_industry: nullableString().optional(),
    company_size: nullableString().optional(),
    company_type: nullableString().optional(),
    website: nullableString().optional(),
    country_code: nullableString().optional(),
    linkedin_url: nullableString().optional(),
    phone_number: nullableString().optional(),
    twitter: nullableString().optional(),
    notes: nullableString().optional(),
    source: nullableString().optional(),
    leads_list: z
      .object({
        id: nullableNumber().optional(),
        name: nullableString().optional(),
        leads_count: nullableNumber().optional(),
      })
      .optional(),
    verification: verificationSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .loose()

// List response from /v2/leads — { data: { leads: [...] }, meta: { count, total } }
const listLeadsDataSchema = z.object({ leads: z.array(leadSchema) }).loose()

const listLeadsOutputSchema = buildResponseSchema(listLeadsDataSchema, paginationMetaSchema)
const singleLeadOutputSchema = buildResponseSchema(leadSchema)
// Lead-Exists envelope: the controller emits `{ id, leads_list_id,
// leads_list_name }` (all nullable when no lead matches). There is no `exists`
// field — callers should derive existence from `data.id != null`. See
// app/controllers/api/leads/exist_controller.rb#show.
const leadExistsOutputSchema = buildResponseSchema(
  z
    .object({
      id: nullableNumber().optional(),
      leads_list_id: nullableNumber().optional(),
      leads_list_name: nullableString().optional(),
    })
    .loose(),
)

function buildLeadParams(fields: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      params[key] = String(value)
    }
  }
  return params
}

export function registerLeadTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listLeads,
    {
      description:
        "List leads in your Hunter account with optional filters. Free (no credits). Returns up to 100 leads per page — use offset to paginate.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of leads to skip"),
        limit: z.number().int().positive().max(100).optional().describe("Maximum number of leads to return (max 100)"),
        leads_list_id: z.number().int().positive().optional().describe("Filter leads by list ID"),
        email: z.string().optional().describe("Filter leads by email address"),
        first_name: z.string().optional().describe("Filter leads by first name"),
        last_name: z.string().optional().describe("Filter leads by last name"),
        company: z.string().optional().describe("Filter leads by company name"),
      },
      outputSchema: listLeadsOutputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ offset, limit, leads_list_id, email, first_name, last_name, company }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      if (leads_list_id !== undefined) params.leads_list_id = String(leads_list_id)
      if (email) params.email = email
      if (first_name) params.first_name = first_name
      if (last_name) params.last_name = last_name
      if (company) params.company = company
      return callHunterApi({ path: "/leads", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.getLead,
    {
      description: "Get a single lead by ID. Free (no credits).",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the lead to retrieve"),
      },
      outputSchema: singleLeadOutputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads/${id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.createLead,
    {
      description:
        "Create a new lead in your Hunter account. Free (no credits). Provide at least an email address. Use leads_list_id to add directly to a list.",
      inputSchema: {
        ...leadFieldsSchema,
        email: z.string().email().max(254).describe("Email address of the lead (required)"),
      },
      outputSchema: singleLeadOutputSchema.shape,
      annotations: WRITE_ANNOTATIONS,
    },
    async (fields) => {
      const result = await callHunterApi({
        path: "/leads",
        apiKey,
        baseUrl,
        method: "POST",
        params: buildLeadParams(fields),
      })
      return withDeepLinkFromId(result, (id) => `/leads/${id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.updateLead,
    {
      description: "Update an existing lead by ID. Free (no credits).",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the lead to update"),
        ...leadFieldsSchema,
      },
      outputSchema: singleLeadOutputSchema.shape,
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ id, ...fields }) => {
      const result = await callHunterApi({
        path: `/leads/${id}`,
        apiKey,
        baseUrl,
        method: "PUT",
        params: buildLeadParams(fields),
      })
      return withDeepLink(result, `/leads/${id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteLead,
    {
      description: "Delete a lead by ID. Free (no credits).",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the lead to delete"),
      },
      // Hunter returns 204 No Content — callHunterApi synthesises mutationAckSchema.
      outputSchema: mutationAckSchema.shape,
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads/${id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    TOOL_NAMES.upsertLead,
    {
      description: desc`Create or update a lead by email address. If a lead with the email exists, it is updated; otherwise a new lead is created. Free (no credits). Preferred over ${TOOL_NAMES.createLead} when you may have duplicates. Terminal step in the single-company prospecting chain — emits nextAction.kind === "complete". CRITICAL: when called with 'pending_companies' (multi-company loop mode), the response chains directly to ${TOOL_NAMES.domainSearch} for the next pending company after the save, instead of completing — so the entire prospecting loop runs without between-company gates.`,
      inputSchema: {
        ...leadFieldsSchema,
        email: z.string().email().max(254).describe("Email address of the lead (used to match existing leads)"),
        pending_companies: pendingCompaniesSchema,
        // Domain-Search filter carry: not used by Upsert-Lead itself, only
        // forwarded to the next chained Domain-Search call so filters survive
        // the full multi-company loop. Field names mirror Domain-Search's so
        // the chained suggestedArgs spread cleanly across the loop.
        limit: z.number().optional().describe("Loop carry: forwarded from Domain-Search."),
        type: z.enum(["personal", "generic"]).optional().describe("Loop carry: forwarded from Domain-Search."),
        seniority: z.string().optional().describe("Loop carry: forwarded from Domain-Search."),
        department: z.string().optional().describe("Loop carry: forwarded from Domain-Search."),
        required_field: z
          .enum(["full_name", "position", "phone_number"])
          .optional()
          .describe("Loop carry: forwarded from Domain-Search."),
      },
      outputSchema: singleLeadOutputSchema.shape,
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ pending_companies, limit, type, seniority, department, required_field, ...fields }) => {
      const result = await callHunterApi({
        path: "/leads",
        apiKey,
        baseUrl,
        method: "PUT",
        params: buildLeadParams(fields),
      })
      const linked = withDeepLinkFromId(result, (id) => `/leads/${id}`)
      if (linked.isError) {
        if (pending_companies !== undefined && pending_companies.length > 0) {
          return loopRecoveryAction(linked, pending_companies, "Lead save failed")
        }
        return linked
      }

      if (pending_companies !== undefined && pending_companies.length > 0) {
        const [next, ...rest] = pending_companies
        const filterCarry = carryLoopFilters({ limit, type, seniority, department, required_field })
        return embedNextAction(
          linked,
          buildNextAction({
            kind: "call_tool",
            tool: TOOL_NAMES.domainSearch,
            reason: "Lead saved; continuing loop with next picked company.",
            suggestedArgs: { domain: next, pending_companies: rest, ...filterCarry },
          }),
        )
      }

      // Reachable when pending_companies is undefined (single-call mode) OR an empty
      // array (last hop in a loop — non-empty was handled above). The flag below
      // distinguishes the two so the loop's terminal save reads as "loop complete"
      // rather than the single-call summary.
      const isLastLoopHop = pending_companies !== undefined
      return embedNextAction(
        linked,
        buildNextAction({
          kind: "complete",
          summary: isLastLoopHop ? "Lead saved. Multi-company loop complete." : "Lead saved to Hunter.",
        }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.leadExists,
    {
      description: "Check if a lead with a given email address exists. Free (no credits).",
      inputSchema: {
        email: z.string().email().max(254).describe("Email address to check"),
      },
      outputSchema: leadExistsOutputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ email }) => {
      return callHunterApi({ path: "/leads/exist", apiKey, baseUrl, params: { email } })
    },
  )
}
