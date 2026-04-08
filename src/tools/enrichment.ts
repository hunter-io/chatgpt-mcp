import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { callHunterApi, READ_ONLY_ANNOTATIONS } from "../helpers"

export function registerEnrichmentTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    "Email-Enrichment",
    {
      description:
        "Enrich an email address with the person's name, title, company, social profiles, location, and phone number. Costs 1 enrichment credit — only charged if data is found. Use Upsert-Lead to save enriched data to your leads.",
      inputSchema: { email: z.string().describe("Email address to enrich") },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ email }) => {
      return callHunterApi({ path: "/people/find", apiKey, baseUrl, params: { email } })
    },
  )

  server.registerTool(
    "Combined-Enrichment",
    {
      description:
        "Enrich a person and their company in a single request using email or LinkedIn handle. Costs 1 enrichment credit — only charged if person or company data is found. More efficient than calling Email-Enrichment and Company-Enrichment separately. Use Upsert-Lead to save enriched data.",
      inputSchema: {
        email: z.string().optional().describe("Email address of the person to enrich"),
        linkedin_handle: z.string().optional().describe("LinkedIn handle of the person to enrich (e.g. john-doe-123)"),
      },
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
