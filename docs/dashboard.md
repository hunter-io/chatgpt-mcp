# OpenAI Apps SDK Dashboard — Hunter ChatGPT MCP

This file is a **pointer**, not the dashboard source-of-truth. The **current**
annotation posture is the **V3** pass (HUN-20838…HUN-20869: 100 tools, the
campaigns→sequences terminology migration, and the new sequence-authoring /
lead-organization / bulk / discover-people / integrations / account-management
tool families). It carries forward, unchanged:

- the HUN-20170-v3 billable-lookup defense (position D: paid lookups stay
  `readOnly=false / destructive=false / openWorld=true`, with bulk credit
  consent enforced by a server-side `confirmed_credit_use` guard on
  `Domain-Search`), and
- the HUN-20797 sequence-tool posture (Pause/Archive = closed-world,
  Resume/Add-recipients = open-world because they can schedule a real send),
  with the tools now carrying their sequence names after the rename.

The authoritative justifications to paste into the OpenAI Developer
dashboard live at:

```
chatgpt-mcp/.context/v3-resubmission/tool-justifications.md
chatgpt-mcp/.context/v3-resubmission/justifications-autofill.console.js
```

`.context/` is gitignored (local-only working artifact). Regenerate both files
from the deployed `tools/list` + the annotation constants whenever the
annotation posture or tool descriptions change (the `.js` is generated from
the `.md`; they must never drift apart). Do not paste justifications from this
file.

## Pre-submission checklist (run before every resubmission)

> **V3 / v3.0.0 — posture summary.** A tool is `openWorldHint: true` **iff**
> it reads Hunter's open-internet data index (`Find-Companies`, `Find-People`,
> `Email-Count`, the 6 billable lookups) OR can produce an externally-visible
> effect: `Start-Sequence` (sends), `Resume-Sequence` and
> `Add-Sequence-Recipients` (both can schedule real outbound email on a
> started / paused-with-pending sequence without a separate start call), and
> `Push-Leads-To-CRM` (lead data leaves Hunter into the user's external CRM).
> Everything else — including all creates, updates, deletes, bulk operations,
> tags, folders, templates, saved searches, webhooks, API keys, usage, and
> email-account reads — is `openWorldHint: false`. Ten tools are additionally
> confirmation-gated in-app (`confirmed: true` re-issue pattern):
> Start-Sequence, Delete-Sequence, the 5 bulk tools, Push-Leads-To-CRM,
> Create-API-Key, Delete-API-Key. Matches OpenAI's rule (open-world = effects
> visible beyond the current user). Re-add the connector after deploy to
> refresh cached dashboard cards.

- [ ] Bump `McpServer.version` in `chatgpt-mcp/src/index.ts` so ChatGPT's `tools/list` cache invalidates (V3 shipped as `3.0.0`).
- [ ] Deploy: `pnpm --filter chatgpt-mcp run deploy`.
- [ ] In the OpenAI Developer dashboard, **create a new app version** (do NOT edit the existing one; in-place edits do not refresh `tools/list`). Then click **Scan Tools** explicitly.
- [ ] Confirm the dashboard shows **100 tools** and the `Read Only` / `Open World` / `Destructive` flags match the posture note above. Any mismatch → fix code & redeploy before pasting justifications.
- [ ] Verify each renamed-via-title tool surfaces the verb-form label on its card (`Find Emails By Domain`, `Find Person Email`, `Verify Email`, `Enrich Person`, `Enrich Company`, `Enrich Person And Company`). If the dashboard shows only the canonical `name`, execute the canonical-rename contingency described in the 2026-05-28 v3 plan's Phase 5.3.
- [ ] For **every** tool, paste the Description (no edits) and the three justification lines from `chatgpt-mcp/.context/v3-resubmission/tool-justifications.md` verbatim (or run `chatgpt-mcp/.context/v3-resubmission/justifications-autofill.console.js` in the dashboard console to fill all 100×3 fields). Each justification stays ≤200 chars.
- [ ] Verify zero "Recommended: Add an `outputSchema`" warnings remain.
- [ ] Wire-format annotation completeness: confirm the deployed `tools/list` response includes `readOnlyHint`, `destructiveHint`, and `openWorldHint` as explicit booleans (never `null`/omitted) on every tool. See the `curl + jq` check in the 2026-05-28 v3 plan's Phase 5.2.
- [ ] CSP / widget verification: `_meta.ui.csp.connectDomains` includes `https://api.hunter.io`, `frameDomains` is `[]` (explicit empty), and both widgets render without CSP errors after Scan Tools completes.
- [ ] Demo account: real API key, ≥200 search + ≥50 verification credits, no MFA, no sign-up gate. Pre-warm state: a real **started** sequence (so Pause/Resume/Archive return real success), a draft sequence with a free recipient slot, at least one saved message template, a couple of lead tags, and — if available — a connected CRM app.
- [ ] Capture a full-screen screenshot of the dashboard tool list showing no warnings; attach to the PR.
- [ ] Run the [`../TESTING_PLAYBOOK.md`](../TESTING_PLAYBOOK.md) V3 pass: every Section 1 prompt on ChatGPT web AND ChatGPT mobile (iOS + Android; capture screen recordings), plus the Section 2 rows for the new tool families and the Section 3 edge cases 3.12–3.21.
- [ ] Paste the resubmission note from `TESTING_PLAYBOOK.md` **Section 5** (notes A–E; note E covers the V3 terminology migration, the new tool families, and the Idempotency-Key behavior) into OpenAI's resubmission notes field.
- [ ] Click Submit.

## Why this file is a pointer

Keeping the justification copy in a gitignored `.context/v3-resubmission/`
file means:

1. The dashboard text is **regenerated from the current code** (the live
   `tools/list` + annotation constants) every resubmission cycle. Stale
   tables can't drift into the dashboard.
2. The playbook (`../TESTING_PLAYBOOK.md`), the implementation plan
   (`docs/plans/2026-07-02-001-feat-mcp-chatgpt-api-parity-plan.md`), and the
   code constants are the single source of truth. `dashboard.md` is just the
   human-runnable checklist that points at them.
3. Local-only artifacts (per the `feedback_no_committing_todos` rule) stay
   out of git; the PR carries the plan + code + tests, not the paste-source.
