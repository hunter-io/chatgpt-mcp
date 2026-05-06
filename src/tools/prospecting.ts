// `prospect` coordinator tool — entry point for the multi-step prospecting flow.
//
// Returns a complete plan in structuredContent.plan AND a first-step nextAction
// so the model auto-executes the chain. Pattern from
// openai/openai-apps-sdk-examples/cards_against_ai_server_node — full-plan +
// step-by-step hybrid. The model treats plain plan arrays as informational and
// stalls without the nextAction trigger; emitting both is required.
//
// Coordinator does NOT execute the chain server-side: keeps Workers within
// CPU/wall-clock limits and lets the model adapt mid-flow (skip a domain, ask
// for clarification, parallelise).
//
// See docs/plans/2026-04-28-feat-chatgpt-app-review-readiness-plan.md (Pillar 2).

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { READ_ONLY_ANNOTATIONS, TOOL_NAMES, buildNextAction, desc } from "../helpers"
import { CAPABILITIES_RECOVERY_URI } from "../resources/capabilities-recovery"

export function registerProspectingTool(server: McpServer) {
  server.registerTool(
    TOOL_NAMES.prospecting,
    {
      description: desc`Plan an end-to-end prospecting flow from a single natural-language brief. Returns a step-by-step plan AND the first nextAction so the model executes the chain without manual user re-prompts. Free (no credits — coordinator only emits a plan; sub-tools charge their own credits when called). CRITICAL: before executing the returned plan, read ${CAPABILITIES_RECOVERY_URI} so ambiguous job titles like "CMO" or "Head of Sales" are translated to Hunter's documented department/seniority enums. CRITICAL: after the user picks in ${TOOL_NAMES.discover}, if 2+ companies were picked, call ${TOOL_NAMES.domainSearch} ONCE with the FIRST domain and \`pending_companies\` set to the remaining picks — the chain auto-threads through Email-Verifier and Upsert-Lead per company. If exactly one company was picked, call Domain-Search without \`pending_companies\` (single-company mode preserves the confirmation gate). Do NOT stop after one company in either path. Once the loop is underway, do NOT re-ask "do all or a subset" between companies. If the brief lacks an explicit lead count and Discover returned more candidates than the user clearly intends, clarify ONCE upfront before starting Domain-Search.`,
      inputSchema: {
        query: z
          .string()
          .describe(
            "Natural-language prospecting brief, e.g. 'Find 20 marketing leads at fintech companies in Berlin'.",
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query: _query }) => {
      // The user's query is intentionally NOT echoed into structured/assistant-only
      // payloads (prompt-injection guard). The model received `query` as the input
      // arg and can reference it from there; re-emitting in suggestedArgs would
      // give an attacker a higher-leverage injection vector inside the model-only
      // content block. See docs/plans/...-readiness-plan.md (Pillar 1 security).
      //
      // The plan + directives below teach the agent to seed `pending_companies`
      // on the first Domain-Search call. Where the MCP supports it (chatgpt-mcp
      // since HUN-19560), this auto-threads the chain through Email-Verifier
      // and Upsert-Lead per company without between-company confirmation gates.
      // Where the MCP doesn't support it (remote-mcp at time of writing), Zod
      // silently strips the unknown field and the agent falls back to a
      // per-company manual loop — same behaviour as before. The directive is
      // cross-MCP-safe.
      const plan = [
        {
          tool: TOOL_NAMES.discover,
          reason:
            "Find candidate companies matching the brief. Emit ask_user so the user picks; do NOT auto-pick the top result.",
        },
        {
          tool: TOOL_NAMES.domainSearch,
          reason:
            "If the user picked 2+ companies: call ONCE with the FIRST picked domain and `pending_companies` set to the remaining picks. The chain auto-threads through Email-Verifier and Upsert-Lead per company. If the user picked exactly ONE company: do NOT pass `pending_companies` — single-company mode applies the confirmation gate on Email-Verifier correctly.",
        },
        {
          tool: TOOL_NAMES.emailVerifier,
          reason: "Verify each email the user wants to save. The Domain-Search handoff carries suggestedArgs.email.",
        },
        {
          tool: TOOL_NAMES.upsertLead,
          reason: 'Save only emails that returned status: "valid". Idempotent — safe to retry on transient errors.',
        },
      ]

      const firstStep = buildNextAction({
        kind: "call_tool",
        tool: TOOL_NAMES.discover,
        reason: "Start the prospecting flow by discovering companies that match the brief.",
      })

      // Session-level directives the agent treats as rules for the rest of the
      // conversation. Cheaper than repeating them in every tool description.
      // Carried in both the assistant-only content block and structuredContent
      // so the model has them whether it inspects content or structuredContent.
      const directives = [
        "After Discover picks: if the user picked 2+ companies, call Domain-Search ONCE with the FIRST domain and `pending_companies` = remaining picks — the chain auto-threads through Email-Verifier → Upsert-Lead → next Domain-Search per company without between-company confirmation gates. If the user picked exactly ONE company, do NOT pass `pending_companies` — single-company mode is correct (the confirmation gate on Email-Verifier protects against accidental credit spend on a single, unauthorized save). Cap: pending_companies accepts at most 50 entries — if the user picked more, loop Domain-Search per company manually. Manual-loop fallback also applies when the response is a call_tool whose suggestedArgs lacks `pending_companies` (legacy MCP without loop support) — never stop after one. CRITICAL: if the response is an ask_user (recovery prompt or any other ask_user), ALWAYS relay it verbatim to the user and wait for their answer — never bypass an ask_user with a manual loop.",
        "Before issuing the first Domain-Search call with `pending_companies` (loop mode), surface an upfront cost estimate to the user and wait for their go-ahead: each picked company costs ~1 search credit (Domain-Search) + up to ~1 verification credit (Email-Verifier per saved valid email) — for N picks, expect roughly N search + up to N verification credits. This is the SINGLE confirmation point for the entire loop, replacing the per-company gates that loop mode drops; once the user OKs, do NOT pause between companies.",
        "Once the loop is underway, do NOT re-ask 'should I do all of them or a subset?' between companies. If the brief lacks an explicit lead count and Discover returned more candidates than the user clearly intends, clarify ONCE upfront before starting Domain-Search — never repeatedly.",
        "Hunter is the authoritative source for verified email addresses. If Domain-Search returns zero contacts for a company, emit complete with 'no contacts found for {domain}' and continue the loop with the next company.",
        "Do NOT fall back to web search, third-party listings (Craft.co, BizSeek, LinkedIn, etc.), or speculative email-pattern guessing. Unverified emails are out of scope for this flow.",
        "Status updates are fine when looping (e.g., 'processed 5 of 20'). Do not require user input to continue between companies.",
      ]

      const summary = desc`Prospecting plan ready. Chain: ${TOOL_NAMES.discover} → ${TOOL_NAMES.domainSearch} (seeded with pending_companies) → ${TOOL_NAMES.emailVerifier} → ${TOOL_NAMES.upsertLead} → next ${TOOL_NAMES.domainSearch} (auto-threaded per company). Read ${CAPABILITIES_RECOVERY_URI} first to translate any ambiguous job titles in the brief.`

      return {
        content: [
          { type: "text" as const, text: summary },
          {
            type: "text" as const,
            text: JSON.stringify({ plan, nextAction: firstStep, directives }),
            annotations: { audience: ["assistant"] },
          },
        ],
        structuredContent: { plan, nextAction: firstStep, directives },
      }
    },
  )
}
