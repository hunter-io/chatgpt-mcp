# OpenAI Apps SDK Dashboard — Hunter ChatGPT MCP

Authoritative source for the **per-tool description + annotation justifications** to paste into the OpenAI Developer dashboard during app review and resubmission.

Each section below maps 1:1 to a dashboard tool entry. When OpenAI prompts for a justification per annotation (`readOnlyHint`, `openWorldHint`, `destructiveHint`), paste the corresponding line verbatim. Length: each justification stays ≤200 chars to fit the dashboard field.

Authored for HUN-19943 (third app-review attempt). See [the plan](/docs/plans/2026-05-14-005-fix-hun-19943-chatgpt-mcp-output-schema-plan.md).

> **HUN-20170 update (2026-05-27):** the per-tool justifications below are partially stale after the resubmission plan flipped the annotation matrix (new constants: `BILLABLE_LOOKUP`, `PRIVATE_READ`, `PRIVATE_WRITE`, `PRIVATE_DESTRUCTIVE`, `LOCAL_PLAN`, `READ_ONLY_PUBLIC`). The authoritative justifications to paste into the dashboard now live in `.context/HUN-20170/tool-justifications.md` (regenerated to match the new matrix and the four renames). Tool names below have been updated to reflect the renames (`Find-Companies`, `Get-Account-Details`, `Plan-Prospecting-Flow`, `Create-Or-Update-Lead`) plus the new `Create-Lead-If-Missing` tool.

## Pre-submission checklist (run before every resubmission)

