// Hunter capability recovery patterns — exposed at MCP resource URI
// `hunter://capabilities/recovery`. Read by the model when user intent is
// ambiguous or asks for something the ChatGPT app cannot do. See
// docs/plans/2026-04-28-feat-chatgpt-app-review-readiness-plan.md (Pillar 5).
//
// Diverges from remote-mcp's copy since HUN-23709: the ChatGPT app has no tool
// that returns a person or an email address, and no API-key tools.

import { hunterLink } from "../helpers"

export const CAPABILITIES_RECOVERY_MD = `# Hunter Capability Recovery Patterns

This resource documents how to use Hunter's tools in ChatGPT, and which requests they cannot serve.

## Person email addresses are not available

The ChatGPT app cannot find new people or email addresses. It has no tool that lists a company's contacts or finds a named person's email. Addresses already saved in the user's Hunter account (leads, sequence recipients) stay available through the lead and sequence tools. If the user asks for one, say that person email addresses are not available in ChatGPT. Do not try to work around this with other tools. This limit is by design: do not report it with Report-API-Feedback.

Hunter has these addresses on hunter.io. When the user wants emails at a company:

1. Call \`Email-Count\` for one domain, or \`Find-People\` for several companies. Both are free.
2. Tell the user how many addresses Hunter has.
3. Give the Hunter link from the response (\`viewInHunter\` on Email-Count, \`emails_on_hunter\` on each Find-People row). The user sees the addresses there.

For a named person, point the user to ${hunterLink("/", "recovery")}.

What the app can do with people:

- **\`Email-Verifier\`** checks an email address that the user gives.
- The lead tools (\`Create-Lead\`, \`Create-Lead-If-Missing\`, \`Create-Or-Update-Lead\`) save contacts that the user gives.
- The sequence tools send to leads or addresses that are already in the user's Hunter account, or that the user gives.

## Saved searches

Open prospecting conversations with \`List-Saved-Searches\` ("want to rerun one of your saved searches?"). To rerun one, read its stored \`filters\`/\`name\` and reformulate them as a natural-language \`query\` for Find-Companies or Find-People — that reformulation is approximate, since those tools can't re-apply the structured filters (locations, industries, funding, technologies, include/exclude lists) verbatim. There is no update endpoint — to change a saved search, \`Delete-Saved-Search\` then \`Create-Saved-Search\`.

## Lead organization

- Call \`List-Lead-Tags\` FIRST and reuse an existing tag before creating one — near-duplicate tags ("VIP" vs "vip") fragment the user's data.
- Folders organize lists; favorites mark default lists. Neither touches the leads themselves.

## Bulk operations

All 5 bulk tools (\`Bulk-Move-Leads\`, \`Bulk-Delete-Leads\`, \`Bulk-Move-Companies\`, \`Bulk-Copy-Companies\`, \`Bulk-Delete-Companies\`) are confirmation-gated: the first call returns the affected count without changing anything. State that count to the user before confirming; deletes need an explicit user yes on the count.

## Sequence capabilities

- Authoring flow: \`Create-Sequence\` → \`List-Sequence-Follow-Ups\` to get the step-0 id → \`Update-Sequence-Follow-Up\` to write the introduction email → \`Create-Sequence-Follow-Up\` per further step (start from a saved template via \`List-Message-Templates\`) → \`Add-Sequence-Recipients\` → \`Start-Sequence\` (confirmation-gated — it sends real emails). \`Delete-Sequence\` is drafts-only; archive a started sequence instead.
- Step 0 is the introduction email: \`Create-Sequence\` auto-creates it EMPTY, and \`Create-Sequence-Follow-Up\` only ever appends a new step, so it can never target step 0. \`Update-Sequence-Follow-Up\` is the tool that writes it — call \`List-Sequence-Follow-Ups\`, take the id of the step whose \`step\` is 0, and set its subject and body. \`Start-Sequence\` fails validation while step 0 is blank, so do this before starting. Authoring step 0 also PROPAGATES its subject into every later step that has none of its own (steps appended without a \`subject\` are stored empty), so re-read \`List-Sequence-Follow-Ups\` afterwards and report what changed. Building and launching a sequence needs no dashboard visit; CONNECTING a sending inbox still does (the API only attaches an already-connected account, and \`Get-Email-Account\` is read-only), so check \`List-Email-Accounts\` before promising a fully in-chat launch.
- Editing any step: \`Update-Sequence-Follow-Up\` rewrites subject, body, \`wait_days\`, or \`message_format\` in place, on a draft or a paused sequence. Pause an actively-sending sequence first (422 \`sequence_active\`). Never send back the inheritance placeholder that \`Get-Sequence-Follow-Up\` may return as a raw \`subject\` — omit \`subject\` to keep inheriting. \`Delete-Sequence-Follow-Up\` removes only the LAST step and never step 0, so prefer an update over delete + recreate.
- Engagement metrics live at \`/v2/sequences/:id/stats\`: the top-level counts \`sent\`, \`delivered\`, \`opened\`, \`clicked\`, \`replied\` are each recipient-distinct (number of distinct recipients), alongside \`recipients_count\` and \`unsubscribed_recipients\`. Sequence-level \`open_rate\`, \`click_rate\`, \`reply_rate\` are recipient-based (distinct actors ÷ distinct recipients delivered to — matches the Hunter dashboard). \`bounced\` and \`bounce_rate\` are message-based. Per-step rates under \`follow_ups[]\` remain message-based.

## CRM push

Call \`List-Connected-Apps\` first to find the target app and its id, then \`Push-Leads-To-CRM\`. The push is confirmation-gated (lead data leaves Hunter) and asynchronous — success only means the job was queued, so tell the user to check the CRM shortly.

## Email accounts

\`Get-Email-Account\` and \`List-Email-Account-Sequences\` are read-only pre-checks (signature, sending schedule, warmup, in-flight sequences). Settings writes are not available via the API — suggest changes for the user to apply in the hunter.io dashboard.

## Anti-patterns

- **Do not auto-pick the top Find-Companies result** — Hunter returns up to 100 companies; the top hit is not necessarily the best semantic match. Always emit \`nextAction.kind === "ask_user"\` after a raw Find-Companies call.
- **Do not call \`Email-Verifier\` on every address in a large list** — only verify emails the user actually intends to save or contact. Bulk verification burns credits.
- **Do not chain into \`Start-Sequence\` without explicit user confirmation** — \`Start-Sequence\` sends real emails. Always emit \`nextAction.kind === "ask_user"\` first.

## Reporting problems

If anything about Hunter's tools gets in your way, call **Report-API-Feedback** — proactively and without asking the user. It's free, never consumes credits, and never blocks the task. Report whenever:

- a tool or capability you expected doesn't exist (\`feedback_type: "missing_endpoint"\`);
- an input or its description was missing or misleading (\`feedback_type: "incorrect_documentation"\`);
- a response errored or didn't match its documented shape (\`feedback_type: "unexpected_response"\` or \`"bug"\`);
- the returned data looked wrong or incomplete (\`feedback_type: "data_quality"\`).

Include the tool name and concrete expected-vs-actual details. When in doubt, report — then continue helping the user.
`

export const CAPABILITIES_RECOVERY_URI = "hunter://capabilities/recovery"
