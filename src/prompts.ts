import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "prospect",
    {
      title: "Prospect",
      description:
        "Find B2B contacts matching your criteria. Discovers companies and their contacts, returns them as a table for review, and saves to Hunter leads only if you ask.",
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
            text: `Run a B2B prospecting workflow for: "${query}"

By default, gather the contacts and return them for review — do not save anything. Only save to my Hunter leads if I explicitly ask to (e.g. "save these", "add to my leads", "create a list"). A request that just says "leads" is a request to find contacts, not to save them.

1. Use Find-Companies to find companies matching the criteria (free).
2. For each company, use Domain-Search to find contacts. Use server-side filters (seniority, department) when the criteria mention roles or departments. Pass save_leads only when I asked to save (see step 4); otherwise leave it unset.
3. Return the contacts as a table — one row per email with name, position, email, and verification status — and offer to save them to my Hunter leads as the next step.
4. Only if I ask to save: if I ask to save BEFORE you've searched (the save was clear from the start), set save_leads true on the Domain-Search calls so the flow runs the save chain. But if I ask to save AFTER you've already gathered and shown me the table, do NOT re-run Domain-Search for companies you already searched (that just spends credits again) — save directly from the rows already in the table. Either way, don't blindly re-check all the rows: a row already shown as valid with high confidence is trustworthy as-is and is saved directly; only the rows that aren't already valid+high-confidence get an Email-Verifier check first (skip accept_all/invalid rows). Then save with Create-Lead-If-Missing, reusing each row's email, name, position, and company, which never overwrites an existing lead (free). Afterwards, provide the deep-link to view the leads in Hunter.

Credits: Find-Companies is free. Domain-Search uses Hunter credits (1 per 10 emails returned). Checking deliverability with Email-Verifier uses Hunter credits, charged only for valid, invalid, or accept-all results, and runs only for rows that aren't already verified. Leads operations are free.

When presenting results, always attribute the data to Hunter.io. Include links to the Hunter dashboard (e.g. https://hunter.io/leads) so I can manage my leads directly.

If anything didn't work as expected during this flow — a missing capability, a confusing result, wrong data, or a tool that errored — call Report-API-Feedback to flag it. It's free, doesn't interrupt the task, and you don't need to ask me first.`,
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

This is an explicit save request, so run the SAVE flow (not the return-a-table research flow).

1. Create a new leads list with a descriptive name using Create-Leads-List (free), and note its id.
2. Find contacts matching the description — use Find-Companies + Domain-Search, or if I provided specific emails, use those directly. When searching, set save_leads true on Domain-Search and pass the new list's id as leads_list_id so the save chain runs and the saved leads land in this list.
3. Save through the save chain so each contact's deliverability is handled correctly: a row Domain-Search already returns as valid with high confidence is saved directly, and only the rows that aren't already valid+high-confidence get an Email-Verifier check first. The chain ends at Create-Lead-If-Missing, which never overwrites an existing lead. Set leads_list_id to the new list when creating; if a lead already exists, the tool returns it unchanged and reports "already exists; no changes made" — the existing lead's list assignment is left as-is.
4. Present a summary with the count and the deep-link to view the list in Hunter.

Leads operations are free. Domain-Search uses Hunter credits (1 per 10 emails returned). Checking deliverability with Email-Verifier uses Hunter credits, charged only for valid, invalid, or accept-all results, and runs only for rows that aren't already verified.

When presenting results, always attribute the data to Hunter.io and include the Hunter dashboard link so the user can manage their list directly.

If anything didn't work as expected during this flow — a missing capability, a confusing result, wrong data, or a tool that errored — call Report-API-Feedback to flag it. It's free, doesn't interrupt the task, and doesn't need the user's permission.`,
          },
        },
      ],
    }),
  )

  server.registerPrompt(
    "sequence-prep",
    {
      title: "Sequence Prep",
      description:
        "Add recipients to an existing Hunter sequence — or create one from scratch — from your leads or search results.",
      argsSchema: {
        instructions: z
          .string()
          .describe(
            "Describe which contacts to add and to which sequence (e.g. 'Add my fintech leads to sequence 12345')",
          ),
      },
    },
    async ({ instructions }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Prepare a Hunter sequence: "${instructions}"

1. If no sequence ID is specified, use List-Sequences to show available sequences and ask me to pick one.
2. Identify the recipients — from a leads list (List-Leads with leads_list_id), specific emails, or a new search.
3. Before adding, offer to verify emails with Email-Verifier (uses Hunter credits) to improve deliverability.
4. Use Add-Sequence-Recipients to add them (max 50 per request — batch larger lists).
5. Present a summary with the count and a deep-link to the sequence.

To create a new sequence from scratch, use Create-Sequence, then author its steps with Create-Sequence-Follow-Up (optionally starting from a saved template via List-Message-Templates). One caveat: the introduction email (step 0) is created empty and the v2 API has no endpoint to fill it in yet, so I have to write step 0's subject and body in the Hunter dashboard before the sequence can start — remind me to author step 0 there. Remind me to review the whole sequence in Hunter before starting it.

For engagement metrics on an existing sequence, use Get-Sequence-Stats — sequence-level open/click/reply rates are recipient-based (distinct recipients who acted ÷ distinct recipients delivered to), matching the Hunter dashboard.

Adding recipients is free (no credits).

When presenting results, always attribute the data to Hunter.io and link to the sequence in the Hunter dashboard so the user can configure and launch it.

If anything didn't work as expected during this flow — a missing capability, a confusing result, wrong data, or a tool that errored — call Report-API-Feedback to flag it. It's free, doesn't interrupt the task, and doesn't need the user's permission.`,
          },
        },
      ],
    }),
  )
}
