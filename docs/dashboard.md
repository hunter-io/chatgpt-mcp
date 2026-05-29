# OpenAI Apps SDK Dashboard — Hunter ChatGPT MCP

This file is a **pointer**, not the dashboard source-of-truth. The previous
per-tool justification tables that lived here are stale after the HUN-20170-v3
annotation precision pass (position D: paid lookups stay `readOnly=false /
destructive=false / openWorld=true`, with bulk credit consent enforced by a
new server-side `confirmed_credit_use` guard on `Domain-Search`).

The authoritative justifications to paste into the OpenAI Developer
dashboard live at:

```
chatgpt-mcp/.context/HUN-20170-v3/tool-justifications.md
```

`.context/` is gitignored (local-only working artifact). Re-create the file
from the matrix in `docs/plans/2026-05-28-fix-chatgpt-mcp-resubmission-v3-annotation-precision-plan.md`
("Recommended final annotation matrix") whenever the annotation constants
or descriptions change. Do not paste justifications from this file.

## Pre-submission checklist (run before every resubmission)

- [ ] Bump `McpServer.version` in `chatgpt-mcp/src/index.ts` so ChatGPT's `tools/list` cache invalidates.
- [ ] Deploy: `pnpm --filter chatgpt-mcp run deploy`.
- [ ] In the OpenAI Developer dashboard, **create a new app version** (do NOT edit the existing one; in-place edits do not refresh `tools/list`). Then click **Scan Tools** explicitly.
- [ ] Confirm the dashboard tool count and `Read Only` / `Open World` / `Destructive` flags match the v3 matrix in the plan. Any mismatch → fix code & redeploy before pasting justifications.
- [ ] Verify each renamed-via-title tool surfaces the verb-form label on its card (`Find Emails By Domain`, `Find Person Email`, `Verify Email`, `Enrich Person`, `Enrich Company`, `Enrich Person And Company`). If the dashboard shows only the canonical `name`, execute the canonical-rename contingency described in the plan's Phase 5.3.
- [ ] For **every** tool, paste the Description (no edits) and the three justification lines from `chatgpt-mcp/.context/HUN-20170-v3/tool-justifications.md` verbatim. Each justification stays ≤200 chars.
- [ ] Verify zero "Recommended: Add an `outputSchema`" warnings remain.
- [ ] Wire-format annotation completeness: confirm the deployed `tools/list` response includes `readOnlyHint`, `destructiveHint`, and `openWorldHint` as explicit booleans (never `null`/omitted) on every tool. See the `curl + jq` check in the plan's Phase 5.2.
- [ ] CSP / widget verification: `_meta.ui.csp.connectDomains` includes `https://api.hunter.io`, `frameDomains` is `[]` (explicit empty), and both widgets render without CSP errors after Scan Tools completes.
- [ ] Demo account: real API key, ≥200 search + ≥50 verification credits, no MFA, no sign-up gate. Pre-warm state per the plan's Phase 5.5.
- [ ] Capture a full-screen screenshot of the dashboard tool list showing no warnings; attach to the PR.
- [ ] Run every Section 1 prompt from [`../TESTING_PLAYBOOK.md`](../TESTING_PLAYBOOK.md) on ChatGPT web AND ChatGPT mobile (iOS + Android). Capture screen recordings into the PR for both mobile platforms.
- [ ] Paste the resubmission note from Section 5 of `TESTING_PLAYBOOK.md` into OpenAI's resubmission notes field.
- [ ] Click Submit.

## Why this file is a pointer

Keeping the justification copy in a gitignored `.context/HUN-20170-v3/`
file means:

1. The dashboard text is **regenerated from the plan + current code** every
   resubmission cycle. Stale tables can't drift into the dashboard.
2. The plan (`docs/plans/2026-05-28-...`) and the code constants are the
   single source of truth. `dashboard.md` is just the human-runnable
   checklist that points at them.
3. Local-only artifacts (per the `feedback_no_committing_todos` rule) stay
   out of git; the PR carries the plan + code + tests, not the paste-source.
