# OpenAI Apps SDK Dashboard — Hunter ChatGPT MCP

This file is a **pointer**, not the dashboard source-of-truth. The current
surface is **version 4.0.0 with 93 tools** (HUN-23709). OpenAI rejected 2.0.0
because of the person-email features, so 4.0.0 removes 8 tools:

- Person email: `Domain-Search`, `Email-Finder`, `Person-Enrichment`,
  `Combined-Enrichment`, `Plan-Prospecting-Flow`.
- API keys: `List-API-Keys`, `Create-API-Key`, `Delete-API-Key`. These tools
  refuse OAuth tokens, and the ChatGPT app connects with OAuth.

`Email-Verifier` stays. It only checks an address that the user gives.
`Email-Count` and `Find-People` stay. They return counts only, with a link to
hunter.io where the user sees the addresses. The server instructions tell the
model that person email addresses are not available in ChatGPT, and point the
user to hunter.io.

The HUN-20797 sequence-tool posture stays: Pause and Archive are closed-world.
Resume and Add-Sequence-Recipients are open-world, because they can schedule a
real send.

The justifications to paste into the OpenAI Developer dashboard live at:

```
chatgpt-mcp/.context/v4-resubmission/tool-justifications.md
chatgpt-mcp/.context/v4-resubmission/justifications-autofill.console.js
```

`.context/` is gitignored (local-only working artifact). Generate both files
from the deployed `tools/list` and the annotation constants. Generate them
again when the annotation posture or a tool description changes. The `.js` file
comes from the `.md` file, so the two must stay the same. Do not paste
justifications from this file.

## Pre-submission checklist (run before every resubmission)

> **4.0.0 — posture summary.** A tool is `openWorldHint: true` only if it reads
> the Hunter index of open-internet data (`Find-Companies`, `Email-Count`,
> `Find-People`, `Email-Verifier`, `Company-Enrichment`), or if it can have an
> effect outside the account of the user. These tools have that effect: `Start-Sequence` (sends),
> `Resume-Sequence` and `Add-Sequence-Recipients` (can schedule real email),
> and `Push-Leads-To-CRM` (lead data goes to the external CRM of the user). The
> 10 tools that create, change, or delete lead tags and list folders are also
> `openWorldHint: true`, because the OpenAI MCP scan on 2026-10-02 held them with
> `false`. `Report-API-Feedback` is `true` for the same reason.
> `Remove-Tag-From-Lead` stays `false`. All other
> tools are `openWorldHint: false`. Nine tools also ask for confirmation
> in the app (the `confirmed: true` re-issue pattern): Start-Sequence,
> Delete-Sequence, Add-Sequence-Recipients (started sequences only), the 5 bulk
> tools, and Push-Leads-To-CRM.

- [ ] Make sure that `McpServer.version` in `chatgpt-mcp/src/index.ts` is `4.0.0`.
- [ ] Deploy: `pnpm --filter chatgpt-mcp run deploy`.
- [ ] Send `initialize` to `https://chatgpt.hunter.io/mcp`. Make sure that `serverInfo.version` is `4.0.0`.
- [ ] Send `tools/list`. Make sure that it returns 93 tools and none of the 8 removed tools.
- [ ] In the OpenAI Developer dashboard, withdraw version 2.0.0 from review.
- [ ] **Create a new app version.** Do not edit an existing version, because an edit does not refresh `tools/list`. Then click **Scan Tools**.
- [ ] Make sure that the dashboard shows **93 tools**. Make sure that the `Read Only`, `Open World`, and `Destructive` flags agree with the posture summary. If a flag is different, correct the code and deploy again before you paste justifications.
- [ ] Make sure that these tools show their title: `Verify Email`, `Enrich Company`, and `Count Emails at Companies` (`Find-People`).
- [ ] For **each** tool, paste the description (no edits) and the three justification lines from `tool-justifications.md`. Or run `justifications-autofill.console.js` in the dashboard console to fill all 93×3 fields. Each justification is 200 characters or fewer.
- [ ] Make sure that no "Recommended: Add an `outputSchema`" warning shows.
- [ ] Make sure that each tool in the deployed `tools/list` has `readOnlyHint`, `destructiveHint`, and `openWorldHint` as explicit booleans (never `null` or missing). See the `curl + jq` check in the 2026-05-28 v3 plan, Phase 5.2.
- [ ] CSP and widgets: make sure that `_meta.ui.csp.connectDomains` includes `https://api.hunter.io` and `frameDomains` is `[]`. Make sure that both widgets show without CSP errors after Scan Tools.
- [ ] Demo account: a real API key, 50 or more verification credits, no MFA, and no sign-up gate. Prepare a **started** sequence (so Pause, Resume, and Archive return real success), a draft sequence with a free recipient slot, a saved message template, some lead tags, and a connected CRM app if available.
- [ ] Take a full-screen screenshot of the dashboard tool list with no warnings. Attach it to the PR.
- [ ] Do the [`../TESTING_PLAYBOOK.md`](../TESTING_PLAYBOOK.md) pass on ChatGPT web and ChatGPT mobile (iOS and Android). Record the mobile screens.
- [ ] Paste the resubmission notes from `TESTING_PLAYBOOK.md` **Section 5** into the resubmission notes field.
- [ ] Click Submit.

## Why this file is a pointer

The dashboard copy stays in a gitignored `.context/v4-resubmission/` folder
for three reasons:

1. Each resubmission generates the dashboard text from the current code (the
   live `tools/list` and the annotation constants). Old tables cannot get into
   the dashboard.
2. The playbook (`../TESTING_PLAYBOOK.md`) and the code constants are the
   source of truth. `dashboard.md` is only the checklist that points to them.
3. Local-only artifacts (the `feedback_no_committing_todos` rule) stay out of
   git. The PR carries the code and the tests, not the paste source.
