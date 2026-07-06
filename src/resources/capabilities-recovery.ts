// Hunter capability recovery patterns — exposed at MCP resource URI
// `hunter://capabilities/recovery`. Read by the model when ambiguous user
// intent (e.g., "find CMOs at fintech") needs translation to documented
// Hunter API enums. See docs/plans/2026-04-28-feat-chatgpt-app-review-readiness-plan.md
// (Pillar 5).
//
// Source of truth for filter enum values: Hunter API v2 docs. If this string
// drifts from the API, the API wins — file a bug.

export const CAPABILITIES_RECOVERY_MD = `# Hunter Capability Recovery Patterns

This resource documents how to translate ambiguous user intent into precise Hunter API filter values. **Read this BEFORE calling Find-Companies or Domain-Search** when the user's request uses fuzzy job titles, role descriptions, or ambiguous criteria — Hunter does not match arbitrary free-text titles, only the documented enums.

## Translating job titles → \`department\` + \`seniority\`

Hunter's \`domain_search\` accepts \`seniority\` ∈ \`{junior, senior, executive}\` and \`department\` ∈ \`{executive, it, finance, management, sales, legal, support, hr, marketing, communication, education, design, health, operations}\`. Common ambiguous user phrasings translate as:

| User says | \`department\` | \`seniority\` |
|---|---|---|
| "CMO", "Chief Marketing Officer", "VP Marketing" | \`marketing\` | \`executive\` |
| "CTO", "VP Engineering", "Chief Technology Officer" | \`it\` | \`executive\` |
| "CFO", "VP Finance" | \`finance\` | \`executive\` |
| "CEO", "Founder", "President" | \`executive\` | \`executive\` |
| "Head of Sales", "VP Sales" | \`sales\` | \`executive\` |
| "Head of People", "VP HR", "CHRO" | \`hr\` | \`executive\` |
| "Head of Design", "Design Lead" | \`design\` | \`executive\` |
| "Senior Engineer", "Staff Engineer" | \`it\` | \`senior\` |
| "Senior Marketer", "Marketing Manager" | \`marketing\` | \`senior\` |
| "Junior Developer", "Junior Engineer" | \`it\` | \`junior\` |
| "Recruiter", "Talent Acquisition" | \`hr\` | (any) |
| "Customer Success", "Support" | \`support\` | (any) |
| "Legal Counsel", "GC" | \`legal\` | (any) |
| "Operations Manager", "COO" | \`operations\` | (any) |
| "Communications", "PR" | \`communication\` | (any) |
| "Teacher", "Professor", "Instructor" | \`education\` | (any) |
| "Doctor", "Nurse", "Clinician" | \`health\` | (any) |

If the user gives a title that doesn't map cleanly (e.g., "Growth Hacker", "Developer Advocate"), call Domain-Search with \`department=marketing,sales\` (multiple values are comma-separated) and let confidence scores rank results — never refuse the request just because the exact phrase isn't an enum.

## Confidence-score interpretation

Domain-Search returns each email with a \`confidence\` field (0-100). Treat:

- **≥90:** Verified or highly likely deliverable. Use directly.
- **70-89:** Pattern-matched but unverified. **Run \`Email-Verifier\` before saving** if the user wants to send to it.
- **<70:** Inferred / lower confidence. Surface it but flag the user to manually confirm.

## When to use \`Email-Finder\` vs \`Domain-Search\`

- **\`Email-Finder\`** when the user names a specific person ("find John Smith's email at stripe.com"). Returns one email if found.
- **\`Domain-Search\`** when the user wants a list of contacts at a company ("find marketing leads at stripe.com"). Returns up to 100 emails per page.

If the user gives a person's name but no domain, ask for the company before calling either tool — Hunter cannot search by name alone.

## Find-People vs Domain-Search vs Person-Enrichment

- **\`Find-People\`** — free counts/aggregations from Hunter's public index for a set of companies (\`query\` or \`domains\`). Reports how many personal/generic emails exist per company — never actual email addresses. Use it to size a prospecting batch before spending credits.
- **\`Domain-Search\`** — reveals the actual emails, names, and positions for ONE domain. Uses credits.
- **\`Person-Enrichment\`** — profile data for a contact you already have. Never returns new email addresses.

## Saved searches

Open prospecting conversations with \`List-Saved-Searches\` ("want to rerun one of your saved searches?"). To rerun one, read its stored \`filters\`/\`name\` and reformulate them as a natural-language \`query\` for Find-Companies or Find-People — that reformulation is approximate, since those tools can't re-apply the structured filters (locations, industries, funding, technologies, include/exclude lists) verbatim. There is no update endpoint — to change a saved search, \`Delete-Saved-Search\` then \`Create-Saved-Search\`.

## Lead organization

- Call \`List-Lead-Tags\` FIRST and reuse an existing tag before creating one — near-duplicate tags ("VIP" vs "vip") fragment the user's data.
- Folders organize lists; favorites mark default lists. Neither touches the leads themselves.

## Bulk operations

All 5 bulk tools (\`Bulk-Move-Leads\`, \`Bulk-Delete-Leads\`, \`Bulk-Move-Companies\`, \`Bulk-Copy-Companies\`, \`Bulk-Delete-Companies\`) are confirmation-gated: the first call returns the affected count without changing anything. State that count to the user before confirming; deletes need an explicit user yes on the count.

## Sequence capabilities

- Authoring flow: \`Create-Sequence\` → \`Create-Sequence-Follow-Up\` per step (start from a saved template via \`List-Message-Templates\`) → \`Add-Sequence-Recipients\` → \`Start-Sequence\` (confirmation-gated — it sends real emails). \`Delete-Sequence\` is drafts-only; archive a started sequence instead.
- Step-0 caveat: \`Create-Sequence\` auto-creates the introduction email (step 0) empty, and \`Create-Sequence-Follow-Up\` only ever appends a new step — neither can set step 0's subject/body, and the v2 API has no update-follow-up endpoint yet. So a sequence built purely through these tools has a blank step 0, and \`Start-Sequence\` fails validation until step 0 is authored in the Hunter dashboard. Tell the user to write the introduction email in the dashboard before starting.
- Engagement metrics live at \`/v2/sequences/:id/stats\`: the top-level counts \`sent\`, \`delivered\`, \`opened\`, \`clicked\`, \`replied\` are each recipient-distinct (number of distinct recipients), alongside \`recipients_count\` and \`unsubscribed_recipients\`. Sequence-level \`open_rate\`, \`click_rate\`, \`reply_rate\` are recipient-based (distinct actors ÷ distinct recipients delivered to — matches the Hunter dashboard). \`bounced\` and \`bounce_rate\` are message-based. Per-step rates under \`follow_ups[]\` remain message-based.

## CRM push

Call \`List-Connected-Apps\` first to find the target app and its id, then \`Push-Leads-To-CRM\`. The push is confirmation-gated (lead data leaves Hunter) and asynchronous — success only means the job was queued, so tell the user to check the CRM shortly.

## API keys

- On OAuth connections the API-key tools return a 403 ("API keys can't be managed with an OAuth token") — relay it to the user instead of retrying; managing keys requires an API-key connection.
- \`Create-API-Key\` shows the full key value exactly once. Treat it as a secret: surface it to the user once, and never write it into leads, notes, or other tools.

## Email accounts

\`Get-Email-Account\` and \`List-Email-Account-Sequences\` are read-only pre-checks (signature, sending schedule, warmup, in-flight sequences). Settings writes are not available via the API — suggest changes for the user to apply in the hunter.io dashboard.

## Anti-patterns

- **Do not auto-pick the top Find-Companies result** — Hunter returns up to 100 companies; the top hit is not necessarily the best semantic match. Always emit \`nextAction.kind === "ask_user"\` after a raw Find-Companies call.
- **Do not call \`Email-Verifier\` on every email returned by Domain-Search** — only verify emails the user actually intends to save or contact. Bulk verification burns credits.
- **Do not chain into \`Start-Sequence\` without explicit user confirmation** — \`Start-Sequence\` sends real emails. Always emit \`nextAction.kind === "ask_user"\` first.
- **To find a person's email, use \`Domain-Search\` (a company's contacts) or \`Email-Finder\` (one named person).** Enrichment tools (Person-Enrichment, Company-Enrichment, Combined-Enrichment) return profile/company data for contacts you already have — they never return new email addresses, and there is no separate "enrich" lookup for emails. If a contact tool returns no email, report that and continue — do not call tools that are not listed.
- **Do not narrow a role to a single department/seniority pair when the brief is broader.** A title like "Head of Sales" maps to \`department=sales\` + \`seniority=executive\`, but related titles ("VP Sales", "Sales Director", "Revenue Lead") may surface under \`management\` or a different seniority. Search with the closest enum pair, then post-filter the returned rows by job title in the results — don't refuse a row just because its exact title isn't in the enum table.
- **Do not treat the return-results-only (research) flow as a free bulk-export tool.** Gathering contacts into a table for review is the default and writes nothing to Hunter, but every company searched still spends Hunter credits — credit consumption is the only limit on how much contact data a single request pulls into this chat. Search the companies the user actually asked about; do not expand a brief into a wider scrape, and do not loop over more companies than the user intends just because the data is available.

## Reporting problems

If anything about Hunter's tools gets in your way, call **Report-API-Feedback** — proactively and without asking the user. It's free, never consumes credits, and never blocks the task. Report whenever:

- a tool or capability you expected doesn't exist (\`feedback_type: "missing_endpoint"\`);
- an input or its description was missing or misleading (\`feedback_type: "incorrect_documentation"\`);
- a response errored or didn't match its documented shape (\`feedback_type: "unexpected_response"\` or \`"bug"\`);
- the returned data looked wrong or incomplete (\`feedback_type: "data_quality"\`).

Include the tool name and concrete expected-vs-actual details. When in doubt, report — then continue helping the user.
`

export const CAPABILITIES_RECOVERY_URI = "hunter://capabilities/recovery"
