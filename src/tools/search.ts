import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { callHunterApi, READ_ONLY_ANNOTATIONS } from "../helpers"

export function registerSearchTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    "Domain-Search",
    {
      description: "Get B2B Data from a provided domain name",
      inputSchema: {
        domain: z.string().describe("Domain name to find Data for"),
        limit: z.number().optional().describe("Maximum number of email addresses to return"),
        offset: z.number().optional().describe("Number of email addresses to skip"),
        type: z.enum(["personal", "generic"]).optional().describe("Type of email addresses to return"),
        seniority: z.string().optional().describe("Filter by seniority level (e.g. junior, senior, executive)"),
        department: z
          .string()
          .optional()
          .describe(
            "Filter by department (e.g. executive, it, finance, management, communication, education, legal, hr)",
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
      return callHunterApi({ path: "/domain-search", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    "Email-Finder",
    {
      description: "Find an email address for a given person and domain name",
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
    "Email-Verifier",
    {
      description: "Check the deliverability of a provided email address",
      inputSchema: { email: z.string().describe("Email address to verify") },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ email }) => {
      return callHunterApi({ path: "/email-verifier", apiKey, baseUrl, params: { email } })
    },
  )

  server.registerTool(
    "Email-Count",
    {
      description: "Get the number of email addresses found for a domain",
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
