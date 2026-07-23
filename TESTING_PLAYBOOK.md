# ChatGPT App — Testing Playbook

> Linear: [HUN-19560](https://linear.app/hunter-io/issue/HUN-19560/testing-playbook-for-chatgpt-app)

Manual test playbook for the Hunter ChatGPT app — **V3 resubmission**. Run before every app review submission to confirm the demo video flow, the marketplace test cases, and to surface hidden bugs across all 100 tools. V3 grows the surface from 56 to 100 tools (HUN-20838…HUN-20866): sequence CRUD + follow-up authoring, message templates, lead tags, leads-list folders/favorites, bulk operations, Discover people extraction, saved searches, CRM push, webhooks, and usage/API-key management — plus the terminology migration that renamed five outreach tools and the `sequence-prep` prompt to the canonical "sequences" naming.

**How to use this doc:**
- Run every prompt in **chatgpt.com** with the deployed Hunter app installed.
- Tick the verification checkboxes as you go.
- Drop a screenshot into the slot under each prompt — these double as marketplace submission assets and demo-video reference frames.
- Fill the **Result/notes** block with anything that deviates from the pass criteria.
- A prompt only counts as `Pass` when every checkbox is ticked.

---

## Pre-flight checklist

Set this up once before you start.

- [ ] Logged into a Hunter test account with credits available
  - Credits remaining: `<!-- fill in -->`
- [ ] Hunter ChatGPT app installed in chatgpt.com
  - MCP endpoint shown by ChatGPT: `<!-- fill in -->`
  - App version shown by ChatGPT (or build date): `<!-- fill in -->`
  - Date/time of test run: `<!-- fill in -->`
- [ ] At least one configured Hunter sequence exists, with a connected sender and at least one recipient slot free
  - Sequence ID for tests: `<!-- fill in -->`
  - Sequence name: `<!-- fill in -->`
- [ ] An email account is connected to the test account — required for sequence creation (`Create-Sequence` needs a sender) and for the email-account inspection rows/edge case
  - Email account address: `<!-- fill in -->`
- [ ] At least one Hunter leads list with ≥3 leads exists
  - Leads list ID: `<!-- fill in -->`
- [ ] At least one saved message template exists — or plan to create one via `Create-Message-Template` (row MT3) before running the follow-up authoring rows
  - Template ID (if pre-existing): `<!-- fill in -->`
- [ ] (Optional) Existing lead tags and leads-list folders — not required up front; the tag/folder rows create their own
- [ ] (If available) A connected CRM app (HubSpot, Salesforce, Pipedrive…) for the CRM-push prompts — if none, mark row IN1 and edge case 3.17 as **Skipped (no connected app)** and verify the graceful "no connected apps" message instead
  - Connected CRM: `<!-- fill in or "none" -->`
- [ ] Browser console / DevTools open to capture network errors and widget rendering issues
- [ ] Fresh ChatGPT conversation per prompt unless explicitly chained — avoids context bleed between tests

> **Cost estimate for one full run:** ~25 credits total across Sections 1, 2, and 3 — unchanged from the previous revision: all 44 tools added in V3 are free, and none of the prompts added for V3 spends credits. (Hunter has a single unified credit pool — every paid call deducts from the same balance.)

---

## Section 1 — Marketplace + demo prompts

These five prompts are the official set submitted to OpenAI's marketplace and should map 1:1 to the demo video shots. They cover both widgets, the prospecting coordinator, and the destructive-action confirmation gate.

---

### 1. Discover companies (widget)

**Goal:** Showcase the Discover widget. Confirms the widget renders, results are relevant, the model does NOT auto-pick the top hit, and the "See all results on Hunter" permalink is surfaced.

**Prompt:**

```
Find software companies in San Francisco with more than 50 employees
```

**Expected tools fired:**
- [ ] `Find-Companies`

**Expected UI:**
- [ ] Discover widget renders inline (not just a text list)
- [ ] Widget shows company logos, names, locations, sizes
- [ ] At least 10 results shown
- [ ] A "See all results on Hunter" / permalink link is present in the assistant's reply
- [ ] Filters inferred from the query are visible (industry: software, location: San Francisco, size: 50+)

**Pass criteria:**
- [ ] Model does **not** auto-pick the top result for follow-up — it asks the user which company to investigate (`ask_user` next-action)
- [ ] No narrative/summary of the results outside the widget (per widget description, the UI is the source of truth)
- [ ] Permalink opens hunter.io/discover with the same query applied

**Screenshot:** `<!-- paste screenshot here -->`

**Result/notes:** `<!-- fill in -->`

**Status:** ☐ Pass ☐ Fail ☐ Blocked

---

### 2. Company overview (widget)

**Goal:** Showcase the Company-Enrichment widget. Confirms the widget renders all enrichment fields and the model offers next steps (find contacts / save as lead) without spamming narrative on top of the widget.

**Prompt:**

```
Give me an overview of stripe.com
```

**Expected tools fired:**
- [ ] `Company-Enrichment`

**Expected UI:**
- [ ] Company widget renders inline with: logo, industry, size, location, technologies, social profiles
- [ ] Funding info visible if present
- [ ] Generic email addresses listed (small set, e.g., support@, info@)
- [ ] Link to the company profile on hunter.io is shown

**Pass criteria:**
- [ ] No descriptive paragraph repeating widget content
- [ ] Model offers next steps (find contacts / save as lead / both) and lets the user choose
- [ ] Exactly 1 credit deducted (verify in Hunter dashboard after)

**Screenshot:** `<!-- paste screenshot here -->`

**Result/notes:** `<!-- fill in -->`

**Status:** ☐ Pass ☐ Fail ☐ Blocked

---

### 3. End-to-end prospecting

**Goal:** Exercise the full prospecting chain. This is the highest-value demo prompt — it shows Hunter's breadth in one flow.

**Prompt:**

```
Find 10 marketing leads at SaaS companies in Berlin and save them to a new list called "Berlin SaaS Marketing"
```

**Expected tools fired (in order):**
- [ ] `Plan-Prospecting-Flow` (coordinator — emits plan + first nextAction)
- [ ] `Find-Companies` (then user picks companies)
- [ ] `Domain-Search` (looped — once per chosen company, with `seniority` or `department` filters inferred from "marketing")
- [ ] `Email-Verifier` (per email kept)
- [ ] `Create-Leads-List` (one call, with name "Berlin SaaS Marketing")
- [ ] `Create-Or-Update-Lead` (one call per saved contact, with `leads_list_id` set to the new list)

**Pass criteria:**
- [ ] Discover returns relevant SaaS companies in Berlin
- [ ] Model presents companies and asks user to pick (does NOT auto-pick)
- [ ] After user picks, Domain-Search loops across **every** chosen company without re-asking "should I do all of them?"
- [ ] `seniority`/`department` filters are passed to Domain-Search (e.g., `department=marketing`) — verify in network panel
- [ ] Email-Verifier called only on emails the user wants to save
- [ ] Only emails returning `status: "valid"` are saved via Create-Or-Update-Lead
- [ ] New list "Berlin SaaS Marketing" appears in hunter.io/leads with the correct count
- [ ] Final assistant message includes a deep link to `https://hunter.io/leads?leads_list_id=<id>`
- [ ] No fallback to web search / LinkedIn / pattern guessing — Hunter is the only source
- [ ] Credits debited match expectation (≈20 credits for this flow: ~10 from `Domain-Search` + ~10 from `Email-Verifier`; `Find-Companies`, `Create-Leads-List`, and `Create-Or-Update-Lead` are free)

**Screenshot(s):** `<!-- paste 2-3 screenshots: Discover widget, mid-loop status, final summary with deep link -->`

**Result/notes:** `<!-- fill in -->`

**Status:** ☐ Pass ☐ Fail ☐ Blocked

---

### 4. Sequence recipients

**Goal:** Verify sequence listing + adding recipients. Pre-req: at least one sequence exists with a free recipient slot (see pre-flight).

**Prompt:**

```
List my Hunter sequences, then add patrick@stripe.com and dylan@stripe.com to the one I pick.
```

**Expected tools fired:**
- [ ] `List-Sequences`
- [ ] `Add-Sequence-Recipients` (after user picks a sequence)

**Pass criteria:**
- [ ] All sequences shown with id, name, status (the V3 enriched listing also carries recipient/sent counts)
- [ ] After user picks, `Add-Sequence-Recipients` is called with `sequence_id` and `emails: ["patrick@stripe.com", "dylan@stripe.com"]`
- [ ] Final message includes deep link to `https://hunter.io/sequences/<id>`
- [ ] Recipients visible in Hunter UI under that sequence after the call
- [ ] Reminder shown that subject/body/sender must be configured (in the Hunter UI or via `Create-Sequence-Follow-Up`) before starting

**Screenshot:** `<!-- paste screenshot here -->`

**Result/notes:** `<!-- fill in -->`

**Status:** ☐ Pass ☐ Fail ☐ Blocked

---

### 5. Start-Sequence confirmation gate

**Goal:** Verify the destructive-action confirmation gate works. We will say **no** at the gate — no real emails are sent.

**Prompt:** (use the sequence id from prompt 4 or pre-flight)

```
Start sequence <SEQUENCE_ID>
```

**Expected tools fired:**
- [ ] `Start-Sequence` (first call, returns `ask_user` with `pendingToolCall`)

**Pass criteria:**
- [ ] ChatGPT shows a destructive-hint confirmation UI (per `destructiveHint: true` annotation)
- [ ] Confirmation question includes the actual recipient count, e.g. *"This will send real emails to N recipients."*
- [ ] When you respond **"no, don't start it"**, the model stops and does NOT call `Start-Sequence` again
- [ ] No `POST /sequences/<id>/start` request appears in the network panel
- [ ] Sequence in Hunter UI remains in its prior state (paused/draft) — verify after

**Screenshot:** `<!-- paste screenshot of the confirmation prompt -->`

**Result/notes:** `<!-- fill in -->`

**Status:** ☐ Pass ☐ Fail ☐ Blocked

---

## Section 2 — Tool coverage matrix

One minimal prompt per tool not exercised by Section 1. Run these in fresh conversations. The goal is signal that the tool fires, returns sensible data, and surfaces a deep link where applicable — not a full UX review.

> **Convention:** placeholders in `<ANGLE_BRACKETS>` mean "substitute a real value from your test account before pasting." `[X]` checkbox = pass.

### Account

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| A1 | `Get-Account-Details` | `How many Hunter credits do I have left?` | Returns plan name + remaining credits | ☐ | |

### Search

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| S1 | `Email-Finder` | `What is Patrick Collison's email at stripe.com?` | Returns one email + confidence score | ☐ | |
| S2 | `Email-Verifier` | `Is patrick@stripe.com a valid email?` | Returns status (valid / invalid / accept_all / etc.) | ☐ | |
| S3 | `Email-Count` | `How many email addresses does Hunter have for stripe.com?` | Returns total + personal/generic split. Free, no credits | ☐ | |
| S4 | `Domain-Search` (filtered) | `List the engineering leads at stripe.com — only senior or executive` | Calls `Domain-Search` with `domain=stripe.com`, `department=it`, `seniority=senior,executive` | ☐ | |

> **Found-only (HUN-21313):** on the ChatGPT app, `Domain-Search` hits the found-only endpoint (`/v2/domain-search/found`) — it returns only published (found) addresses and never pattern-generated/inferred ones. There is intentionally **no** separate `Domain-Search-Found` tool to test here; that tool exists only on the Claude connector (`remote-mcp`), where the full-fidelity `Domain-Search` is kept and the found-only variant is added alongside it. Nothing to verify in the ChatGPT app beyond S4 returning found data.

### Enrichment

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| E1 | `Person-Enrichment` | `Tell me everything you know about patrick@stripe.com` | Returns name/title/company/socials. 1 credit | ☐ | |
| E2 | `Combined-Enrichment` | `Enrich patrick@stripe.com — give me both the person and the company` | One call to `Combined-Enrichment` (not separate Person + Company calls) | ☐ | |
| E3 | `Combined-Enrichment` (LinkedIn handle) | `Enrich the LinkedIn profile patrickcollison` | Call uses `linkedin_handle`, not `email` | ☐ | |

### Leads

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| L1 | `List-Leads` | `Show me my most recent leads in Hunter` | Returns up to 100 leads | ☐ | |
| L2 | `Get-Lead` | `Get details for lead <LEAD_ID>` | Returns one lead's full record | ☐ | |
| L3 | `Create-Lead` | `Add a new lead: name "Test Person", email "test+playbook@hunter.io", at example.com` | Creates new lead, returns deep link to `/leads/<id>` | ☐ | |
| L4 | `Update-Lead` | `Update lead <LEAD_ID> — set position to "Head of Testing"` | Lead's position field updated, deep link returned | ☐ | |
| L5 | `Lead-Exists` | `Do I already have a lead with email test+playbook@hunter.io?` | Returns true/false | ☐ | |
| L6 | `Save-Company` | `Save netflix.com to my Hunter leads as a company` | Saves company, deep link to `/leads` | ☐ | |
| L7 | `Delete-Lead` (destructive) | `Delete lead <LEAD_ID>` (use the one from L3) | Confirmation prompt shown (destructive hint), then on accept the lead is removed. Verify it's gone via L1 | ☐ | |

### Leads lists

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| LL1 | `List-Leads-Lists` | `Show me all my Hunter leads lists` | Returns list of leads-lists | ☐ | |
| LL2 | `Get-Leads-List` | `Get details for leads list <LEADS_LIST_ID>` | Returns one list's details + lead count | ☐ | |
| LL3 | `Update-Leads-List` | `Rename leads list <LEADS_LIST_ID> to "Playbook Renamed"` | List renamed, deep link returned | ☐ | |
| LL4 | `Merge-Leads-Lists` (destructive) | `Merge leads list <SRC_ID> into <DEST_ID>` | Confirmation prompt; on accept, source deleted and leads moved to dest | ☐ | |
| LL5 | `Delete-Leads-List` (destructive) | `Delete leads list <DISPOSABLE_LEADS_LIST_ID>` | Confirmation prompt; on accept, list removed | ☐ | |

> Tip: create a throwaway list before running LL4/LL5 so you don't lose real data. `Create-Leads-List` is exercised by Section 1 prompt 3, so no row needed.

### Custom attributes

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| CA1 | `List-Custom-Attributes` | `What custom attributes do I have on my Hunter leads?` | Returns list with id + label | ☐ | |
| CA2 | `Create-Custom-Attribute` | `Create a new custom attribute called "Playbook Test"` | Returns new attribute with id | ☐ | |
| CA3 | `Get-Custom-Attribute` | `Get details for custom attribute <CA_ID from CA2>` | Returns one attribute | ☐ | |
| CA4 | `Update-Custom-Attribute` | `Rename custom attribute <CA_ID from CA2> to "Playbook Renamed"` | Label updated | ☐ | |
| CA5 | `Delete-Custom-Attribute` (destructive) | `Delete custom attribute <CA_ID from CA2>` | Confirmation prompt; on accept, removed | ☐ | |

### Sequence recipients

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| C1 | `List-Sequence-Recipients` | `Who are the recipients of sequence <SEQUENCE_ID>?` | Returns recipient list | ☐ | |
| C2 | `Remove-Sequence-Recipients` (destructive) | `Remove patrick@stripe.com and dylan@stripe.com from sequence <SEQUENCE_ID>` (use Section 1 prompt 4) | Confirmation prompt; on accept, recipients removed | ☐ | |

> `Add-Sequence-Recipients` and `Start-Sequence` are exercised by Section 1 prompts 4 and 5. `List-Sequences` also fires there and has its own enriched-output row (SQ6).

### Email accounts (HUN-20196 + V3)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| EA1 | `List-Email-Accounts` | `Show me the email accounts connected to my Hunter account and their sending status` | Read-only list of sending accounts: email, name, provider, daily limit, status (active/paused/warming) | ☐ | |
| EA2 | `Get-Email-Account` (V3) | `How is my sending account <EMAIL_ACCOUNT> set up?` | Full config: signature, sending schedule, daily limit, BCC, reply-to, custom tracking domain, warmup status | ☐ | |
| EA3 | `List-Email-Account-Sequences` (V3) | `Which sequences use <EMAIL_ACCOUNT>?` | Sequences attached to that account with id, name, status | ☐ | |

### Sequences (HUN-20196 + V3 CRUD/authoring)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| SQ1 | `List-Sequence-Follow-Ups` | `Show the follow-up steps of sequence <SEQUENCE_ID>` | Steps ordered by step: subject, body, wait_days, message_format, messages_sent, variant | ☐ | |
| SQ2 | `Get-Sequence-Stats` | `How is sequence <SEQUENCE_ID> performing?` | recipients/sent/delivered/opened/clicked/replied + rates (0–1) + per-step breakdown | ☐ | |
| SQ3 | `Pause-Sequence` (write) | `Pause sequence <SEQUENCE_ID>` | Sequence paused (stops sending), reversible. Draft/archived → invalid_input (`sequence_not_active`) | ☐ | |
| SQ4 | `Resume-Sequence` (write) | `Resume sequence <SEQUENCE_ID>` | Resumed after validation; surfaces invalid_input if the email account is disconnected or the schedule is empty | ☐ | |
| SQ5 | `Archive-Sequence` (destructive) | `Archive sequence <SEQUENCE_ID>` | Confirmation prompt (irreversible via API); on accept archived and can't be resumed. Draft → invalid_input (`sequence_not_started`) | ☐ | |
| SQ6 | `List-Sequences` (V3, enriched) | `Show me all my Hunter sequences` | Enriched listing: id, name, status, email account, recipient/sent counts. Also exercised by Section 1 prompt 4 | ☐ | |
| SQ7 | `Get-Sequence` (V3) | `Get details for sequence <SEQUENCE_ID>` | One sequence's full record: name, status, email account, schedule, recipient counts | ☐ | |
| SQ8 | `Create-Sequence` (V3, write) | `Create a sequence called "Playbook Outreach" using my email account <EMAIL_ACCOUNT>` | Draft sequence created, id + deep link to `/sequences/<id>` returned; POST carries an `Idempotency-Key` header (check network panel) | ☐ | |
| SQ9 | `Update-Sequence` (V3, write) | `Rename sequence <SEQUENCE_ID> to "Playbook Renamed"` | Sequence updated, deep link returned | ☐ | |
| SQ10 | `Delete-Sequence` (V3, destructive) | `Delete sequence <DRAFT_SEQUENCE_ID>` | Confirmation prompt; drafts only — deleting a started sequence returns invalid_input | ☐ | |
| SQ11 | `Get-Sequence-Follow-Up` (V3) | `Show step 2 of sequence <SEQUENCE_ID>` | One step: subject, body, wait_days, position | ☐ | |
| SQ12 | `Create-Sequence-Follow-Up` (V3, write) | `Add a follow-up to sequence <SEQUENCE_ID>: subject "Quick nudge", wait 3 days` | Step appended with automatic step assignment (subject/body/wait_days); model offers a saved message template as the body before drafting from scratch | ☐ | |
| SQ13 | `Delete-Sequence-Follow-Up` (V3, destructive) | `Delete the last step of sequence <SEQUENCE_ID>` | Confirmation; last step only — deleting a middle step returns an error | ☐ | |

> Tip: use a paused/test sequence for SQ3–SQ5 and a disposable draft for SQ8–SQ13. Archiving (SQ5) cannot be undone via the API, and Delete-Sequence (SQ10) only works on drafts — use disposable sequences.

### Company lists (HUN-20196)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| CL1 | `List-Company-Lists` | `Show me my Hunter company lists` | Static + dynamic lists with name, type, folder id, created_at | ☐ | |
| CL2 | `Get-Company-List` | `Get details for company list <LIST_ID>` | One list + companies_count | ☐ | |
| CL3 | `Create-Company-List` (write) | `Create a company list called "Playbook Targets"` | Creates the list, returns its id | ☐ | |
| CL4 | `Update-Company-List` (destructive) | `Rename company list <LIST_ID> to "Playbook Renamed", then move it out of its folder` | Rename overwrites (confirm); passing a null folder un-files it (Unfiled) | ☐ | |
| CL5 | `Delete-Company-List` (destructive) | `Delete company list <DISPOSABLE_LIST_ID>` | Confirmation; on accept removed (202 async if the list still has companies) | ☐ | |

### Company list folders (HUN-20196)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| FO1 | `List-Company-List-Folders` | `Show my company-list folders` | Folders with name, color, company_lists_count | ☐ | |
| FO2 | `Create-Company-List-Folder` (write) | `Create a company-list folder "Playbook" with color 3489F9` | Creates the folder, returns its id | ☐ | |
| FO3 | `Update-Company-List-Folder` (destructive) | `Rename folder <FOLDER_ID> to "Playbook Renamed"` | Renamed (confirm); 403 if not the owner/team admin | ☐ | |
| FO4 | `Delete-Company-List-Folder` (destructive) | `Delete folder <FOLDER_ID>` | Confirmation; on accept removed (its lists are un-filed, not deleted) | ☐ | |

### Company list favorites & membership (HUN-20196)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| ME1 | `Favorite-Company-List` (write) | `Mark company list <LIST_ID> as a favorite` | List favorited; reversible | ☐ | |
| ME2 | `Unfavorite-Company-List` (write) | `Remove company list <LIST_ID> from my favorites` | List unfavorited | ☐ | |
| ME3 | `Add-Company-To-List` (write) | `Add company <COMPANY_ID> to company list <LIST_ID>` | Company added to the static list (returns id, domain). Dynamic list → not_found | ☐ | |
| ME4 | `Remove-Company-From-List` (write) | `Remove company <COMPANY_ID> from company list <LIST_ID>` | Membership removed (reversible by re-adding) | ☐ | |

### Connected apps (HUN-20196)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| CN1 | `List-Connected-Apps` | `What apps are connected to my Hunter account?` | Read-only list: provider, name, category, provider_email, connected_at | ☐ | |
| CN2 | `Get-Connected-App` | `Show the field mappings for connected app <APP_ID>` | One app + attribute_mappings (target_field ↔ source_field) | ☐ | |

> The HUN-20196 rows above (EA1, SQ1–SQ5, CL1–CL5, FO1–FO4, ME1–ME4, CN1–CN2) predate V3; rows marked (V3) exercise the HUN-20838…HUN-20866 additions. Use a throwaway list/folder/sequence for the destructive rows (CL4/CL5, FO3/FO4, SQ5/SQ10/SQ13) so you don't lose real data.

### Message templates (V3)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| MT1 | `List-Message-Templates` | `Show my saved message templates` | Templates with id, name, subject | ☐ | |
| MT2 | `Get-Message-Template` | `Show message template <TEMPLATE_ID>` | One template: name, subject, body | ☐ | |
| MT3 | `Create-Message-Template` (write) | `Save a message template called "Playbook Intro" with subject "Hello {{first_name}}"` | Template created, id returned | ☐ | |
| MT4 | `Update-Message-Template` (write) | `Rename message template <TEMPLATE_ID> to "Playbook Renamed"` | Template updated | ☐ | |
| MT5 | `Delete-Message-Template` (destructive) | `Delete message template <TEMPLATE_ID>` | Confirmation; on accept removed | ☐ | |

> Templates integrate with follow-up authoring: when writing a follow-up (SQ12), the model should offer an existing template as the step body before drafting from scratch.

### Lead tags (V3)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| TG1 | `List-Lead-Tags` | `What tags do I have on my Hunter leads?` | Tags with id + name | ☐ | |
| TG2 | `Create-Lead-Tag` (write) | `Create a lead tag called "Playbook"` | Tag created, id returned | ☐ | |
| TG3 | `Update-Lead-Tag` (write) | `Rename tag <TAG_ID> to "Playbook Renamed"` | Tag renamed | ☐ | |
| TG4 | `Delete-Lead-Tag` (destructive) | `Delete tag <TAG_ID>` | Confirmation; on accept removed from all tagged leads | ☐ | |
| TG5 | `Add-Tag-To-Lead` (write) | `Tag lead <LEAD_ID> with "Playbook"` | Tag attached to the lead (visible in Hunter UI) | ☐ | |
| TG6 | `Remove-Tag-From-Lead` (write) | `Remove the "Playbook" tag from lead <LEAD_ID>` | Tag detached (reversible by re-adding) | ☐ | |

### Leads-list folders & favorites (V3)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| LF1 | `List-Leads-List-Folders` | `Show my leads-list folders` | Folders with name + list count | ☐ | |
| LF2 | `Create-Leads-List-Folder` (write) | `Create a leads-list folder called "Playbook"` | Folder created, id returned | ☐ | |
| LF3 | `Update-Leads-List-Folder` (write) | `Rename leads-list folder <FOLDER_ID> to "Playbook Renamed"` | Folder renamed | ☐ | |
| LF4 | `Delete-Leads-List-Folder` (destructive) | `Delete leads-list folder <FOLDER_ID>` | Confirmation; on accept removed (its lists are un-filed, not deleted) | ☐ | |
| LF5 | `Favorite-Leads-List` (write) | `Mark leads list <LEADS_LIST_ID> as a favorite` | List favorited; reversible | ☐ | |
| LF6 | `Unfavorite-Leads-List` (write) | `Remove leads list <LEADS_LIST_ID> from my favorites` | List unfavorited | ☐ | |

### Bulk operations (V3)

All five bulk tools are confirmation-gated: the confirmation must state the affected count, and the two deletes require a **second** explicit confirmation.

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| BK1 | `Bulk-Move-Leads` (destructive) | `Move all leads from list <SRC_LEADS_LIST_ID> to list <DEST_LEADS_LIST_ID>` | Confirmation states the lead count; on accept, leads moved | ☐ | |
| BK2 | `Bulk-Delete-Leads` (destructive) | `Delete all leads in list <DISPOSABLE_LEADS_LIST_ID>` | Double confirmation (count-stating gate + explicit re-confirm); on accept, leads removed | ☐ | |
| BK3 | `Bulk-Move-Companies` (destructive) | `Move all companies from list <SRC_LIST_ID> to list <DEST_LIST_ID>` | Confirmation states the company count; on accept, companies moved | ☐ | |
| BK4 | `Bulk-Copy-Companies` (destructive) | `Copy the companies in list <SRC_LIST_ID> into list <DEST_LIST_ID>` | Confirmation states the count; companies copied, source list untouched | ☐ | |
| BK5 | `Bulk-Delete-Companies` (destructive) | `Delete all companies in list <DISPOSABLE_LIST_ID>` | Double confirmation; on accept, companies removed | ☐ | |

> Use throwaway lists for BK2/BK5 — bulk deletes are irreversible.

### Discover people & saved searches (V3)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| DP1 | `Find-People` | `Which of these companies have marketing contacts?` (after a `Find-Companies` run in the same conversation) | People extraction across the picked companies: email counts + department aggregations. Free, no credits | ☐ | |
| DP2 | `List-Saved-Searches` | `Show my saved Discover searches` | Saved searches with id + name | ☐ | |
| DP3 | `Get-Saved-Search` | `Show saved search <SEARCH_ID>` | One saved search + its stored filters | ☐ | |
| DP4 | `Create-Saved-Search` (write) | `Save this Discover search as "UK Fintech"` | Search saved with the current filters, id returned | ☐ | |
| DP5 | `Delete-Saved-Search` (destructive) | `Delete saved search <SEARCH_ID>` | Confirmation; on accept removed. No update endpoint exists — to change a search, delete and recreate | ☐ | |

### Integrations (V3)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| IN1 | `Push-Leads-To-CRM` (destructive, open-world) | `Push the leads in list <LEADS_LIST_ID> to my <CRM>` | Confirmation gate (data leaves Hunter); on accept an async job is queued and the model says results will appear in the CRM shortly. No connected app → graceful message; mark **Skipped (no connected app)** | ☐ | |
| IN2 | `List-Webhooks` | `Show my Hunter webhooks` | Webhooks with id, URL, events, status | ☐ | |
| IN3 | `Update-Webhook` (destructive) | `Disable webhook <WEBHOOK_ID>` | Webhook updated (reversible) | ☐ | |

### Usage & API keys (V3)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| UK1 | `Get-Usage` | `How many credits have I used this month?` | Usage summary: searches/verifications/credits used vs plan quota. Free, no credits deducted | ☐ | |
| UK2 | `List-API-Keys` | `List my Hunter API keys` | Masked key values only. Over OAuth → expect the 403 (see caveat below), relayed clearly | ☐ | |
| UK3 | `Create-API-Key` (destructive) | `Create a new Hunter API key` | Confirmation gate first (security-sensitive); over OAuth → expect the 403, relayed gracefully | ☐ | |
| UK4 | `Delete-API-Key` (destructive) | `Delete API key <KEY_ID>` | Confirmation gate first; over OAuth → expect the 403, relayed gracefully | ☐ | |

> **OAuth caveat (UK2–UK4):** the ChatGPT app connects via OAuth, and the Hunter API refuses API-key management with an OAuth token — it returns **403 "API keys can't be managed with an OAuth token"**. These rows PASS when the model relays that error cleanly and points the user to the Hunter dashboard — NOT when a key is actually listed/created/deleted. See edge case 3.18.

---

## Section 3 — Edge cases & known gotchas

These aren't tied to a single tool — they verify cross-cutting behavior. Run after Sections 1 and 2.

### 3.1 Capability recovery (ambiguous role translation)

**Goal:** The MCP exposes a capabilities-recovery resource that maps fuzzy job titles to the documented `seniority`/`department` enums. Verify the model reads it before running Domain-Search.

**Prompt:**

```
Find me CMOs at fintech startups in France
```

- [ ] Domain-Search calls use `seniority=executive` AND `department=marketing` (not literal `position=CMO`)
- [ ] Same test with "Head of Sales" → `seniority=executive`, `department=sales`
- [ ] Same test with "VP Engineering" → `seniority=executive`, `department=it`

**Result/notes:** `<!-- fill in -->`

### 3.2 No-results handling

**Prompt:**

```
Find contacts at thisdoesnotexistasdf12345.com
```

- [ ] Domain-Search returns 0 results
- [ ] Model emits a `complete` next-action with "no contacts found" — not an error
- [ ] No verification or upsert calls follow

**Result/notes:** `<!-- fill in -->`

### 3.3 Pagination

**Prompt:**

```
Show me the next page of contacts at stripe.com
```

(after a previous Domain-Search at stripe.com in the same conversation)

- [ ] Model passes `offset=10` (or appropriate page-2 offset) to `Domain-Search`
- [ ] Returns different emails than the first page

**Result/notes:** `<!-- fill in -->`

### 3.4 Duplicate dedup via Create-Or-Update-Lead

**Prompt:**

```
Save patrick@stripe.com to my Hunter leads with position "CEO".
Then save patrick@stripe.com to my Hunter leads with position "Co-Founder".
```

- [ ] Both calls use `Create-Or-Update-Lead` (not `Create-Lead`)
- [ ] Hunter dashboard shows ONE lead for that email, with position = "Co-Founder" (latest write wins)
- [ ] No duplicate leads created

**Result/notes:** `<!-- fill in -->`

### 3.5 Already-started sequence

**Pre-req:** A sequence that is already running.

**Prompt:**

```
Start sequence <ALREADY_RUNNING_SEQUENCE_ID>
```

(answer "yes" at the confirmation gate)

- [ ] Confirmation gate shown (gate fires regardless of sequence state)
- [ ] After confirmation, model surfaces an error like *"Sequence already started."* — not a false success
- [ ] No deep-link claiming a fresh start

**Result/notes:** `<!-- fill in -->`

### 3.6 Auth failure surface

**Goal:** Make sure a stale/invalid API key produces a clear 401, not silent failures.

**Test:** Disconnect the Hunter app from ChatGPT (Settings → Apps → Disconnect), then re-prompt:

```
How many Hunter credits do I have?
```

- [ ] ChatGPT prompts to reconnect / re-auth, with a clear message
- [ ] After reconnecting, the same prompt succeeds

**Result/notes:** `<!-- fill in -->`

### 3.7 Deep link sanity

For each tool that returns a deep link (Save-Company, Create/Update/Create-Or-Update-Lead, Create/Update/Merge-Leads-List, Create/Update-Sequence, Add/Remove-Sequence-Recipients, Start-Sequence), open the link and confirm:

- [ ] Link opens hunter.io
- [ ] Page shows the resource that was just created/modified
- [ ] No 404s

**Result/notes:** `<!-- fill in -->`

### 3.8 Widget responsiveness

- [ ] Discover widget renders correctly on desktop chatgpt.com
- [ ] Discover widget renders correctly on mobile (chat.openai.com on phone)
- [ ] Company widget renders correctly on both
- [ ] No layout overflow / truncation
- [ ] Widget border preference respected (`widgetPrefersBorder: true`)

**Result/notes:** `<!-- fill in -->`

### 3.9 Named prompts (slash commands in ChatGPT)

If the ChatGPT host surfaces the registered MCP prompts as slash commands or quick actions:

- [ ] `prospect` is selectable
- [ ] `build-list` is selectable
- [ ] `sequence-prep` is selectable (title "Sequence Prep" — renamed in V3; no legacy-named prompt remains)
- [ ] Each one prefills the expected guidance text and runs end-to-end

**Result/notes:** `<!-- fill in -->`

### 3.10 Direct Discover → multi-company investigate (no Prospecting coordinator)

**Goal:** Verify the model loops `Domain-Search` across every picked company and stays on Hunter tools when the user enters via direct `Find-Companies` (bypassing the `Plan-Prospecting-Flow` coordinator). This is the most reviewer-realistic entry path: a natural prompt, no slash-command, no coordinator.

**Background:** A real review-prep session (2026-05-05) reproduced this failure: `Domain-Search` ran for company 1 only, the model fell back to a non-Hunter browse/fetch tool for company 2, and supplemented with ungrounded "public-looking" commentary. This test guards against regression after the Section 1 hardening lands.

**Prompts (run both in the same fresh conversation):**

```
Find e-commerce companies in London with more than 200 employees
```

```
Investigate the top two
```

**Expected tools fired:**
- [ ] `Find-Companies` (after prompt 1)
- [ ] `Domain-Search` for picked company 1 (after prompt 2)
- [ ] `Domain-Search` for picked company 2 (after prompt 2)
- [ ] `Email-Verifier` whenever a Domain-Search response includes `nextAction.kind === "call_tool"` pointing to it

**Pass criteria — three diagnostic checks, all must hold per run:**
- [ ] `Domain-Search` is called for **both** picked companies (not just the first)
- [ ] No tool outside the Hunter MCP is invoked for company/contact lookup (no web search, no browse, no fetch). Adjacent tools the user explicitly asks for are fine
- [ ] `Email-Verifier` is called whenever `nextAction` suggests it

**Run protocol:** Repeat in 3 fresh conversations. Behaviour is non-deterministic; **pass = ≥ 2 of 3 runs meet all criteria**. Falling short of 2/3 triggers the structural fast-follow (server-side `pending_companies` next-action) — see `docs/plans/2026-05-05-feat-chatgpt-mcp-direct-discover-hardening-plan.md` → "Fast-follow."

| Run | Result | Tools fired (paste from network panel) | Notes |
|-----|--------|----------------------------------------|-------|
| 1   | ☐ Pass ☐ Fail | `<!-- fill in -->` | `<!-- fill in -->` |
| 2   | ☐ Pass ☐ Fail | `<!-- fill in -->` | `<!-- fill in -->` |
| 3   | ☐ Pass ☐ Fail | `<!-- fill in -->` | `<!-- fill in -->` |

**Screenshots (one per run, showing the conversation through final summary):** `<!-- paste 3 screenshots -->`

**Overall:** ☐ Pass (≥ 2/3) ☐ Fail (< 2/3 → trigger fast-follow)

---

### 3.11 Research-mode table: the reporter's brief (HUN-20651)

**Goal:** Verify the research/return-a-table path end to end. This is the exact brief that surfaced HUN-20651: the model fell out of the bulk loop into per-company confirmations, re-verified already-valid emails, called a non-existent `enrich` endpoint, and never returned after 20+ minutes. The fix (research as the default mode + conditional verify + enrichment guardrail) makes this a fast, gate-light table — no save chain, no re-verification of already-valid rows, no invented endpoints.

**Prompt (one fresh conversation, no slash-command):**

```
Use Hunter to find 20 SaaS companies in France with 50-200 employees. For each company, find verified email addresses for people in Head of Sales or VP Sales roles. Return the results in a table.
```

**Expected behaviour:** `Find-Companies` discovers the SaaS companies, the model relays ONE bulk credit-consent prompt, then `Domain-Search` loops company-to-company (carrying `seniority=executive`, `department=sales`) and the run ends with a rendered table. Because the brief says "verified", `Email-Verifier` may run for rows whose Domain-Search verification was NOT already `valid` — but never for rows that were. No `Create-Lead-If-Missing` (the user asked for a table, not a save).

**Pass criteria — five BINARY network-panel checks, all must hold per run:**
- [ ] The run ends with a **table** rendered to the user (does not stall or trail off).
- [ ] After the **one** batch-approval prompt, **zero** further confirmation prompts appear before the table is returned.
- [ ] **No `Email-Verifier` call** for any email whose `Domain-Search` row was already `valid` (cross-check the Domain-Search response `verification.status` / `verification_source: "domain_search"` against the verifier calls in the panel).
- [ ] **Zero calls to any non-existent endpoint** — nothing named `enrich`, no `/enrich`, no web browse/fetch substituted for a Hunter lookup.
- [ ] **No `Create-Lead-If-Missing`** (or any other lead-write tool) is called — research mode writes nothing.

**Run protocol:** Repeat in 3 fresh conversations. Behaviour is non-deterministic; **pass = ≥ 2 of 3 runs meet all five criteria**. A `< 2/3` result means the research loop is not holding the default — re-check that `save_leads` stayed unset and that the consent gate carried `confirmed_credit_use` forward.

| Run | Result | Tools fired (paste from network panel) | Notes |
|-----|--------|----------------------------------------|-------|
| 1   | ☐ Pass ☐ Fail | `<!-- fill in -->` | `<!-- fill in -->` |
| 2   | ☐ Pass ☐ Fail | `<!-- fill in -->` | `<!-- fill in -->` |
| 3   | ☐ Pass ☐ Fail | `<!-- fill in -->` | `<!-- fill in -->` |

**Screenshots (one per run, showing the conversation through the final table):** `<!-- paste 3 screenshots -->`

**Overall:** ☐ Pass (≥ 2/3) ☐ Fail (< 2/3)

---

### 3.12 End-to-end sequence creation in conversation (V3)

**Goal:** V3 makes sequences composable entirely in chat. Verify the full authoring chain: create → author steps (with template offer) → add recipients → start gate.

**Prompt (one conversation):**

```
Create a new outreach sequence called "Playbook E2E" from my <EMAIL_ACCOUNT> account, write a short intro email, add a follow-up 3 days later, and add patrick@stripe.com as a recipient.
```

- [ ] `Create-Sequence` fires first — a draft is created, and the POST carries an `Idempotency-Key` header (network panel)
- [ ] `Create-Sequence-Follow-Up` fires once per step with subject/body/wait_days; step positions are auto-assigned (the model never asks for manual step numbers)
- [ ] Before drafting a body from scratch, the model checks saved templates (`List-Message-Templates`) and offers one if it exists
- [ ] `Add-Sequence-Recipients` adds patrick@stripe.com to the draft
- [ ] `Start-Sequence` is never called uninvited; if you then say "start it", the destructive confirmation gate appears with the recipient count (say no)
- [ ] Final message deep-links to `https://hunter.io/sequences/<id>`

**Result/notes:** `<!-- fill in -->`

### 3.13 Organize-as-you-go tagging (V3)

**Goal:** The model should reuse existing tags before minting new ones.

**Prompt:**

```
Tag my lead patrick@stripe.com as a priority prospect
```

- [ ] `List-Lead-Tags` is called first, and a matching existing tag is offered before any create
- [ ] `Create-Lead-Tag` is only called if no suitable tag exists — and the model says it's creating one
- [ ] `Add-Tag-To-Lead` attaches the tag; the lead shows it in the Hunter UI

**Result/notes:** `<!-- fill in -->`

### 3.14 Bulk gates: count-stating move, double-confirm delete (V3)

**Prompts (fresh conversations):**

```
Move everything from leads list <SRC_LEADS_LIST_ID> into <DEST_LEADS_LIST_ID>
```

```
Delete all the leads in list <DISPOSABLE_LEADS_LIST_ID>
```

- [ ] `Bulk-Move-Leads` confirmation states the exact number of leads that will move (*"This will move N leads…"*) before executing
- [ ] Answering "no" aborts — no write request in the network panel
- [ ] `Bulk-Delete-Leads` requires TWO confirmations: the count-stating gate plus an explicit re-confirm that the delete is irreversible
- [ ] A single "yes" does not delete — the second confirmation must also be answered

**Result/notes:** `<!-- fill in -->`

### 3.15 Find-Companies → Find-People extraction (V3)

**Prompts (same conversation):**

```
Find fintech companies in Amsterdam with 50+ employees
```

```
Which of these have marketing contacts, and how many?
```

- [ ] `Find-People` is called with the picked companies (no per-company `Domain-Search` loop for this aggregate question)
- [ ] Response shows per-company email counts and department aggregations
- [ ] Zero credits deducted — `Find-People` is free (verify balance after)
- [ ] Model offers `Domain-Search` as the paid next step to reveal actual addresses

**Result/notes:** `<!-- fill in -->`

### 3.16 Saved search: save + rerun by name (V3)

**Prompts (two conversations):**

Conversation 1:

```
Find SaaS companies in Portugal with 11-50 employees, then save this search as "Portugal SaaS"
```

Conversation 2 (fresh):

```
Run my saved search "Portugal SaaS"
```

- [ ] `Create-Saved-Search` stores the Discover filters under the given name
- [ ] In the fresh conversation, the model resolves the name via `List-Saved-Searches`/`Get-Saved-Search` and reruns `Find-Companies` with the stored filters
- [ ] If asked to *edit* the saved search, the model explains there is no update endpoint and offers delete + recreate (`Delete-Saved-Search` → `Create-Saved-Search`)

**Result/notes:** `<!-- fill in -->`

### 3.17 CRM push: confirm + async messaging (V3)

**Pre-req:** a connected CRM app (see pre-flight). If none, run anyway and verify the graceful path.

**Prompt:**

```
Push the leads in list <LEADS_LIST_ID> to my CRM
```

- [ ] Confirmation gate fires before any push — the prompt makes clear data will leave Hunter for the external CRM (open-world)
- [ ] On accept, the tool returns an async job acknowledgement; the model says the sync runs in the background and results will appear in the CRM shortly — no false "already synced" claim
- [ ] With no connected app: the model relays a clean "no connected apps" message and points to the Hunter integrations page — no retry loop, no invented CRM. Mark **Skipped (no connected app)** in that case

**Result/notes:** `<!-- fill in -->`

### 3.18 API-key management over OAuth: expect the 403, relayed gracefully (V3)

**Prompt:**

```
List my Hunter API keys, then create a new one called "playbook"
```

- [ ] `List-API-Keys` (and, past its gate, `Create-API-Key`) return **403** — the ChatGPT app connects via OAuth, and the Hunter API refuses key management with an OAuth token
- [ ] The model relays the actual reason (*"API keys can't be managed with an OAuth token"*) and suggests managing keys in the Hunter dashboard — it does NOT loop, retry, or hallucinate a key
- [ ] `Create-API-Key` still shows its confirmation gate BEFORE the call (security-sensitive), even though the call will 403

**Result/notes:** `<!-- fill in -->`

### 3.19 Email-account inspection (V3)

**Prompts (same conversation):**

```
How is my sending account <EMAIL_ACCOUNT> set up?
```

```
What's using that account?
```

- [ ] `Get-Email-Account` returns the full config: signature, sending schedule, daily limit, BCC, reply-to, custom tracking domain, warmup status
- [ ] `List-Email-Account-Sequences` lists the sequences attached to that account
- [ ] Both are read-only — no write requests in the network panel

**Result/notes:** `<!-- fill in -->`

### 3.20 Terminology regression: no legacy outreach wording (V3)

**Goal:** The V3 terminology migration renamed five outreach tools and the `sequence-prep` prompt. Verify no legacy wording survives anywhere user-visible.

- [ ] The tool list in ChatGPT's app settings shows only `…Sequence…` names for the outreach family
- [ ] Run Section 1 prompts 4–5 and read every assistant message: the outreach objects are called "sequences" throughout — grep an exported conversation for the legacy term if unsure
- [ ] The `sequence-prep` prompt (title "Sequence Prep") appears under the app's prompts; no legacy-named prompt remains
- [ ] Error strings, confirmation prompts, and deep-link labels all say "sequence"

**Result/notes:** `<!-- fill in -->`

### 3.21 Idempotency spot-check (best-effort, manual) (V3)

**Goal:** Every resource-creating POST sends an `Idempotency-Key` header automatically (HUN-18680), and `POST /sequences` retries once on network failure reusing the same key — so a blip never creates duplicate sequences.

- [ ] Network panel shows `Idempotency-Key` on the `Create-Sequence` POST (and on other create calls, e.g. `Create-Leads-List`)
- [ ] Best-effort: simulate a blip (DevTools → Network → brief offline/throttle) during a `Create-Sequence` and let the retry land — exactly ONE new sequence exists afterwards, not two
- [ ] If the blip can't be reproduced, mark this **Manual/best-effort — header verified only**; the header check alone is acceptable

**Result/notes:** `<!-- fill in -->`

---

## Run summary

After completing all sections, fill this in.

| Section | Total | Pass | Fail | Blocked |
|---------|-------|------|------|---------|
| 1 — Marketplace prompts | 5 | | | |
| 2 — Tool coverage matrix | 92 | | | |
| 3 — Edge cases | 21 | | | |
| **Total** | **118** | | | |

**Overall verdict:** ☐ Ready for app review submission ☐ Needs fixes before submission

**Blocking issues:** `<!-- fill in -->`

**Submission asset checklist:**
- [ ] Demo video recorded covering Section 1 prompts 1, 2, 3 (and 4 or 5 if it fits the runtime)
- [ ] Five marketplace test prompts copied from Section 1 into the OpenAI submission form
- [ ] Screenshots from Section 1 attached to submission
- [ ] All Section 3 edge cases passed (none are show-stoppers individually but together they prove robustness)

---

## Section 5 — Resubmission notes (paste verbatim into OpenAI submission form)

Use this block when filling out the "Notes for the reviewer" field on the
OpenAI Apps SDK submission form. Pre-empts the reviewer-edge-cases the V3
implementation knowingly accepts as trade-offs, and summarizes what changed
in this resubmission (note E); surfacing them proactively beats letting a
reviewer discover them on a test run.

### A. Bulk credit consent is enforced server-side

Bulk prospecting flows on paid Hunter lookups (Domain-Search,
Email-Verifier, Person/Company/Combined-Enrichment) require **one upfront
credit-cost approval per batch**, enforced by a server-side
`confirmed_credit_use` guard on `Domain-Search`. The first call in a
multi-company batch returns an `ask_user` `nextAction` carrying the credit
estimate; after the user approves, subsequent chained calls in the same
batch proceed without re-prompting because the flag propagates through
the `nextAction.suggestedArgs` carry. Single-call paid lookups surface the
per-call credit cost in the assistant's user-facing narration before
invoking. This is intentional under our v3 annotation posture — the host's
destructive-confirmation prompt would otherwise fire on every chained call
and the 50-company prospecting loop becomes user-hostile.

### B. Hunter MCP scope vs. dashboard parity

Hunter MCP V3 covers email discovery, verification, enrichment,
lead/sequence read-write, and — new in this submission — full sequence
authoring, message templates, lead organization (tags, folders,
favorites), bulk lead/company operations, Discover people extraction,
saved searches, CRM push, webhooks, and usage/email-account/API-key
surfaces. Async **bulk verification** and a few smaller parity items
(Author-Finder, the full Discover filter set) remain on the roadmap.
Reviewers who ask the agent to queue a bulk verification job will see a
clean "I can't do that yet" response from the tool surface — that is the
surface telling the truth, not a bug. The web app exposes these; the MCP
will follow in a future cycle.

### C. Title-vs-canonical-name dashboard surface

The six weakest-named billable tools carry an `annotations.title` field
with a verb-form human-readable label (`Find Emails By Domain`, `Find
Person Email`, `Verify Email`, `Enrich Person`, `Enrich Company`, `Enrich
Person And Company`). Canonical `name` values are unchanged
(`Domain-Search`, `Email-Finder`, etc.) to keep blast radius small for
this resubmission. If the dashboard card surfaces only the canonical name
and not the title, we will upgrade to canonical kebab-case renames on the
same PR before merging — the contingency commit is a six-line `TOOL_NAMES`
edit plus the mirrored byte-aligned edit in remote-mcp.

### D. Privacy posture summary

- `Get-Account-Details` returns plan name and per-product credit balances
  only. Name, email, and team ID are stripped server-side before reaching
  the model.
- Person- and Combined-Enrichment use `.strict()` schemas with audited
  field allowlists. Future Hunter API additions are silently dropped
  unless a coordinated schema bump + privacy-policy disclosure update
  ships first.
- Tool responses contain no API keys, OAuth tokens, JWTs, session IDs,
  trace IDs, request IDs, or correlation IDs — these are scrubbed
  server-side via the credential-shape regex set and the
  `INJECTED_FIELD_NAMES` strip pass.

### E. V3 scope: sequences terminology migration + 44 new free tools

**Terminology migration.** Five outreach tools were renamed to the
canonical product term — these tools hit `/v2/sequences/*` and the product
calls the objects "sequences": `List-Sequences`,
`List-Sequence-Recipients`, `Add-Sequence-Recipients`,
`Remove-Sequence-Recipients`, and `Start-Sequence` replace their
legacy-named predecessors from the previous submission. The matching named
prompt is now `sequence-prep` (title "Sequence Prep"). Behavior is
unchanged; only the names moved.

**New tool families and annotation rationale.** 44 tools were added
(HUN-20838…HUN-20866): sequence CRUD + follow-up authoring, message
templates, lead tags, leads-list folders/favorites, bulk lead/company
operations, Discover people extraction (`Find-People`) + saved searches,
CRM push + webhooks, and usage/email-account/API-key surfaces. Annotations
follow the established posture:

- **Reads** are `readOnlyHint: true` + `openWorldHint: false` — private
  reads of the user's own Hunter data.
- **Creates** are private, non-destructive writes (`destructiveHint:
  false`, `openWorldHint: false`).
- **Updates, deletes, and bulk destructive operations** carry
  `destructiveHint: true` so the host confirms. Bulk confirmations state
  the affected record count; bulk deletes require a second explicit
  confirmation.
- **`Push-Leads-To-CRM`** is the one `openWorldHint: true` write, because
  lead data leaves Hunter for the user's external CRM. It is
  confirmation-gated and returns an async job acknowledgement.
- **`Create-API-Key` / `Delete-API-Key`** are confirmation-gated as
  security-sensitive. Over the app's OAuth connection the Hunter API
  refuses key management with a 403 ("API keys can't be managed with an
  OAuth token"), which the model relays to the user.
- **Billable lookups are unchanged** — every tool added in V3 is free.

**Idempotency.** Every resource-creating POST now sends an
`Idempotency-Key` header automatically (HUN-18680), and `POST /sequences`
retries once on network failure reusing the same key — a retried create
can never produce a duplicate sequence.

---

## Section 6 — OpenAI submission form: test-case autofill script

The OpenAI Apps SDK submission form has a **Test cases** section (positive `version.test_cases.*` + `version.negative_test_cases.*` fields). Paste the snippet below into the browser DevTools console **on the submission-form page** to fill every row at once and length-check it. It mirrors the form's field-name scheme and sets values React-safely via `setNativeValue`.

**Before running:** in the form, add **16 positive** test-case rows and **3 negative** rows (the script fills existing inputs — it does not create rows). Substitute `<ANGLE_BRACKET>` placeholders with real test-account values first. Field limits enforced by the script: `description ≤200`, `user_prompt ≤500`, `tools_triggered ≤200`, `expected_output ≤300`. Cases 1–5 cover the original surface; 6–12 cover the HUN-20196 additions (email accounts, sequences, company lists/folders, membership/favorites, connected apps); 13–16 cover the V3 additions (sequence authoring, bulk operations, Find-People extraction, usage).

```js
(() => {
  const DATA = {
    test_cases: [
      {
        description: "Find companies by industry and location",
        user_prompt: "Using Hunter, find pharmaceutical companies headquartered in the United Kingdom.",
        tools_triggered: "Find-Companies",
        expected_output:
          "A Discover widget/list of matching UK pharmaceutical companies, showing company details and a Hunter link to view the full result set. No leads are saved yet."
      },
      {
        description: "Enrich a known company and save it",
        user_prompt: "Using Hunter, show me the company profile for gsk.com, then save the company to my Hunter Leads.",
        tools_triggered: "Company-Enrichment, Save-Company",
        expected_output:
          "A company profile card for gsk.com with enrichment details, followed by a successful Save-Company result or an already-saved message with a Hunter Leads link."
      },
      {
        description: "Find contacts for a domain, verify, and save",
        user_prompt:
          "Using Hunter, find one marketing contact at hubspot.com, verify the email, and save it as a lead only if the email is valid.",
        tools_triggered: "Domain-Search, Email-Verifier, Create-Lead-If-Missing",
        expected_output:
          "Hunter returns a contact from hubspot.com, verifies deliverability, and saves it only if valid. If the lead already exists, it reports no changes were made."
      },
      {
        description: "Run a multi-company prospecting flow with consent",
        user_prompt:
          "Using Hunter, find 3 marketing leads at SaaS companies in Spain and save valid contacts to my leads.",
        tools_triggered:
          "Plan-Prospecting-Flow, Find-Companies, Domain-Search, Email-Verifier, Create-Lead-If-Missing",
        expected_output:
          "A prospecting plan starts with company discovery, asks before bulk credit use, then after approval verifies and saves valid contacts without overwriting existing leads."
      },
      {
        description: "Review account and sequences without sending emails",
        user_prompt:
          "Using Hunter, show my account details, list my sequences, and show recipients for one sequence if any exist. Do not add recipients or start a sequence.",
        tools_triggered: "Get-Account-Details, List-Sequences, List-Sequence-Recipients",
        expected_output:
          "Account/credit details and a sequence list are returned. If a sequence exists, recipient statuses are shown. No recipients are added and no sequence is started."
      },
      {
        description: "List connected sending accounts before outreach",
        user_prompt:
          "Using Hunter, list the email accounts connected to my account and tell me which are active versus paused or warming.",
        tools_triggered: "List-Email-Accounts",
        expected_output:
          "A read-only list of the user's sending accounts with email, name, provider, daily limit, and sending status (active / paused / warming). No changes are made."
      },
      {
        description: "Review a sequence's steps and performance",
        user_prompt:
          "Using Hunter, show the follow-up steps of sequence <SEQUENCE_ID> and its open, click, and reply rates.",
        tools_triggered: "List-Sequence-Follow-Ups, Get-Sequence-Stats",
        expected_output:
          "The sequence's ordered follow-up steps plus aggregated stats (recipients, sent, delivered, open/click/reply rates) and a per-step breakdown. No emails are sent."
      },
      {
        description: "Pause then resume an active sequence",
        user_prompt: "Using Hunter, pause sequence <SEQUENCE_ID>, then resume it again.",
        tools_triggered: "Pause-Sequence, Resume-Sequence",
        expected_output:
          "The sequence is paused so it stops sending, then resumed. Resume re-validates and reports an error if the email account is disconnected or the schedule is empty. Both actions are reversible."
      },
      {
        description: "Archive a finished sequence (irreversible)",
        user_prompt: "Using Hunter, archive sequence <SEQUENCE_ID>.",
        tools_triggered: "Archive-Sequence",
        expected_output:
          "Because archiving is irreversible via the API, a confirmation is requested first; on approval the sequence is archived and can no longer be resumed. Archiving a draft returns an error."
      },
      {
        description: "Create and organize company lists",
        user_prompt:
          "Using Hunter, create a company list called 'UK Pharma' and a folder called 'Targets', then show my company lists and folders.",
        tools_triggered: "Create-Company-List, Create-Company-List-Folder, List-Company-Lists, List-Company-List-Folders",
        expected_output:
          "A new company list and folder are created, then the user's company lists (static or dynamic) and folders are listed. No companies are added to the list yet."
      },
      {
        description: "Save a company to a list and favorite it",
        user_prompt:
          "Using Hunter, add company <COMPANY_ID> to company list <LIST_ID>, then mark that list as a favorite.",
        tools_triggered: "Add-Company-To-List, Favorite-Company-List",
        expected_output:
          "The company is added to the static list and the list is marked as a favorite. Both are reversible (remove the company, or unfavorite the list)."
      },
      {
        description: "View connected CRM integrations (read-only)",
        user_prompt:
          "Using Hunter, what apps are connected to my account, and show the field mappings for one of them.",
        tools_triggered: "List-Connected-Apps, Get-Connected-App",
        expected_output:
          "A read-only list of connected apps (provider, name, category, connected date) and, for one app, its field mappings (Hunter field to integration field). No changes are made."
      },
      {
        description: "Create a sequence with follow-ups and recipients in chat",
        user_prompt:
          "Using Hunter, create a sequence called 'Playbook Outreach' from my connected email account, add a first email and a follow-up after 3 days, then add patrick@stripe.com as a recipient. Do not start it.",
        tools_triggered: "Create-Sequence, Create-Sequence-Follow-Up, Add-Sequence-Recipients",
        expected_output:
          "A draft sequence is created with two authored steps and one recipient, with a Hunter link to review it. The sequence is not started and no emails are sent."
      },
      {
        description: "Bulk move leads with a count-stating confirmation",
        user_prompt:
          "Using Hunter, move all leads from leads list <SRC_LIST_ID> to leads list <DEST_LIST_ID>.",
        tools_triggered: "Bulk-Move-Leads",
        expected_output:
          "Before anything moves, a confirmation states how many leads are affected. Only after the user approves are the leads moved to the destination list; declining aborts with no change."
      },
      {
        description: "Extract people availability from discovered companies",
        user_prompt:
          "Using Hunter, find fintech companies in Berlin, then tell me which of them have marketing contacts and how many, without spending credits.",
        tools_triggered: "Find-Companies, Find-People",
        expected_output:
          "Company discovery runs first, then Find-People returns per-company email counts and department breakdowns for free. No credits are spent and no addresses are revealed yet."
      },
      {
        description: "Check credit usage without spending credits",
        user_prompt: "Using Hunter, how many credits have I used this month and how many do I have left?",
        tools_triggered: "Get-Usage",
        expected_output:
          "A free usage summary is returned showing credits used versus the plan quota for the current period. No credits are deducted by the check itself."
      }
    ],
    negative_test_cases: [
      {
        description: "Hunter word used in an unrelated context",
        user_prompt: "What does hunter-gatherer mean in anthropology?"
      },
      {
        description: "Sales writing request without lead data lookup",
        user_prompt:
          "Write a cold email template for pharmaceutical sales outreach, but do not look up companies or contacts."
      },
      {
        description: "Consumer discovery outside Hunter prospecting",
        user_prompt: "Find vegan restaurants near me for dinner tonight."
      }
    ]
  };

  const MAX = {
    description: 200,
    user_prompt: 500,
    tools_triggered: 200,
    expected_output: 300
  };

  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc =
      Object.getOwnPropertyDescriptor(proto, "value") ||
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value") ||
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");

    desc.set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findField(primaryName, fallbackId) {
    return (
      document.querySelector(`[name="${CSS.escape(primaryName)}"]`) ||
      document.getElementById(fallbackId)
    );
  }

  const rows = [];
  const errors = [];

  DATA.test_cases.forEach((tc, i) => {
    const fields = [
      ["description", `version.test_cases.${i}.description`, `version.test_cases.${i}.description`],
      ["user_prompt", `version.test_cases.${i}.user_prompt`, `version.test_cases.${i}.user_prompt`],
      ["tools_triggered", `version.test_cases.${i}.tools_triggered`, `version.test_cases.${i}.tool_triggered`],
      ["expected_output", `version.test_cases.${i}.expected_output`, `version.test_cases.${i}.expected_output`]
    ];

    fields.forEach(([key, name, id]) => {
      const value = tc[key] || "";
      const max = MAX[key];
      if (value.length > max) {
        errors.push(`Test case ${i + 1} ${key} is ${value.length}/${max}`);
        return;
      }

      const el = findField(name, id);
      if (!el) {
        errors.push(`Missing field: ${name}`);
        return;
      }

      setNativeValue(el, value);
      rows.push({ section: "positive", index: i + 1, field: key, length: value.length, max });
    });
  });

  DATA.negative_test_cases.forEach((tc, i) => {
    const fields = [
      ["description", `version.negative_test_cases.${i}.description`, `version.negative_test_cases.${i}.description`],
      ["user_prompt", `version.negative_test_cases.${i}.user_prompt`, `version.negative_test_cases.${i}.user_prompt`]
    ];

    fields.forEach(([key, name, id]) => {
      const value = tc[key] || "";
      const max = MAX[key];
      if (value.length > max) {
        errors.push(`Negative test case ${i + 1} ${key} is ${value.length}/${max}`);
        return;
      }

      const el = findField(name, id);
      if (!el) {
        errors.push(`Missing field: ${name}`);
        return;
      }

      setNativeValue(el, value);
      rows.push({ section: "negative", index: i + 1, field: key, length: value.length, max });
    });
  });

  console.table(rows);

  if (errors.length) {
    console.error(errors);
    alert(`Some fields failed. See console. Count: ${errors.length}`);
  } else {
    alert("Test cases filled and length-checked.");
  }
})();
```

> **Per-tool annotation justifications** (the `Read Only` / `Open World` / `Destructive` dashboard fields, ≤200 chars each) are kept out of git per the `docs/dashboard.md` convention. Regenerate them at the gitignored `.context/HUN-20196/dashboard-justifications.md` before pasting.

---

## Appendix — Tool inventory

The 100 tools exposed by the Hunter ChatGPT MCP (V3), grouped by domain — mirrors the `TOOL_NAMES` block in `src/helpers.ts` (the single source of truth). Use this as a reference if a new tool is added — extend the matrix in Section 2 before the next test run. All 44 tools added in V3 (marked "(V3)") are free; the credit cost of a full playbook run is unchanged at ~25 credits, since no V3 prompt spends credits.

| Group | Tools |
|-------|-------|
| Search | `Find-Companies`, `Domain-Search`, `Email-Finder`, `Email-Verifier`, `Email-Count` |
| Enrichment | `Person-Enrichment`, `Company-Enrichment`, `Combined-Enrichment` |
| Account | `Get-Account-Details` |
| Usage & API keys (V3) | `Get-Usage`, `List-API-Keys`, `Create-API-Key`, `Delete-API-Key` |
| Email accounts | `List-Email-Accounts`, `Get-Email-Account` (V3), `List-Email-Account-Sequences` (V3) |
| Sequences | `List-Sequences`, `Get-Sequence` (V3), `Create-Sequence` (V3), `Update-Sequence` (V3), `Delete-Sequence` (V3), `List-Sequence-Follow-Ups`, `Get-Sequence-Follow-Up` (V3), `Create-Sequence-Follow-Up` (V3), `Delete-Sequence-Follow-Up` (V3), `Pause-Sequence`, `Resume-Sequence`, `Archive-Sequence`, `Get-Sequence-Stats`, `List-Sequence-Recipients`, `Add-Sequence-Recipients`, `Remove-Sequence-Recipients`, `Start-Sequence` |
| Message templates (V3) | `List-Message-Templates`, `Get-Message-Template`, `Create-Message-Template`, `Update-Message-Template`, `Delete-Message-Template` |
| Leads | `List-Leads`, `Get-Lead`, `Create-Lead`, `Update-Lead`, `Delete-Lead`, `Create-Or-Update-Lead`, `Create-Lead-If-Missing`, `Lead-Exists`, `Save-Company` |
| Lead tags (V3) | `List-Lead-Tags`, `Create-Lead-Tag`, `Update-Lead-Tag`, `Delete-Lead-Tag`, `Add-Tag-To-Lead`, `Remove-Tag-From-Lead` |
| Leads lists | `List-Leads-Lists`, `Get-Leads-List`, `Create-Leads-List`, `Update-Leads-List`, `Delete-Leads-List`, `Merge-Leads-Lists` |
| Leads-list folders & favorites (V3) | `List-Leads-List-Folders`, `Create-Leads-List-Folder`, `Update-Leads-List-Folder`, `Delete-Leads-List-Folder`, `Favorite-Leads-List`, `Unfavorite-Leads-List` |
| Company lists (HUN-20196) | `List-Company-Lists`, `Get-Company-List`, `Create-Company-List`, `Update-Company-List`, `Delete-Company-List` |
| Company list folders (HUN-20196) | `List-Company-List-Folders`, `Create-Company-List-Folder`, `Update-Company-List-Folder`, `Delete-Company-List-Folder` |
| Company list favorites/membership (HUN-20196) | `Favorite-Company-List`, `Unfavorite-Company-List`, `Add-Company-To-List`, `Remove-Company-From-List` |
| Bulk operations (V3) | `Bulk-Move-Leads`, `Bulk-Delete-Leads`, `Bulk-Move-Companies`, `Bulk-Copy-Companies`, `Bulk-Delete-Companies` |
| Discover people & saved searches (V3) | `Find-People`, `List-Saved-Searches`, `Get-Saved-Search`, `Create-Saved-Search`, `Delete-Saved-Search` |
| Connected apps & integrations | `List-Connected-Apps`, `Get-Connected-App`, `Push-Leads-To-CRM` (V3), `List-Webhooks` (V3), `Update-Webhook` (V3) |
| Custom attributes | `List-Custom-Attributes`, `Get-Custom-Attribute`, `Create-Custom-Attribute`, `Update-Custom-Attribute`, `Delete-Custom-Attribute` |
| Coordinator | `Plan-Prospecting-Flow` |
| Feedback | `Report-API-Feedback` (free; agents report API/tool friction — missing endpoints, wrong docs, bad data, bugs) |
| Named prompts | `prospect`, `build-list`, `sequence-prep` |
| Widgets | `discover-widget`, `company-widget` |
| Resources | `capabilities-recovery` (used implicitly by `Plan-Prospecting-Flow`) |
