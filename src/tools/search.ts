import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  READ_ONLY_ANNOTATIONS,
  TOOL_NAMES,
  buildNextAction,
  callHunterApi,
  desc,
  embedNextAction,
  parseHunterApiData,
} from "../helpers"

interface DomainSearchData {
  emails?: Array<{ value?: string }>
}

interface EmailVerifierData {
  status?: string
  email?: string
}

function firstEmailValue(data: DomainSearchData | null): string | null {
  if (!data || !Array.isArray(data.emails)) return null
  for (const entry of data.emails) {
    if (entry && typeof entry.value === "string" && entry.value.length > 0) {
      return entry.value
    }
  }
  return null
}

export function registerSearchTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.domainSearch,
    {
      description: desc`Get email addresses and contact data for a domain. Returns emails with names, positions, and confidence scores. Costs 1 search credit per 10 emails returned (rounded up) — only charged if emails are found. Use ${TOOL_NAMES.emailFinder} for a specific person, or this tool to browse all contacts. CRITICAL: when the user wants verified contacts, the response will include nextAction.kind === "call_tool" pointing to ${TOOL_NAMES.emailVerifier} — call it immediately on the first valid email found.`,
      inputSchema: {
        domain: z.string().describe("Domain name to find Data for"),
        limit: z.number().optional().describe("Maximum number of email addresses to return"),
        offset: z.number().optional().describe("Number of email addresses to skip"),
        type: z.enum(["personal", "generic"]).optional().describe("Type of email addresses to return"),
        seniority: z
          .string()
          .optional()
          .describe(
            "Filter by seniority level. Values: junior, senior, executive. Supports comma-separated multi-values (e.g. 'senior,executive')",
          ),
        department: z
          .string()
          .optional()
          .describe(
            "Filter by department. Values: executive, it, finance, management, sales, legal, support, hr, marketing, communication, education, design, health, operations. Supports comma-separated multi-values (e.g. 'sales,marketing')",
          ),
        required_field: z
          .enum(["full_name", "position", "phone_number"])
          .optional()
          .describe("Only return results where this field has a value"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ domain, limit, offset, type, seniority, department, required_field }) => {
      const params: Record<string, string> = { domain }
      if (limit !== undefined) params.limit = String(limit)
      if (offset !== undefined) params.offset = String(offset)
      if (type) params.type = type
      if (seniority) params.seniority = seniority
      if (department) params.department = department
      if (required_field) params.required_field = required_field
      const result = await callHunterApi({ path: "/domain-search", apiKey, baseUrl, params })
      if (result.isError) return result

      const email = firstEmailValue(parseHunterApiData<DomainSearchData>(result))
      if (!email) {
        return embedNextAction(
          result,
          buildNextAction({
            kind: "complete",
            summary: `No contacts found for ${domain}.`,
          }),
        )
      }

      return embedNextAction(
        result,
        buildNextAction({
          kind: "call_tool",
          tool: TOOL_NAMES.emailVerifier,
          reason: "Verify deliverability before saving.",
          suggestedArgs: { email },
          requiresConfirmation: true,
        }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.emailFinder,
    {
      description: desc`Find a specific person's email address at a company. Provide full name and domain. Costs 1 search credit — only charged if an email is found. Follow up with ${TOOL_NAMES.emailVerifier} to check deliverability.`,
      inputSchema: {
        full_name: z.string().describe("Full name of the person to find the email address for"),
        domain: z.string().describe("Domain name to find the person's email address for"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ full_name, domain }) => {
      return callHunterApi({ path: "/email-finder", apiKey, baseUrl, params: { full_name, domain } })
    },
  )

  server.registerTool(
    TOOL_NAMES.emailVerifier,
    {
      description: desc`Check if an email address is deliverable. Returns status (valid, invalid, accept_all, etc.) and confidence score. Costs 1 verification credit — only charged for valid, invalid, or accept_all results. CRITICAL: when status is "valid", call ${TOOL_NAMES.upsertLead} immediately with the same email to save the verified contact. For any other status, stop here.`,
      inputSchema: { email: z.string().describe("Email address to verify") },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ email }) => {
      const result = await callHunterApi({ path: "/email-verifier", apiKey, baseUrl, params: { email } })
      if (result.isError) return result

      const status = parseHunterApiData<EmailVerifierData>(result)?.status

      if (status === "valid") {
        return embedNextAction(
          result,
          buildNextAction({
            kind: "call_tool",
            tool: TOOL_NAMES.upsertLead,
            reason: "Save the verified contact.",
            suggestedArgs: { email },
          }),
        )
      }

      return embedNextAction(
        result,
        buildNextAction({
          kind: "complete",
          summary: status ? `Email is ${status} — not saving.` : "Email verification status unavailable — not saving.",
        }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.emailCount,
    {
      description: desc`Get the number of email addresses Hunter has found for a domain. Free (no credits). Useful to check data availability before running a ${TOOL_NAMES.domainSearch}.`,
      inputSchema: {
        domain: z.string().describe("Domain name to count email addresses for"),
        type: z.enum(["personal", "generic"]).optional().describe("Type of email addresses to count"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ domain, type }) => {
      const params: Record<string, string> = { domain }
      if (type) params.type = type
      return callHunterApi({ path: "/email-count", apiKey, baseUrl, params })
    },
  )
}
