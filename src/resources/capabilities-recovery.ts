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

## Sequence (campaign) capabilities

- Engagement metrics live at \`/v2/sequences/:id/stats\`: the top-level counts \`sent\`, \`delivered\`, \`opened\`, \`clicked\`, \`replied\` are each recipient-distinct (number of distinct recipients), alongside \`recipients_count\` and \`unsubscribed_recipients\`. Sequence-level \`open_rate\`, \`click_rate\`, \`reply_rate\` are recipient-based (distinct actors ÷ distinct recipients delivered to — matches the Hunter dashboard). \`bounced\` and \`bounce_rate\` are message-based. Per-step rates under \`follow_ups[]\` remain message-based.

## Anti-patterns

- **Do not auto-pick the top Find-Companies result** — Hunter returns up to 100 companies; the top hit is not necessarily the best semantic match. Always emit \`nextAction.kind === "ask_user"\` after a raw Find-Companies call.
- **Do not call \`Email-Verifier\` on every email returned by Domain-Search** — only verify emails the user actually intends to save or contact. Bulk verification burns credits.
- **Do not chain into \`Start-Campaign\` without explicit user confirmation** — \`Start-Campaign\` sends real emails. Always emit \`nextAction.kind === "ask_user"\` first.
- **To find a person's email, use \`Domain-Search\` (a company's contacts) or \`Email-Finder\` (one named person).** Enrichment tools (Person-Enrichment, Company-Enrichment, Combined-Enrichment) return profile/company data for contacts you already have — they never return new email addresses, and there is no separate "enrich" lookup for emails. If a contact tool returns no email, report that and continue — do not call tools that are not listed.
- **Do not narrow a role to a single department/seniority pair when the brief is broader.** A title like "Head of Sales" maps to \`department=sales\` + \`seniority=executive\`, but related titles ("VP Sales", "Sales Director", "Revenue Lead") may surface under \`management\` or a different seniority. Search with the closest enum pair, then post-filter the returned rows by job title in the results — don't refuse a row just because its exact title isn't in the enum table.
- **Do not treat the return-results-only (research) flow as a free bulk-export tool.** Gathering contacts into a table for review is the default and writes nothing to Hunter, but every company searched still spends Hunter credits — credit consumption is the only limit on how much contact data a single request pulls into this chat. Search the companies the user actually asked about; do not expand a brief into a wider scrape, and do not loop over more companies than the user intends just because the data is available.
`

export const CAPABILITIES_RECOVERY_URI = "hunter://capabilities/recovery"