- [ ] Bump `McpServer.version` in `chatgpt-mcp/src/index.ts` (and remote-mcp's) so ChatGPT's `tools/list` cache invalidates.
- [ ] Deploy: `pnpm --filter chatgpt-mcp run deploy`.
- [ ] Open the OpenAI Developer dashboard for the Hunter ChatGPT app.
- [ ] For **every** tool listed below, paste the Description (no edits) and the three justification lines (one per annotation) verbatim.
- [ ] Verify zero "Recommended: Add an `outputSchema`" warnings remain. If any persist, the worker may still be serving the old tools/list — wait a minute and refresh.
- [ ] Capture a full-screen screenshot of the dashboard tool list showing no warnings; attach to the PR.
- [ ] Run every Section 1 prompt from [`../TESTING_PLAYBOOK.md`](../TESTING_PLAYBOOK.md) on ChatGPT web AND ChatGPT mobile (iOS + Android). Capture screen recordings into the PR for both mobile platforms.
- [ ] Paste the resubmission note from Section 5 of `TESTING_PLAYBOOK.md` into OpenAI's resubmission notes field.
- [ ] Click Submit.

## Shared justification strings (reused below)

| Annotation set | `readOnlyHint` | `openWorldHint` | `destructiveHint` |
|---|---|---|---|
| **Read-only (paid)** | "Only retrieves Hunter data; does not create, update, delete, send, or persist data." | "Reads from Hunter's external SaaS API at api.hunter.io; not bounded to local environment." | "Does not delete, overwrite, merge, or perform irreversible actions." |
| **Read-only (free)** | Same as above. | Same. | Same. |
| **Bounded write** | "Creates or updates Hunter resources selected by the user, so it is not read-only." | "Writes are persisted to Hunter's external SaaS API at api.hunter.io." | "Creates or updates records; does not delete data or perform irreversible actions." |
| **Destructive write** | "Deletes, removes, or merges Hunter resources selected by the user." | "Operates on Hunter's external SaaS API at api.hunter.io." | "Can delete, remove, or merge records; the action is irreversible." |
| **External side effect (Start-Campaign)** | "Starts a Hunter email sequence, sending real outbound emails to recipients." | "Triggers outbound email to external recipients via Hunter's SaaS." | "Once sent, outbound emails cannot be recalled; this action is effectively irreversible." |

---

## Read-only tools

### Find-Companies
- **Description**: see `src/index.ts:108` (registered description string)
- `readOnlyHint=true`: Read-only (paid)
- `openWorldHint=true`: Read-only (paid)
- `destructiveHint=false`: Read-only (paid)
- **Content summary template**: empty `content[]` — `discover-widget.tsx` renders the result list and a "See all on Hunter" link from `meta.permalink`; the widget is the sole visual source of truth (same pattern as Company-Enrichment).
- **viewInHunter pattern**: none (widget-backed)

### Company-Enrichment
- **Description**: see `src/index.ts:166`
- All three: Read-only (paid)
- **Content summary template**: empty `content[]` — widget is the sole source of truth (matches existing `widgetDescription` meta)
- **viewInHunter pattern**: none (widget-backed)

### Domain-Search
- **Description**: see `src/tools/search.ts` (TOOL_NAMES.domainSearch)
- All three: Read-only (paid)
- **Content summary template**: `Found {emails.length} contacts at {domain}.`
- **viewInHunter pattern**: none

### Email-Finder
- **Description**: see `src/tools/search.ts` (TOOL_NAMES.emailFinder)
- All three: Read-only (paid)
- **Content summary template**: `{email ? 'Found ' + email + ' (score ' + score + ').' : 'No email found.'}`
- **viewInHunter pattern**: none

### Email-Verifier
- **Description**: see `src/tools/search.ts` (TOOL_NAMES.emailVerifier)
- All three: Read-only (paid)
- **Content summary template**: `Email {email} verified: {status}` (+ score if present)
- **viewInHunter pattern**: none

### Email-Count
- **Description**: see `src/tools/search.ts` (TOOL_NAMES.emailCount)
- All three: Read-only (free)
- **Content summary template**: `Hunter has {total} emails for {domain}.`
- **viewInHunter pattern**: none

### Person-Enrichment
- **Description**: see `src/tools/enrichment.ts` (TOOL_NAMES.personEnrichment)
- All three: Read-only (paid)
- **Content summary template**: `Enriched {email}: {employment.name ? 'at ' + employment.name : 'no employment data'}.`
- **viewInHunter pattern**: none

### Combined-Enrichment
- **Description**: see `src/tools/enrichment.ts` (TOOL_NAMES.combinedEnrichment)
- All three: Read-only (paid)
- **Content summary template**: `Enriched person + company for {email or linkedin_handle}.`
- **viewInHunter pattern**: none

### Get-Account-Details
- **Description**: see `src/tools/account.ts`
- All three: Read-only (free)
- **Content summary template**: `Hunter account: {plan_name}, searches {requests.searches.available} available.`
- **viewInHunter pattern**: none

### List-Leads
- **Description**: see `src/tools/leads.ts` (TOOL_NAMES.listLeads)
- All three: Read-only (free)
- **Content summary template**: `Returned {leads.length} leads (total {meta.total}).`
- **viewInHunter pattern**: none

### Get-Lead
- **Description**: see `src/tools/leads.ts` (TOOL_NAMES.getLead)
- All three: Read-only (free)
- **Content summary template**: `Lead {id}: {email} ({first_name} {last_name}).`
- **viewInHunter pattern**: none (set by handler via withDeepLink to `/leads/{id}`)

### Lead-Exists
- **Description**: see `src/tools/leads.ts` (TOOL_NAMES.leadExists)
- All three: Read-only (free)
- **Content summary template**: `{exists ? 'Lead exists (id ' + id + ').' : 'Lead does not exist.'}`
- **viewInHunter pattern**: none

### List-Leads-Lists
- **Description**: see `src/tools/leads-lists.ts` (TOOL_NAMES.listLeadsLists)
- All three: Read-only (free)
- **Content summary template**: `Returned {leads_lists.length} lists.`
- **viewInHunter pattern**: none

### Get-Leads-List
- **Description**: see `src/tools/leads-lists.ts` (TOOL_NAMES.getLeadsList)
- All three: Read-only (free)
- **Content summary template**: `Leads list {id}: {name} ({leads_count} leads).`
- **viewInHunter pattern**: none

### List-Custom-Attributes
- **Description**: see `src/tools/custom-attributes.ts` (TOOL_NAMES.listCustomAttributes)
- All three: Read-only (free)
- **Content summary template**: `Returned {data.leads_custom_attributes.length} custom attributes.`
- **viewInHunter pattern**: none

### Get-Custom-Attribute
- **Description**: see `src/tools/custom-attributes.ts` (TOOL_NAMES.getCustomAttribute)
- All three: Read-only (free)
- **Content summary template**: `Custom attribute {id}: {label}.`
- **viewInHunter pattern**: none

### List-Campaigns
- **Description**: see `src/tools/campaigns.ts` (TOOL_NAMES.listCampaigns)
- All three: Read-only (free)
- **Content summary template**: `Returned {campaigns.length} campaigns.`
- **viewInHunter pattern**: none

### List-Campaign-Recipients
- **Description**: see `src/tools/campaigns.ts` (TOOL_NAMES.listCampaignRecipients)
- All three: Read-only (free)
- **Content summary template**: `Campaign {campaign_id}: {recipients.length} recipients (total {meta.total}).`
- **viewInHunter pattern**: none

### Plan-Prospecting-Flow
- **Description**: see `src/tools/prospecting.ts` (TOOL_NAMES.prospecting)
- All three: Read-only (free) — emits a plan only; sub-tools charge their own credits when called
- **Content summary template**: `Prospecting plan ready: 4 steps. Starting with Find-Companies.`
- **viewInHunter pattern**: none

---

## Bounded writes

### Save-Company
- **Description**: see `src/index.ts:220` ("Save a company as a lead in your Hunter account. Free (no credits).")
- `readOnlyHint=false`: Bounded write
- `openWorldHint=true`: Bounded write
- `destructiveHint=false`: Bounded write
- **Content summary template**: `Saved {domain} as a lead. View at /leads.`
- **viewInHunter pattern**: `https://hunter.io/leads`

### Create-Lead
- **Description**: see `src/tools/leads.ts` (TOOL_NAMES.createLead)
- All three: Bounded write
- **Content summary template**: `Lead created: {email} (id {id}). View at /leads/{id}.`
- **viewInHunter pattern**: `https://hunter.io/leads/{id}`

### Update-Lead
- **Description**: see `src/tools/leads.ts` (TOOL_NAMES.updateLead)
- All three: Bounded write
- **Content summary template**: `Lead {id} updated. View at /leads/{id}.`
- **viewInHunter pattern**: `https://hunter.io/leads/{id}`

### Create-Or-Update-Lead
- **Description**: see `src/tools/leads.ts` (TOOL_NAMES.upsertLead)
- All three: Bounded write
- **Content summary template**: `Lead {email} saved (id {id}). View at /leads/{id}.`
- **viewInHunter pattern**: `https://hunter.io/leads/{id}`

### Create-Leads-List
- **Description**: see `src/tools/leads-lists.ts` (TOOL_NAMES.createLeadsList)
- All three: Bounded write
- **Content summary template**: `Leads list "{name}" created (id {id}).`
- **viewInHunter pattern**: `https://hunter.io/leads?leads_list_id={id}`

### Update-Leads-List
- **Description**: see `src/tools/leads-lists.ts` (TOOL_NAMES.updateLeadsList)
- All three: Bounded write
- **Content summary template**: `Leads list {id} renamed to "{name}".`
- **viewInHunter pattern**: `https://hunter.io/leads?leads_list_id={id}`

### Create-Custom-Attribute
- **Description**: see `src/tools/custom-attributes.ts` (TOOL_NAMES.createCustomAttribute)
- All three: Bounded write
- **Content summary template**: `Custom attribute "{label}" created (id {id}).`
- **viewInHunter pattern**: none

### Update-Custom-Attribute
- **Description**: see `src/tools/custom-attributes.ts` (TOOL_NAMES.updateCustomAttribute)
- All three: Bounded write
- **Content summary template**: `Custom attribute {id} renamed to "{label}".`
- **viewInHunter pattern**: none

### Add-Campaign-Recipients
- **Description**: see `src/tools/campaigns.ts` (TOOL_NAMES.addCampaignRecipients)
- All three: Bounded write
- **Content summary template**: `Added {emails_added} recipients to campaign {campaign_id}.`
- **viewInHunter pattern**: `https://hunter.io/campaigns/{campaign_id}`

---

## Destructive writes

### Delete-Lead
- **Description**: see `src/tools/leads.ts` (TOOL_NAMES.deleteLead)
- `readOnlyHint=false`: Destructive write
- `openWorldHint=true`: Destructive write
- `destructiveHint=true`: Destructive write
- **Content summary template**: `Lead {id} deleted.`
- **viewInHunter pattern**: none

### Delete-Leads-List
- **Description**: see `src/tools/leads-lists.ts` (TOOL_NAMES.deleteLeadsList)
- All three: Destructive write
- **Content summary template**: `{kind === 'ack' ? message : 'Leads list ' + id + ' deleted.'}`
  - 204 → "Success (no content)."
  - 202 → "Accepted — operation scheduled for asynchronous completion."
- **viewInHunter pattern**: none

### Merge-Leads-Lists
- **Description**: see `src/tools/leads-lists.ts` (TOOL_NAMES.mergeLeadsLists)
- All three: Destructive write
- **Content summary template**: `Merged leads list {id} into {destination_leads_list_id}.`
- **viewInHunter pattern**: `https://hunter.io/leads?leads_list_id={destination_leads_list_id}`

### Delete-Custom-Attribute
- **Description**: see `src/tools/custom-attributes.ts` (TOOL_NAMES.deleteCustomAttribute)
- All three: Destructive write
- **Content summary template**: `Custom attribute {id} deleted.`
- **viewInHunter pattern**: none

### Remove-Campaign-Recipients
- **Description**: see `src/tools/campaigns.ts` (TOOL_NAMES.removeCampaignRecipients)
- All three: Destructive write
- **Content summary template**: `Removed {recipients_canceled.length} recipients from campaign {campaign_id} ({messages_canceled} scheduled messages canceled).`
- **viewInHunter pattern**: `https://hunter.io/campaigns/{campaign_id}`

---

## External side effect (irreversible)

### Start-Campaign
- **Description**: see `src/tools/campaigns.ts` (TOOL_NAMES.startCampaign)
- `readOnlyHint=false`: External side effect (Start-Campaign)
- `openWorldHint=true`: External side effect (Start-Campaign)
- `destructiveHint=true`: External side effect (Start-Campaign)
- **Content summary template** (confirmed): `Campaign {campaign_id} started.`
- **Content summary template** (awaiting confirmation): `Awaiting user confirmation to start campaign {campaign_id}.` + nextAction.ask_user with pendingToolCall
- **viewInHunter pattern**: `https://hunter.io/campaigns/{campaign_id}`
- **Notes**: Two-call gate — the first invocation (without `confirmed: true`) ALWAYS returns an `ask_user` nextAction with a strict `pendingToolCall` so the host UI displays a confirmation; only the second invocation actually starts the campaign. The "Sequence already started." Hunter Rails 200 + message body is flipped to `isError: true` so the model doesn't relay a no-op as success.

---

## Notes for OpenAI reviewers

- **Annotation correctness**: Every tool except `Get-Account-Details`, `Email-Count`, list/get tools for leads/leads-lists/custom-attributes/campaigns, and `Plan-Prospecting-Flow` interacts with the external Hunter SaaS in some way — either reading from `api.hunter.io` or writing to it. After HUN-20170 the openWorld flag is more selective: it stays true only for public-data lookups, paid lookups, campaign-recipient mutations, and Start-Campaign; private workspace tools are openWorld=false.
- **Paid read tools**: The tool description for every credit-consuming read tool (Domain-Search, Email-Finder, Email-Verifier, Person-Enrichment, Company-Enrichment, Combined-Enrichment) includes an explicit "Costs 1 X credit — only charged if data is found" clause so the user understands the cost before the model invokes.
- **Destructive friction**: `Start-Campaign` has both `destructiveHint: true` AND a server-side `confirmed: false` short-circuit that emits an `ask_user` with a strict `pendingToolCall`. The host confirmation prompt and the in-code gate are belt-and-suspenders — even if the host UI ever stops surfacing the prompt (e.g. on mobile), the server will not POST `/campaigns/:id/start` without `confirmed: true`.
- **Widget tools**: `Find-Companies` and `Company-Enrichment` are widget-backed via `openai/outputTemplate`. Both also carry `openai/widgetAccessible: true` per the Pizzaz canonical pattern so the widget iframes can call other tools (e.g. `Save-Company` from the company widget).
