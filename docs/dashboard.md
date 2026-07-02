# OpenAI Apps SDK Dashboard — Hunter ChatGPT MCP

This file is a **pointer**, not the dashboard source-of-truth. The previous
per-tool justification tables that lived here are stale. The **current**
annotation posture is set by the **HUN-20797** pass (see the posture note
below). The earlier HUN-20170-v3 pass established the billable-lookup defense
(position D: paid lookups stay `readOnly=false / destructive=false /
openWorld=true`, with bulk credit consent enforced by a server-side
`confirmed_credit_use` guard on `Domain-Search`), which HUN-20797 carries
forward verbatim — but the paste-source and matrix below are the HUN-20797
artifacts, not the v3 ones.

The authoritative justifications to paste into the OpenAI Developer
dashboard live at:

```
chatgpt-mcp/.context/HUN-20797/tool-justifications.md
```

`.context/` is gitignored (local-only working artifact). Re-create the file
from `docs/plans/2026-06-29-fix-chatgpt-app-resubmission-sequence-annotations-plan.md`
(the post-implementation correction banner + the per-tool justification target
strings) whenever the annotation constants or descriptions change. Do not paste
justifications from this file.

## Pre-submission checklist (run before every resubmission)

> **HUN-20797 / v2.5.12 — `openWorldHint` posture.** A tool is `openWorldHint: true` **iff** it reads Hunter's open-internet data index (`Find-Companies`, `Email-Count`, the 6 billable lookups) OR can produce an externally-visible send: `Start-Campaign`, plus `Resume-Sequence` and `Add-Campaign-Recipients` — both can schedule real outbound email on a started / paused-with-pending campaign without a separate Start-Campaign call (Codex review on #13429). Account-only operations are `openWorldHint: false`, including `Pause-Sequence`, `Archive-Sequence`, and `Remove-Campaign-Recipients` — the latter cancels a recipient's pending (not-yet-sent) outbound messages even on a started campaign, but creates no externally-visible artifact (nothing is sent; the recipient was never reached), so it stays closed-world (mirror of `Add`, which makes an email arrive). Matches OpenAI's rule (open-world = effects visible beyond the current user). The `Add-Campaign-Recipients` **description** is qualified for draft (stages only) vs already-started (can send immediately) campaigns so the assistant does not under-warn the user (Codex P2 on #13429). Re-add the connector after deploy to refresh cached dashboard cards.

- [ ] Bump `McpServer.version` in `chatgpt-mcp/src/index.ts` so ChatGPT's `tools/list` cache invalidates.
- [ ] Deploy: `pnpm --filter chatgpt-mcp run deploy`.
- [ ] In the OpenAI Developer dashboard, **create a new app version** (do NOT edit the existing one; in-place edits do not refresh `tools/list`). Then click **Scan Tools** explicitly.
- [ ] Confirm the dashboard tool count and `Read Only` / `Open World` / `Destructive` flags match the **HUN-20797 posture note above** (and the matrix in the 2026-06-29 plan) — in particular Pause/Archive/Remove-Campaign-Recipients = `Open World False`, Resume-Sequence/Add-Campaign-Recipients/Start-Campaign = `Open World True`. Any mismatch → fix code & redeploy before pasting justifications.
- [ ] Verify each renamed-via-title tool surfaces the verb-form label on its card (`Find Emails By Domain`, `Find Person Email`, `Verify Email`, `Enrich Person`, `Enrich Company`, `Enrich Person And Company`). If the dashboard shows only the canonical `name`, execute the canonical-rename contingency described in the 2026-05-28 v3 plan's Phase 5.3.
- [ ] For **every** tool, paste the Description (no edits) and the three justification lines from `chatgpt-mcp/.context/HUN-20797/tool-justifications.md` verbatim (or run `chatgpt-mcp/.context/HUN-20797/justifications-autofill.console.js` in the dashboard console to fill all 56×3 fields). Each justification stays ≤200 chars.
- [ ] Verify zero "Recommended: Add an `outputSchema`" warnings remain.
- [ ] Wire-format annotation completeness: confirm the deployed `tools/list` response includes `readOnlyHint`, `destructiveHint`, and `openWorldHint` as explicit booleans (never `null`/omitted) on every tool. See the `curl + jq` check in the 2026-05-28 v3 plan's Phase 5.2.
- [ ] CSP / widget verification: `_meta.ui.csp.connectDomains` includes `https://api.hunter.io`, `frameDomains` is `[]` (explicit empty), and both widgets render without CSP errors after Scan Tools completes.
- [ ] Demo account: real API key, ≥200 search + ≥50 verification credits, no MFA, no sign-up gate. Pre-warm state per the 2026-06-29 plan's U6.4 (real **started** sequence so Pause/Resume/Archive return real success, plus a campaign with a free recipient slot).
- [ ] Capture a full-screen screenshot of the dashboard tool list showing no warnings; attach to the PR.
- [ ] Run every Section 1 prompt from [`../TESTING_PLAYBOOK.md`](../TESTING_PLAYBOOK.md) on ChatGPT web AND ChatGPT mobile (iOS + Android). Capture screen recordings into the PR for both mobile platforms.
- [ ] Paste the **"Ready-to-paste OpenAI resubmission note"** from `docs/plans/2026-06-29-fix-chatgpt-app-resubmission-sequence-annotations-plan.md` (it reflects the current Pause/Archive/Remove = false, Resume/Add/Start = true posture) into OpenAI's resubmission notes field. Do **not** use the older `TESTING_PLAYBOOK.md` Section 5 note — it predates the HUN-20797 flips.
- [ ] Click Submit.

## Why this file is a pointer

Keeping the justification copy in a gitignored `.context/HUN-20797/`
file means:

1. The dashboard text is **regenerated from the plan + current code** every
   resubmission cycle. Stale tables can't drift into the dashboard.
2. The plan (`docs/plans/2026-06-29-fix-chatgpt-app-resubmission-sequence-annotations-plan.md`)
   and the code constants are the single source of truth. `dashboard.md` is
   just the human-runnable checklist that points at them.
3. Local-only artifacts (per the `feedback_no_committing_todos` rule) stay
   out of git; the PR carries the plan + code + tests, not the paste-source.
