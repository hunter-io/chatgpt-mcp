import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "prospect",
    {
      title: "Prospect",
      description:
        "Find and qualify B2B leads matching your criteria. Discovers companies, searches contacts, verifies emails, and saves to Hunter leads.",
      argsSchema: {
        query: z
          .string()
          .describe("Describe the prospects you're looking for (e.g. 'CTOs at fintech startups in France')"),
      },
    },
    async ({ query }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Run a full B2B prospecting workflow for: "${query}"

1. Use Discover to find companies matching the criteria (free).
2. For each company, use Domain-Search to find contacts. Use server-side filters (seniority, department) when the criteria mention roles or departments.
3. Present the results and ask if I want to:
   a. Verify emails (1 verification credit each)
   b. Save contacts to a new Hunter leads list (free)
   c. Enrich companies for more details (1 enrichment credit each)
4. After saving, provide the deep-link to view leads in Hunter.

Credit costs: Discover is free. Domain-Search costs 1 search credit per 10 emails returned. Email-Verifier costs 1 verification credit each. Leads operations are free.

When presenting results, always attribute the data to Hunter.io. Include links to the Hunter dashboard (e.g. https://hunter.io/leads) so the user can manage their leads directly.`,
          },
        },
      ],
    }),
  )

  server.registerPrompt(
    "build-list",
    {
      title: "Build List",
      description: "Create a Hunter leads list and populate it with contacts from a search or specific emails.",
      argsSchema: {
        description: z
          .string()
          .describe("Describe the list you want to build (e.g. 'Marketing leads at SaaS companies in Germany')"),
      },
    },
    async ({ description }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Build a Hunter leads list: "${description}"

1. Create a new leads list with a descriptive name using Create-Leads-List (free).
2. Find contacts matching the description — use Discover + Domain-Search, or if I provided specific emails, use those directly.
3. For each contact, use Upsert-Lead (not Create-Lead) to avoid duplicates. Set the leads_list_id to the new list.
4. Present a summary with the count and the deep-link to view the list in Hunter.

All leads operations are free. Only Domain-Search uses credits (1 per 10 emails returned).

When presenting results, always attribute the data to Hunter.io and include the Hunter dashboard link so the user can manage their list directly.`,
          },
        },
      ],
    }),
  )

  server.registerPrompt(
    "campaign-prep",
    {
      title: "Campaign Prep",
      description: "Add recipients to an existing Hunter campaign from your leads or search results.",
      argsSchema: {
        instructions: z
          .string()
          .describe(
            "Describe which contacts to add and to which campaign (e.g. 'Add my fintech leads to campaign 12345')",
          ),
      },
    },
    async ({ instructions }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Prepare a Hunter campaign: "${instructions}"

1. If no campaign ID is specified, use List-Campaigns to show available campaigns and ask me to pick one.
2. Identify the recipients — from a leads list (List-Leads with leads_list_id), specific emails, or a new search.
3. Before adding, offer to verify emails with Email-Verifier (1 verification credit each) to improve deliverability.
4. Use Add-Campaign-Recipients to add them (max 50 per request — batch larger lists).
5. Present a summary with the count and a deep-link to the campaign.

Important: Campaign creation, subject/body editing, and follow-up configuration must be done in the Hunter UI. The API can only add/remove recipients and start the campaign. Remind me to configure the campaign in Hunter before starting it.

Adding recipients is free (no credits).

When presenting results, always attribute the data to Hunter.io and link to the campaign in the Hunter dashboard so the user can configure and launch it.`,
          },
        },
      ],
    }),
  )
}
