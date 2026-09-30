import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { hunterLink } from "./helpers"

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "build-list",
    {
      title: "Build List",
      description: "Create a Hunter leads list and add the email addresses you provide.",
      argsSchema: {
        description: z
          .string()
          .describe(
            "Describe the list and the email addresses to add (e.g. 'Webinar attendees: ana@acme.com, li@globex.com')",
          ),
      },
    },
    async ({ description }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Build a Hunter leads list: "${description}"

1. Use only the email addresses I provided. This app cannot find people or email addresses. If I gave none, ask me for them before you create anything, and tell me that ${hunterLink("/", "build-list")} can find contacts.
2. Create a new leads list with a descriptive name using Create-Leads-List (free), and note its id.
3. If I asked for verified contacts only, call Email-Verifier on each address with save_leads true and the new list's id as leads_list_id. A valid result chains to Create-Lead-If-Missing. Otherwise, save each address directly with Create-Lead-If-Missing and leads_list_id set to the new list. Create-Lead-If-Missing never overwrites an existing lead: if a lead already exists, it returns it unchanged and reports "already exists; no changes made", and the lead stays in its current list.
4. Present a summary with the count and the deep-link to view the list in Hunter.

Leads operations are free. Email-Verifier uses Hunter credits, charged only for valid, invalid, or accept-all results.

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
2. Identify the recipients — from a leads list (List-Leads with leads_list_id) or specific emails I provide.
3. Before adding, offer to verify emails with Email-Verifier (uses Hunter credits) to improve deliverability.
4. Use Add-Sequence-Recipients to add them (max 50 per request — batch larger lists).
5. Present a summary with the count and a deep-link to the sequence.

To create a new sequence from scratch, use Create-Sequence. It auto-creates the introduction email (step 0) empty: call List-Sequence-Follow-Ups for the id of the step whose step is 0, then write its subject and body with Update-Sequence-Follow-Up — the sequence can't start while step 0 is blank. Append the remaining steps with Create-Sequence-Follow-Up (optionally starting from a saved template via List-Message-Templates), and use Update-Sequence-Follow-Up again to reword any step. Remind me to review the whole sequence in Hunter before starting it.

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
