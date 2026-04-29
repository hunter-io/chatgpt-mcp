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
      description: desc`Plan an end-to-end prospecting flow from a single natural-language brief. Returns a step-by-step plan AND the first nextAction so the model executes the chain without manual user re-prompts. Free (no credits — coordinator only emits a plan; sub-tools charge their own credits when called). CRITICAL: before executing the returned plan, read ${CAPABILITIES_RECOVERY_URI} so ambiguous job titles like "CMO" or "Head of Sales" are translated to Hunter's documented department/seniority enums.`,
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
          reason: "Find candidate companies matching the brief.",
        },
        {
          tool: TOOL_NAMES.domainSearch,
          reason: "After the user picks one or more companies, find contacts at each.",
        },
        {
          tool: TOOL_NAMES.emailVerifier,
          reason: "Verify deliverability of contacts the user wants to save.",
        },
        {
          tool: TOOL_NAMES.upsertLead,
          reason: "Save verified contacts as Hunter leads (idempotent — safe to retry).",
        },
      ]

      const firstStep = buildNextAction({
        kind: "call_tool",
        tool: TOOL_NAMES.discover,
        reason: "Start the prospecting flow by discovering companies that match the brief.",
      })

      const summary = desc`Prospecting plan ready. Chain: ${TOOL_NAMES.discover} → ${TOOL_NAMES.domainSearch} → ${TOOL_NAMES.emailVerifier} → ${TOOL_NAMES.upsertLead}. Read ${CAPABILITIES_RECOVERY_URI} first to translate any ambiguous job titles in the brief.`

      return {
        content: [
          { type: "text" as const, text: summary },
          {
            type: "text" as const,
            text: JSON.stringify({ plan, nextAction: firstStep }),
            annotations: { audience: ["assistant"] },
          },
        ],
        structuredContent: { plan, nextAction: firstStep },
      }
    },
  )
}
