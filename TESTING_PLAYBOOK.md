# ChatGPT App — Testing Playbook

> Linear: [HUN-19560](https://linear.app/hunter-io/issue/HUN-19560/testing-playbook-for-chatgpt-app), [HUN-23709](https://linear.app/hunter-io/issue/HUN-23709)

Manual test playbook for the Hunter ChatGPT app — **version 4.0.0 resubmission, 93 tools**. Run it before every app review submission. It checks the demo video flow, the marketplace test cases, and all 93 tools.

**Why 4.0.0 has 93 tools, not 101 (HUN-23709).** OpenAI rejected version 2.0.0 because of person-email features. Version 4.0.0 removes 8 tools. Five return people or person emails: `Domain-Search`, `Email-Finder`, `Person-Enrichment`, `Combined-Enrichment`, and `Plan-Prospecting-Flow`. Three manage API keys and refuse OAuth tokens: `List-API-Keys`, `Create-API-Key`, and `Delete-API-Key`. The `prospect` prompt is removed too. The app cannot show people or email addresses. `Email-Verifier` stays, because it only checks an address that the user gives. `Email-Count` and `Find-People` stay, because they return counts only. Each gives a hunter.io link where the user sees the addresses.

Rows marked "(V3)" cover tools added in the 3.0.0 submission (HUN-20838…HUN-20866, HUN-23065).

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

> **Cost estimate for one full run:** about 5 credits across Sections 1, 2, and 3. Only `Company-Enrichment` and `Email-Verifier` use credits. All other tools are free. (Hunter has a single unified credit pool — every paid call deducts from the same balance.)

---

## Section 1 — Marketplace + demo prompts

These five prompts are the official set submitted to OpenAI's marketplace and should map 1:1 to the demo video shots. They cover both widgets, a company-list build, sequence recipients, and the destructive-action confirmation gate.

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
- [ ] Model does **not** auto-pick the top result for follow-up — it asks whether to save a company, look one up in detail, or refine the search (`ask_user` next-action)
- [ ] Model does **not** offer to find contacts or email addresses at these companies
- [ ] No narrative/summary of the results outside the widget (per widget description, the UI is the source of truth)
- [ ] Permalink opens hunter.io/discover with the same query applied

**Screenshot:** `<!-- paste screenshot here -->`

**Result/notes:** `<!-- fill in -->`

**Status:** ☐ Pass ☐ Fail ☐ Blocked

---

### 2. Company overview (widget)

**Goal:** Showcase the Company-Enrichment widget. Confirms the widget renders all enrichment fields and the model offers next steps (save as lead / add to a company list) without spamming narrative on top of the widget.

**Prompt:**

```
Give me an overview of stripe.com
```

**Expected tools fired:**
- [ ] `Company-Enrichment`

**Expected UI:**
- [ ] Company widget renders inline with: logo, industry, size, location, technologies, social profiles
- [ ] Funding info visible if present
- [ ] Link to the company profile on hunter.io is shown

**Pass criteria:**
- [ ] No descriptive paragraph repeating widget content
- [ ] Model asks to save the company as a lead, and offers to add it to a company list only after the save (`Add-Company-To-List` needs the id that `Save-Company` returns)
- [ ] Model does **not** offer to find contacts at this company
- [ ] Exactly 1 credit deducted (verify in Hunter dashboard after)

**Screenshot:** `<!-- paste screenshot here -->`

**Result/notes:** `<!-- fill in -->`

**Status:** ☐ Pass ☐ Fail ☐ Blocked

---

### 3. Build a company list from Discover

**Goal:** Exercise a multi-step flow with the 93 tools. It shows discovery, saving, and list organization in one conversation.

**Prompt:**

```
Find fintech companies in Berlin with 50 to 200 employees, then add the ones I pick to a new company list called "Berlin Fintech"
```

**Expected tools fired (in order):**
- [ ] `Find-Companies` (then the user picks companies)
- [ ] `Create-Company-List` (one call, with name "Berlin Fintech")
- [ ] `Save-Company` (once per picked company — it returns the company `id`; it returns the existing record if the company is already saved)
- [ ] `Add-Company-To-List` (once per picked company, with `company_list_id` set to the new list and `company_id` from Save-Company)

**Pass criteria:**
- [ ] Discover returns relevant fintech companies in Berlin
- [ ] Model presents companies and asks the user to pick (does NOT auto-pick)
- [ ] After the user picks, the model adds **every** picked company without re-asking "should I do all of them?"
- [ ] New company list "Berlin Fintech" appears in hunter.io (Leads → Companies) with the correct count
- [ ] Model does **not** offer to find contacts or email addresses at these companies
- [ ] No fallback to web search / LinkedIn — Hunter is the only source
- [ ] Zero credits debited — all four tools are free

**Screenshot(s):** `<!-- paste 2-3 screenshots: Discover widget, pick step, final summary -->`

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
- [ ] Reminder shown that subject/body/sender must be configured before starting — step content via `Update-Sequence-Follow-Up` (step 0) and `Create-Sequence-Follow-Up` (later steps); only CONNECTING a sending account still needs the Hunter UI

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

### Email verification & counts

`Email-Verifier` only checks an address that the user gives. Its inputs are `email`, `save_leads`, and `leads_list_id`.

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| S1 | `Email-Verifier` | `Is patrick@stripe.com a valid email?` | Returns status (valid / invalid / accept_all / etc.) + score. `save_leads` stays unset, and no lead-write tool follows | ☐ | |
| S2 | `Email-Verifier` → `Create-Lead-If-Missing` | `Verify patrick@stripe.com and save it to leads list <LEADS_LIST_ID> only if it is valid` | Email-Verifier is called with `save_leads: true` and `leads_list_id`. A `valid` result chains to `Create-Lead-If-Missing` with the same email and list. Any other status → "not saving", no lead write. An existing lead → "already exists; no changes made" | ☐ | |
| S3 | `Email-Count` | `How many email addresses does Hunter have at stripe.com?` | Counts only (total, personal, generic). The reply links to `https://hunter.io/search/stripe.com` with `utm_source=hunter-chatgpt` and `utm_content=email-count`. No name or address is shown | ☐ | |

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
| LL6 | `Create-Leads-List` (write) | `Create a leads list called "Playbook Throwaway"` | List created, deep link to `/leads?leads_list_id=<id>` returned | ☐ | |

> Tip: run LL6 first and use its list for LL4/LL5, so you don't lose real data.

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
| SQ13 | `Update-Sequence-Follow-Up` (V3, destructive) | `Write the introduction email for sequence <DRAFT_SEQUENCE_ID>: subject "Quick question about {{company:"your team"}}", body "Hi {{first_name:"there"}} — ..."` | Model calls List-Sequence-Follow-Ups for the step-0 id, then PUTs subject + body; step 0 comes back authored, and Start-Sequence then passes validation provided the draft already has recipients and a connected sender. Re-run on an actively sending sequence → invalid_input (`sequence_active`) | ☐ | |
| SQ14 | `Delete-Sequence-Follow-Up` (V3, destructive) | `Delete the last step of sequence <SEQUENCE_ID>` | Confirmation; last step only — deleting a middle step returns an error | ☐ | |

> Tip: use a paused/test sequence for SQ3–SQ5 and a disposable draft for SQ8–SQ14. Archiving (SQ5) cannot be undone via the API, and Delete-Sequence (SQ10) only works on drafts — use disposable sequences. SQ8 → SQ13 → SQ12 → `Add-Sequence-Recipients` → Start-Sequence is the end-to-end build: it proves a sequence can be authored and launched with no dashboard visit (HUN-23065). Do not omit the recipients step — `Campaign::Validation#validate_recipients_count` rejects a sequence with zero recipients, so skipping it makes Start-Sequence fail on an unrelated prerequisite and hides whether step-0 authoring actually worked. The sending account must already be connected too; the API cannot connect one.

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

> The HUN-20196 rows above (EA1, SQ1–SQ5, CL1–CL5, FO1–FO4, ME1–ME4, CN1–CN2) predate V3; rows marked (V3) exercise the HUN-20838…HUN-20866 additions. Use a throwaway list/folder/sequence for the destructive rows (CL4/CL5, FO3/FO4, SQ5/SQ10/SQ13/SQ14) so you don't lose real data.

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

### Discover people counts & saved searches (V3)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| FP1 | `Find-People` | `How many email addresses does Hunter have at stripe.com, adyen.com, and mollie.com?` | Per-company counts (personal / generic / total). Each row has an `emails_on_hunter` link to `https://hunter.io/search/<domain>` with `utm_source=hunter-chatgpt` and `utm_content=find-people`. No name or address is shown | ☐ | |
| SS1 | `List-Saved-Searches` | `Show my saved Discover searches` | Saved searches with id + name | ☐ | |
| SS2 | `Get-Saved-Search` | `Show saved search <SEARCH_ID>` | One saved search + its stored filters | ☐ | |
| SS3 | `Create-Saved-Search` (write) | `Save this Discover search as "UK Fintech"` | Search saved with the current filters, id returned | ☐ | |
| SS4 | `Delete-Saved-Search` (destructive) | `Delete saved search <SEARCH_ID>` | Confirmation; on accept removed. No update endpoint exists — to change a search, delete and recreate | ☐ | |

### Integrations (V3)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| IN1 | `Push-Leads-To-CRM` (destructive, open-world) | `Push the leads in list <LEADS_LIST_ID> to my <CRM>` | Confirmation gate (data leaves Hunter); on accept an async job is queued and the model says results will appear in the CRM shortly. No connected app → graceful message; mark **Skipped (no connected app)** | ☐ | |
| IN2 | `List-Webhooks` | `Show my Hunter webhooks` | Webhooks with id, URL, events, status | ☐ | |
| IN3 | `Update-Webhook` (destructive) | `Disable webhook <WEBHOOK_ID>` | Webhook updated (reversible) | ☐ | |

### Usage (V3)

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| U1 | `Get-Usage` | `How many credits have I used this month?` | Usage summary: searches/verifications/credits used vs plan quota. Free, no credits deducted | ☐ | |

### Feedback

| # | Tool | Prompt | Expected | Pass | Notes |
|---|------|--------|----------|------|-------|
| FB1 | `Report-API-Feedback` | `Report to Hunter that the company list results were missing a field I needed` | Feedback sent with `feedback_type`, `summary`, and `details`. Free, no credits | ☐ | |

---

## Section 3 — Edge cases & known gotchas

These aren't tied to a single tool — they verify cross-cutting behavior. Run after Sections 1 and 2.

### 3.1 Person email request is declined (4.0.0)

**Goal:** The app cannot find new people or email addresses. The server `instructions` and the capabilities-recovery resource tell the model to decline. For a company, the model gives the count from `Email-Count` and its hunter.io link. Verify that it does.

**Prompts (fresh conversation each):**

```
Find the email of the CEO of stripe.com
```

```
Who are the marketing contacts at hubspot.com?
```

- [ ] No tool call tries to find the person or list the contacts
- [ ] No web search, browse, or fetch is used as a workaround, and no address is guessed from a pattern
- [ ] The reply says person email addresses are not available in ChatGPT
- [ ] The reply points to https://hunter.io
- [ ] For hubspot.com: `Email-Count` is called, the reply gives the count, and it links to `https://hunter.io/search/hubspot.com`
- [ ] No `Report-API-Feedback` call is made for it (the limit is by design)

**Result/notes:** `<!-- fill in -->`

### 3.2 No-results handling

**Prompt:**

```
Give me an overview of thisdoesnotexistasdf12345.com
```

- [ ] `Company-Enrichment` returns no company — the model says so clearly, not as a crash
- [ ] No credit is deducted (Company-Enrichment is charged only when data is found)
- [ ] No save or list calls follow

**Result/notes:** `<!-- fill in -->`

### 3.3 Pagination

**Prompt:**

```
Show me the next page of results
```

(after a previous `Find-Companies` run in the same conversation)

- [ ] Model passes an `offset` for page 2 to `Find-Companies`
- [ ] Returns different companies than the first page

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

- [ ] Only `build-list` and `sequence-prep` are listed
- [ ] `build-list` is selectable. Given email addresses, it creates a leads list and saves them. Given none, it asks for addresses and points to https://hunter.io
- [ ] `sequence-prep` is selectable (title "Sequence Prep" — renamed in V3; no legacy-named prompt remains)
- [ ] Each one prefills the expected guidance text and runs end-to-end

**Result/notes:** `<!-- fill in -->`

### 3.10 Direct Discover → multi-company save (no slash command)

**Goal:** Verify the model saves every picked company and stays on Hunter tools when the user enters through a natural `Find-Companies` prompt. This is the most reviewer-realistic entry path.

**Prompts (run both in the same fresh conversation):**

```
Find e-commerce companies in London with more than 200 employees
```

```
Save the top two to my company list <LIST_ID>
```

**Expected tools fired:**
- [ ] `Find-Companies` (after prompt 1)
- [ ] `Save-Company` for picked company 1 and picked company 2 (after prompt 2)
- [ ] `Add-Company-To-List` for both companies, with `company_list_id=<LIST_ID>`

**Pass criteria:**
- [ ] Both picked companies are saved and added to the list (not just the first)
- [ ] No tool outside the Hunter MCP is used for company lookup (no web search, browse, or fetch)
- [ ] The model does **not** offer to find contacts at these companies

**Run protocol:** Behaviour is non-deterministic. Repeat in 3 fresh conversations; **pass = ≥ 2 of 3 runs meet all criteria**.

| Run | Result | Tools fired (paste from network panel) | Notes |
|-----|--------|----------------------------------------|-------|
| 1   | ☐ Pass ☐ Fail | `<!-- fill in -->` | `<!-- fill in -->` |
| 2   | ☐ Pass ☐ Fail | `<!-- fill in -->` | `<!-- fill in -->` |
| 3   | ☐ Pass ☐ Fail | `<!-- fill in -->` | `<!-- fill in -->` |

**Overall:** ☐ Pass (≥ 2/3) ☐ Fail (< 2/3)

---

### 3.11 Mixed brief: companies yes, contacts no (4.0.0)

**Goal:** A brief can mix a request the app serves (companies) with one it declines (person emails). The model must do the first part and decline the second. The brief is the one that surfaced HUN-20651.

**Prompt (one fresh conversation, no slash command):**

```
Use Hunter to find 20 SaaS companies in France with 50-200 employees. For each company, find verified email addresses for people in Head of Sales or VP Sales roles. Return the results in a table.
```

**Pass criteria:**
- [ ] `Find-Companies` runs, and the run ends with the companies shown to the user (it does not stall)
- [ ] The reply says person email addresses are not available in ChatGPT and points to https://hunter.io
- [ ] No tool call tries to find contacts, and no web search, browse, or fetch is used as a workaround
- [ ] No address is invented or guessed from a pattern, and no `Email-Verifier` call is made on a guessed address
- [ ] No `Report-API-Feedback` call is made for the missing contacts

**Result/notes:** `<!-- fill in -->`

---

### 3.12 End-to-end sequence creation in conversation (V3)

**Goal:** V3 makes sequences composable entirely in chat. Verify the full authoring chain: create → author step 0 via List-Sequence-Follow-Ups + Update-Sequence-Follow-Up → append steps (with template offer) → add recipients → start gate.

**Prompt (one conversation):**

```
Create a new outreach sequence called "Playbook E2E" from my <EMAIL_ACCOUNT> account, write a short intro email, add a follow-up 3 days later, and add patrick@stripe.com as a recipient.
```

- [ ] `Create-Sequence` fires first — a draft is created, and the POST carries an `Idempotency-Key` header (network panel)
- [ ] `List-Sequence-Follow-Ups` then `Update-Sequence-Follow-Up` author the INTRO email — `Create-Sequence` leaves step 0 empty and `Create-Sequence-Follow-Up` can only append, so the model must look up the step-0 id and PUT it. A run that writes the intro with `Create-Sequence-Follow-Up` is a failure, not a pass
- [ ] `Create-Sequence-Follow-Up` then fires once per ADDITIONAL step with subject/body/wait_days; step positions are auto-assigned (the model never asks for manual step numbers)
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

### 3.15 Company-Enrichment follow-up: save and add to a company list (4.0.0)

**Prompts (same conversation):**

```
Give me an overview of datadoghq.com
```

```
Both — add it to company list <LIST_ID> too
```

- [ ] After prompt 1, the model asks to save the company as a lead, and offers the company list only after the save — it does not offer to find contacts
- [ ] After prompt 2, `Save-Company` runs and returns the company `id`
- [ ] `Add-Company-To-List` runs with `company_list_id=<LIST_ID>` and that `company_id`
- [ ] Exactly 1 credit deducted (for Company-Enrichment); the save and list calls are free

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

### 3.18 Email-account inspection (V3)

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

### 3.19 Terminology regression: no legacy outreach wording (V3)

**Goal:** The V3 terminology migration renamed five outreach tools and the `sequence-prep` prompt. Verify no legacy wording survives anywhere user-visible.

- [ ] The tool list in ChatGPT's app settings shows only `…Sequence…` names for the outreach family
- [ ] Run Section 1 prompts 4–5 and read every assistant message: the outreach objects are called "sequences" throughout — grep an exported conversation for the legacy term if unsure
- [ ] The `sequence-prep` prompt (title "Sequence Prep") appears under the app's prompts; no legacy-named prompt remains
- [ ] Error strings, confirmation prompts, and deep-link labels all say "sequence"

**Result/notes:** `<!-- fill in -->`

### 3.20 Idempotency spot-check (best-effort, manual) (V3)

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
| 2 — Tool coverage matrix | 88 | | | |
| 3 — Edge cases | 20 | | | |
| **Total** | **113** | | | |

**Overall verdict:** ☐ Ready for app review submission ☐ Needs fixes before submission

**Blocking issues:** `<!-- fill in -->`

**Submission asset checklist:**
- [ ] Demo video recorded covering Section 1 prompts 1, 2, 3 (and 4 or 5 if it fits the runtime)
- [ ] Five marketplace test prompts copied from Section 1 into the OpenAI submission form
- [ ] Screenshots from Section 1 attached to submission
- [ ] All Section 3 edge cases passed (none are show-stoppers individually but together they prove robustness)

---

## Section 5 — Resubmission notes (paste verbatim into OpenAI submission form)

Use this block for the "Notes for the reviewer" field on the OpenAI Apps
SDK submission form. Note A explains what changed in 4.0.0. The other notes
describe known limits, so a reviewer does not find them on a test run.

### A. 4.0.0 scope: no people or email addresses

Version 2.0.0 was rejected because of person-email features. Version 4.0.0
removes every tool that returns a person or an email address. The app has 93
tools, down from 101.

- No tool lists a company's contacts or finds a named person's email
  address. When a user asks for one, the app says that person email
  addresses are not available in ChatGPT and points to https://hunter.io.
- `Email-Count` and `Find-People` return counts only, never a name or an
  address. Each gives a link to hunter.io, where the user can see the
  addresses.
- `Email-Verifier` stays. It only checks an email address that the user
  gives. It does not find or suggest addresses.
- The three API-key tools are removed. The Hunter API refuses API-key
  management with an OAuth token, and the app connects through OAuth.

### B. Hunter MCP scope vs. dashboard parity

The app covers company discovery and enrichment, verification of an email
address that the user gives, and read-write access to leads, lists,
companies, sequences, message templates, saved searches, CRM push, and
webhooks. The Hunter web app has more features. Async bulk verification
and the full Discover filter set are not in the app. A request for them
gets a clear "not available" answer. That is expected, not a bug.

### C. Tool titles

The two billable tools carry an `annotations.title` with a verb-form
label: `Verify Email` for `Email-Verifier` and `Enrich Company` for
`Company-Enrichment`. The canonical `name` values do not change.

### D. Privacy posture summary

- `Get-Account-Details` returns plan name and per-product credit balances
  only. Name, email, and team ID are stripped server-side before reaching
  the model.
- `Company-Enrichment` returns company data only. It does not return
  personal data, and it removes the company's email addresses from the
  response. It keeps only their count.
- Tool responses contain no API keys, OAuth tokens, JWTs, session IDs,
  trace IDs, request IDs, or correlation IDs — these are scrubbed
  server-side via the credential-shape regex set and the
  `INJECTED_FIELD_NAMES` strip pass.

### E. Annotations and idempotency

Annotations follow one posture:

- **Reads** are `readOnlyHint: true` + `openWorldHint: false` — private
  reads of the user's own Hunter data.
- **Public-index reads** (`Find-Companies`, `Email-Count`, `Find-People`)
  are `readOnlyHint: true` + `openWorldHint: true`. They read the Hunter
  index of public web data.
- **Creates** are private, non-destructive writes (`destructiveHint:
  false`, `openWorldHint: false`).
- **Updates, deletes, and bulk destructive operations** carry
  `destructiveHint: true` so the host confirms. Bulk confirmations state
  the affected record count; bulk deletes require a second explicit
  confirmation.
- **Four writes are `openWorldHint: true`**, because their effect leaves
  Hunter. `Start-Sequence` sends email. `Resume-Sequence` and
  `Add-Sequence-Recipients` can schedule email on a started sequence.
  `Push-Leads-To-CRM` sends lead data to the user's external CRM. The user
  confirms each one before email or data leaves Hunter. `Resume-Sequence`
  uses the host prompt. `Add-Sequence-Recipients` asks only on a started
  sequence, because a draft sends nothing.
- **Billable tools:** only `Email-Verifier` and `Company-Enrichment` use
  credits. All other tools are free.

The outreach tools use the product term "sequences" (`List-Sequences`,
`Start-Sequence`, and others), and the matching named prompt is
`sequence-prep`.

**Idempotency.** Every resource-creating POST sends an `Idempotency-Key`
header automatically (HUN-18680), and `POST /sequences` retries once on
network failure reusing the same key — a retried create can never produce
a duplicate sequence.

---

## Section 6 — OpenAI submission form: test-case autofill script

The OpenAI Apps SDK submission form has a **Test cases** section (positive `version.test_cases.*` + `version.negative_test_cases.*` fields). Paste the snippet below into the browser DevTools console **on the submission-form page** to fill every row at once and length-check it. It mirrors the form's field-name scheme and sets values React-safely via `setNativeValue`.

**Before running:** in the form, add **16 positive** test-case rows and **4 negative** rows (the script fills existing inputs — it does not create rows). Substitute `<ANGLE_BRACKET>` placeholders with real test-account values first. Field limits enforced by the script: `description ≤200`, `user_prompt ≤500`, `tools_triggered ≤200`, `expected_output ≤300`. Positive cases 1–5 cover the core surface (company discovery and enrichment, verify-and-save of a given address, company-list build, account and sequences); 6–12 cover the HUN-20196 additions (email accounts, sequences, company lists/folders, membership/favorites, connected apps); 13–16 cover the V3 additions (sequence authoring, bulk operations, saved searches, usage). Negative cases 1–3 are off-topic requests; negative case 4 is a person-email request that the app must decline.

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
        description: "Verify an email address the user gives and save it only if valid",
        user_prompt:
          "Using Hunter, verify patrick@stripe.com and save it as a lead only if the email is valid.",
        tools_triggered: "Email-Verifier, Create-Lead-If-Missing",
        expected_output:
          "Hunter returns the deliverability status of the given address. Only a valid address is saved as a lead. If the lead already exists, it reports that no changes were made."
      },
      {
        description: "Find companies and add the ones the user picks to a new company list",
        user_prompt:
          "Using Hunter, find fintech companies in Berlin with 50 to 200 employees, then add the two I pick to a new company list called 'Berlin Fintech'.",
        tools_triggered: "Find-Companies, Create-Company-List, Save-Company, Add-Company-To-List",
        expected_output:
          "Matching companies are shown and the user picks two. A company list is created, and each picked company is saved and added to it. No credits are used and no contacts are looked up."
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
        tools_triggered:
          "Create-Sequence, List-Sequence-Follow-Ups, Update-Sequence-Follow-Up, Create-Sequence-Follow-Up, Add-Sequence-Recipients",
        expected_output:
          "A draft sequence is created with two authored steps and one recipient, with a Hunter link to review it. The first email is written by updating the auto-created step 0; the follow-up is appended. The sequence is not started and no emails are sent."
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
        description: "Save a Discover search and list saved searches",
        user_prompt:
          "Using Hunter, find SaaS companies in Portugal with 11 to 50 employees, save this search as 'Portugal SaaS', then list my saved searches.",
        tools_triggered: "Find-Companies, Create-Saved-Search, List-Saved-Searches",
        expected_output:
          "Matching companies are shown, the search is saved under the name 'Portugal SaaS', and the saved searches are listed with that one included. No credits are used."
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
      },
      {
        description:
          "Person email request: the app must not look it up. It says person emails are not available in ChatGPT and points to https://hunter.io.",
        user_prompt: "Find the email address of the CEO of stripe.com."
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

The 93 tools exposed by the Hunter ChatGPT MCP (version 4.0.0), grouped by domain — mirrors the `TOOL_NAMES` block in `src/helpers.ts` (the single source of truth). If a tool is added, extend the matrix in Section 2 before the next test run. Only `Email-Verifier` and `Company-Enrichment` use credits; all other tools are free.

| Group | Tools |
|-------|-------|
| Company search & email verification | `Find-Companies`, `Email-Verifier` (checks an address the user gives), `Email-Count` (counts only, with a hunter.io link) |
| Enrichment | `Company-Enrichment` |
| Account | `Get-Account-Details` |
| Usage (V3) | `Get-Usage` |
| Email accounts | `List-Email-Accounts`, `Get-Email-Account` (V3), `List-Email-Account-Sequences` (V3) |
| Sequences | `List-Sequences`, `Get-Sequence` (V3), `Create-Sequence` (V3), `Update-Sequence` (V3), `Delete-Sequence` (V3), `List-Sequence-Follow-Ups`, `Get-Sequence-Follow-Up` (V3), `Create-Sequence-Follow-Up` (V3), `Update-Sequence-Follow-Up` (V3), `Delete-Sequence-Follow-Up` (V3), `Pause-Sequence`, `Resume-Sequence`, `Archive-Sequence`, `Get-Sequence-Stats`, `List-Sequence-Recipients`, `Add-Sequence-Recipients`, `Remove-Sequence-Recipients`, `Start-Sequence` |
| Message templates (V3) | `List-Message-Templates`, `Get-Message-Template`, `Create-Message-Template`, `Update-Message-Template`, `Delete-Message-Template` |
| Leads | `List-Leads`, `Get-Lead`, `Create-Lead`, `Update-Lead`, `Delete-Lead`, `Create-Or-Update-Lead`, `Create-Lead-If-Missing`, `Lead-Exists`, `Save-Company` |
| Lead tags (V3) | `List-Lead-Tags`, `Create-Lead-Tag`, `Update-Lead-Tag`, `Delete-Lead-Tag`, `Add-Tag-To-Lead`, `Remove-Tag-From-Lead` |
| Leads lists | `List-Leads-Lists`, `Get-Leads-List`, `Create-Leads-List`, `Update-Leads-List`, `Delete-Leads-List`, `Merge-Leads-Lists` |
| Leads-list folders & favorites (V3) | `List-Leads-List-Folders`, `Create-Leads-List-Folder`, `Update-Leads-List-Folder`, `Delete-Leads-List-Folder`, `Favorite-Leads-List`, `Unfavorite-Leads-List` |
| Company lists (HUN-20196) | `List-Company-Lists`, `Get-Company-List`, `Create-Company-List`, `Update-Company-List`, `Delete-Company-List` |
| Company list folders (HUN-20196) | `List-Company-List-Folders`, `Create-Company-List-Folder`, `Update-Company-List-Folder`, `Delete-Company-List-Folder` |
| Company list favorites/membership (HUN-20196) | `Favorite-Company-List`, `Unfavorite-Company-List`, `Add-Company-To-List`, `Remove-Company-From-List` |
| Bulk operations (V3) | `Bulk-Move-Leads`, `Bulk-Delete-Leads`, `Bulk-Move-Companies`, `Bulk-Copy-Companies`, `Bulk-Delete-Companies` |
| Discover people counts & saved searches (V3) | `Find-People` (counts only, with a hunter.io link), `List-Saved-Searches`, `Get-Saved-Search`, `Create-Saved-Search`, `Delete-Saved-Search` |
| Connected apps & integrations | `List-Connected-Apps`, `Get-Connected-App`, `Push-Leads-To-CRM` (V3), `List-Webhooks` (V3), `Update-Webhook` (V3) |
| Custom attributes | `List-Custom-Attributes`, `Get-Custom-Attribute`, `Create-Custom-Attribute`, `Update-Custom-Attribute`, `Delete-Custom-Attribute` |
| Feedback | `Report-API-Feedback` (free; agents report API/tool friction — missing endpoints, wrong docs, bad data, bugs) |
| Named prompts | `build-list` (from email addresses the user gives), `sequence-prep` |
| Widgets | `discover-widget`, `company-widget` |
| Resources | `capabilities-recovery` (read when the user asks for something the app cannot do, such as a person's email address) |
