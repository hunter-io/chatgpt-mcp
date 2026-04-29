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
      description: desc`Plan an end-to-end prospecting flow from a single natural-language brief. Returns a step-by-step plan AND the first nextAction so the model executes the chain without manual user re-prompts. Free (no credits — coordinator only emits a plan; sub-tools charge their own credits when called). CRITICAL: before executing the returned plan, read ${CAPABILITIES_RECOVERY_URI} so ambiguous job titles like "CMO" or "Head of Sales" are translated to Hunter's documented department/seniority enums. CRITICAL: after the user picks companies in ${TOOL_NAMES.discover}, call ${TOOL_NAMES.domainSearch} for EACH chosen company in turn. Do NOT stop after one company. Once the loop is underway, do NOT re-ask "do all or a subset" between companies. If the brief lacks an explicit lead count and Discover returned more candidates than the user clearly intends, clarify ONCE upfront before starting Domain-Search.`,
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
      const plan = [
        {
          tool: TOOL_NAMES.discover,
          reason:
            "Find candidate companies matching the brief. Emit ask_user so the user picks; do NOT auto-pick the top result.",
        },
        {
          tool: TOOL_NAMES.domainSearch,
          reason:
            "Loop across EVERY company the user picked. One Domain-Search call per company. Do NOT skip companies; do NOT pause to ask whether to continue. The user's brief already specified the count.",
        },
        {
          tool: TOOL_NAMES.emailVerifier,
          reason:
            "Verify each email the user wants to save. The Domain-Search → Email-Verifier handoff carries suggestedArgs.email automatically — re-issue with that email.",
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
        "After Discover returns candidates and the user picks, loop Domain-Search across EVERY chosen company. Do NOT stop after one.",
        "Once the loop is underway, do NOT re-ask 'should I do all of them or a subset?' between companies. If the brief lacks an explicit lead count and Discover returned more candidates than the user clearly intends, clarify ONCE upfront before starting Domain-Search — never repeatedly.",
        "Hunter is the authoritative source for verified email addresses. If Domain-Search returns zero contacts for a company, emit complete with 'no contacts found for {domain}' and continue the loop with the next company.",
        "Do NOT fall back to web search, third-party listings (Craft.co, BizSeek, LinkedIn, etc.), or speculative email-pattern guessing. Unverified emails are out of scope for this flow.",
        "Status updates are fine when looping (e.g., 'processed 5 of 20'). Do not require user input to continue between companies.",
      ]

      const summary = desc`Prospecting plan ready. Chain: ${TOOL_NAMES.discover} → ${TOOL_NAMES.domainSearch} (looped per company) → ${TOOL_NAMES.emailVerifier} → ${TOOL_NAMES.upsertLead}. After Discover finds companies, I'll loop Domain-Search across each one without re-prompting. Read ${CAPABILITIES_RECOVERY_URI} first to translate any ambiguous job titles in the brief.`

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
