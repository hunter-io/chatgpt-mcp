# ChatGPT App — Testing Playbook

> Linear: [HUN-19560](https://linear.app/hunter-io/issue/HUN-19560/testing-playbook-for-chatgpt-app)

Manual test playbook for the Hunter ChatGPT app. Run before every app review submission to confirm the demo video flow, the marketplace test cases, and to surface hidden bugs across all 35 tools.

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
- [ ] At least one configured Hunter campaign exists, with a connected sender and at least one recipient slot free
  - Campaign ID for tests: `<!-- fill in -->`
  - Campaign name: `<!-- fill in -->`
- [ ] At least one Hunter leads list with ≥3 leads exists
  - Leads list ID: `<!-- fill in -->`
- [ ] Browser console / DevTools open to capture network errors and widget rendering issues
- [ ] Fresh ChatGPT conversation per prompt unless explicitly chained — avoids context bleed between tests

> **Cost estimate for one full run:** ~25 credits total across Sections 1, 2, and 3. (Hunter has a single unified credit pool — every paid call deducts from the same balance.)

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

### 4. Campaign recipients

**Goal:** Verify campaign listing + adding recipients. Pre-req: at least one campaign exists with a free recipient slot (see pre-flight).

**Prompt:**

```
List my Hunter campaigns, then add patrick@stripe.com and dylan@stripe.com to the one I pick.
```

**Expected tools fired:**
- [ ] `List-Campaigns`
- [ ] `Add-Campaign-Recipients` (after user picks a campaign)

**Pass criteria:**
- [ ] All campaigns shown with id, name, status
- [ ] After user picks, `Add-Campaign-Recipients` is called with `campaign_id` and `emails: ["patrick@stripe.com", "dylan@stripe.com"]`
- [ ] Final message includes deep link to `https://hunter.io/campaigns/<id>`
- [ ] Recipients visible in Hunter UI under that campaign after the call
- [ ] Reminder shown that subject/body/sender must be configured in Hunter UI before starting

**Screenshot:** `<!-- paste screenshot here -->`

**Result/notes:** `<!-- fill in -->`

**Status:** ☐ Pass ☐ Fail ☐ Blocked

---

### 5. Start-Campaign confirmation gate

**Goal:** Verify the destructive-action confirmation gate works. We will say **no** at the gate — no real emails are sent.

**Prompt:** (use the campaign id from prompt 4 or pre-flight)

```
Start campaign <CAMPAIGN_ID>
```

**Expected tools fired:**
- [ ] `Start-Campaign` (first call, returns `ask_user` with `pendingToolCall`)

**Pass criteria:**
- [ ] ChatGPT shows a destructive-hint confirmation UI (per `destructiveHint: true` annotation)
- [ ] Confirmation question includes the actual recipient count, e.g. *"This will send real emails to N recipients."*
- [ ] When you respond **"no, don't start it"**, the model stops and does NOT call `Start-Campaign` again
- [ ] No `POST /campaigns/<id>/start` request appears in the network panel
- [ ] Campaign in Hunter UI remains in its prior state (paused/draft) — verify after

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

### Campaigns

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| C1 | `List-Campaign-Recipients` | `Who are the recipients of campaign <CAMPAIGN_ID>?` | Returns recipient list | ☐ | |
| C2 | `Remove-Campaign-Recipients` (destructive) | `Remove patrick@stripe.com and dylan@stripe.com from campaign <CAMPAIGN_ID>` (use Section 1 prompt 4) | Confirmation prompt; on accept, recipients removed | ☐ | |

> `List-Campaigns`, `Add-Campaign-Recipients`, and `Start-Campaign` are exercised by Section 1 prompts 4 and 5.

### Email accounts (HUN-20196)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| EA1 | `List-Email-Accounts` | `Show me the email accounts connected to my Hunter account and their sending status` | Read-only list of sending accounts: email, name, provider, daily limit, status (active/paused/warming) | ☐ | |

### Sequences (HUN-20196)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| SQ1 | `List-Sequence-Follow-Ups` | `Show the follow-up steps of sequence <SEQUENCE_ID>` | Steps ordered by step: subject, body, wait_days, message_format, messages_sent, variant | ☐ | |
| SQ2 | `Get-Sequence-Stats` | `How is sequence <SEQUENCE_ID> performing?` | recipients/sent/delivered/opened/clicked/replied + rates (0–1) + per-step breakdown | ☐ | |
| SQ3 | `Pause-Sequence` (write) | `Pause sequence <SEQUENCE_ID>` | Sequence paused (stops sending), reversible. Draft/archived → invalid_input (`sequence_not_active`) | ☐ | |
| SQ4 | `Resume-Sequence` (write) | `Resume sequence <SEQUENCE_ID>` | Resumed after validation; surfaces invalid_input if the email account is disconnected or the schedule is empty | ☐ | |
| SQ5 | `Archive-Sequence` (destructive) | `Archive sequence <SEQUENCE_ID>` | Confirmation prompt (irreversible via API); on accept archived and can't be resumed. Draft → invalid_input (`sequence_not_started`) | ☐ | |

> Tip: use a paused/test sequence for SQ3–SQ5. Archiving (SQ5) cannot be undone via the API — use a disposable sequence.

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

> These 21 rows exercise the HUN-20196 tools. Use a throwaway list/folder/sequence for the destructive rows (CL4/CL5, FO3/FO4, SQ5) so you don't lose real data.

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

### 3.5 Already-started campaign

**Pre-req:** A campaign that is already running.

**Prompt:**

```
Start campaign <ALREADY_RUNNING_CAMPAIGN_ID>
```

(answer "yes" at the confirmation gate)

- [ ] Confirmation gate shown (gate fires regardless of campaign state)
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

For each tool that returns a deep link (Save-Company, Create/Update/Create-Or-Update-Lead, Create/Update/Merge-Leads-List, Add/Remove-Campaign-Recipients, Start-Campaign), open the link and confirm:

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
- [ ] `campaign-prep` is selectable
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

## Run summary

After completing all sections, fill this in.

| Section | Total | Pass | Fail | Blocked |
|---------|-------|------|------|---------|
| 1 — Marketplace prompts | 5 | | | |
| 2 — Tool coverage matrix | 47 | | | |
| 3 — Edge cases | 11 | | | |
| **Total** | **63** | | | |

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
OpenAI Apps SDK submission form. Pre-empts the three reviewer-edge-cases
the v3 implementation knowingly accepts as trade-offs; surfacing them
proactively beats letting a reviewer discover them on a test run.

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

Hunter MCP v3 covers email discovery, verification, enrichment, and
lead/campaign read-write. Campaign **authoring**, async **bulk
verification**, and a few smaller parity items (Author-Finder, dedicated
Add/Remove-Lead-To-List primitives, the full Discover filter set) are on
the roadmap. Reviewers who ask the agent to compose a new campaign, to
queue a bulk verification job, or to move 10 leads from list A to list B
will see a clean "I can't do that yet" response from the tool surface —
that is the surface telling the truth, not a bug. The web app exposes
these; the MCP will follow in a future cycle.

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

---

## Section 6 — OpenAI submission form: test-case autofill script

The OpenAI Apps SDK submission form has a **Test cases** section (positive `version.test_cases.*` + `version.negative_test_cases.*` fields). Paste the snippet below into the browser DevTools console **on the submission-form page** to fill every row at once and length-check it. It mirrors the form's field-name scheme and sets values React-safely via `setNativeValue`.

**Before running:** in the form, add **12 positive** test-case rows and **3 negative** rows (the script fills existing inputs — it does not create rows). Substitute `<ANGLE_BRACKET>` placeholders with real test-account values first. Field limits enforced by the script: `description ≤200`, `user_prompt ≤500`, `tools_triggered ≤200`, `expected_output ≤300`. Cases 1–5 cover the original surface; 6–12 cover the HUN-20196 additions (email accounts, sequences, company lists/folders, membership/favorites, connected apps).

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
        description: "Review account and campaigns without sending emails",
        user_prompt:
          "Using Hunter, show my account details, list my campaigns, and show recipients for one campaign if any exist. Do not add recipients or start a campaign.",
        tools_triggered: "Get-Account-Details, List-Campaigns, List-Campaign-Recipients",
        expected_output:
          "Account/credit details and a campaign list are returned. If a campaign exists, recipient statuses are shown. No recipients are added and no campaign is started."
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
          "Write a cold email template for a pharmaceutical sales campaign, but do not look up companies or contacts."
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

The 55 tools exposed by the Hunter ChatGPT MCP, grouped by registration site. Use this as a reference if a new tool is added — extend the matrix in Section 2 before the next test run.

| Group | Tools |
|-------|-------|
| Search | `Find-Companies`, `Domain-Search`, `Email-Finder`, `Email-Verifier`, `Email-Count` |
| Enrichment | `Person-Enrichment`, `Company-Enrichment`, `Combined-Enrichment` |
| Account | `Get-Account-Details` |
| Leads | `List-Leads`, `Get-Lead`, `Create-Lead`, `Update-Lead`, `Delete-Lead`, `Create-Or-Update-Lead`, `Lead-Exists`, `Save-Company` |
| Leads lists | `List-Leads-Lists`, `Get-Leads-List`, `Create-Leads-List`, `Update-Leads-List`, `Delete-Leads-List`, `Merge-Leads-Lists` |
| Custom attributes | `List-Custom-Attributes`, `Get-Custom-Attribute`, `Create-Custom-Attribute`, `Update-Custom-Attribute`, `Delete-Custom-Attribute` |
| Campaigns | `List-Campaigns`, `List-Campaign-Recipients`, `Add-Campaign-Recipients`, `Remove-Campaign-Recipients`, `Start-Campaign` |
| Email accounts (HUN-20196) | `List-Email-Accounts` |
| Sequences (HUN-20196) | `List-Sequence-Follow-Ups`, `Pause-Sequence`, `Resume-Sequence`, `Archive-Sequence`, `Get-Sequence-Stats` |
| Company lists (HUN-20196) | `List-Company-Lists`, `Get-Company-List`, `Create-Company-List`, `Update-Company-List`, `Delete-Company-List` |
| Company list folders (HUN-20196) | `List-Company-List-Folders`, `Create-Company-List-Folder`, `Update-Company-List-Folder`, `Delete-Company-List-Folder` |
| Company list favorites/membership (HUN-20196) | `Favorite-Company-List`, `Unfavorite-Company-List`, `Add-Company-To-List`, `Remove-Company-From-List` |
| Connected apps (HUN-20196) | `List-Connected-Apps`, `Get-Connected-App` |
| Coordinator | `Plan-Prospecting-Flow` |
| Named prompts | `prospect`, `build-list`, `campaign-prep` |
| Widgets | `discover-widget`, `company-widget` |
| Resources | `capabilities-recovery` (used implicitly by `Plan-Prospecting-Flow`) |
