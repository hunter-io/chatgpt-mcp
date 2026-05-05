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
  leads_list_id: z.number().optional().describe("ID of the leads list to add the lead to"),
}

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
    "List-Leads",
    {
      description:
        "List leads in your Hunter account with optional filters. Free (no credits). Returns up to 100 leads per page — use offset to paginate.",
      inputSchema: {
        offset: z.number().optional().describe("Number of leads to skip"),
        limit: z.number().optional().describe("Maximum number of leads to return (max 100)"),
        leads_list_id: z.number().optional().describe("Filter leads by list ID"),
        email: z.string().optional().describe("Filter leads by email address"),
        first_name: z.string().optional().describe("Filter leads by first name"),
        last_name: z.string().optional().describe("Filter leads by last name"),
        company: z.string().optional().describe("Filter leads by company name"),
      },
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
    "Get-Lead",
    {
      description: "Get a single lead by ID. Free (no credits).",
      inputSchema: {
        id: z.number().describe("ID of the lead to retrieve"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads/${id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    "Create-Lead",
    {
      description:
        "Create a new lead in your Hunter account. Free (no credits). Provide at least an email address. Use leads_list_id to add directly to a list.",
      inputSchema: {
        ...leadFieldsSchema,
        email: z.string().describe("Email address of the lead (required)"),
      },
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
    "Update-Lead",
    {
      description: "Update an existing lead by ID. Free (no credits).",
      inputSchema: {
        id: z.number().describe("ID of the lead to update"),
        ...leadFieldsSchema,
      },
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
    "Delete-Lead",
    {
      description: "Delete a lead by ID. Free (no credits).",
      inputSchema: {
        id: z.number().describe("ID of the lead to delete"),
      },
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
    "Lead-Exists",
    {
      description: "Check if a lead with a given email address exists. Free (no credits).",
      inputSchema: {
        email: z.string().describe("Email address to check"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ email }) => {
      return callHunterApi({ path: "/leads/exist", apiKey, baseUrl, params: { email } })
    },
  )
}
