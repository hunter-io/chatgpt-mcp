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
import { LOCAL_PLAN_ANNOTATIONS, TOOL_NAMES, buildNextAction, desc } from "../helpers"
import { CAPABILITIES_RECOVERY_URI } from "../resources/capabilities-recovery"
import { nextActionSchema } from "../schemas/common"

// Synthetic coordinator payload: { plan, nextAction, directives }. Unlike every
// other tool, this is NOT a Hunter API response — Prospecting emits a plan +
// first step + session-level directives entirely client-side. The outputSchema
// reflects exactly that shape so the SDK validator passes.
const prospectingOutputSchema = z
  .object({
    plan: z.array(
      z.object({
        tool: z.enum(TOOL_NAMES),
        reason: z.string(),
      }),
    ),
    nextAction: nextActionSchema,
    directives: z.array(z.string()),
  })
  .loose()

export function registerProspectingTool(server: McpServer) {
  server.registerTool(
    TOOL_NAMES.prospecting,
    {
      description: desc`Use this when the user gives a natural-language prospecting brief (e.g. "Find 20 marketing leads at fintech companies in Berlin") and wants a step-by-step plan for finding companies, contacts, verifying emails, and saving leads. Returns the plan plus a first action so the model can execute the chain end to end. Free to call; sub-tools charge their own credits.`,
      inputSchema: {
        query: z
          .string()
          .describe(
            "Natural-language prospecting brief, e.g. 'Find 20 marketing leads at fintech companies in Berlin'.",
          ),
      },
      outputSchema: prospectingOutputSchema.shape,
      annotations: LOCAL_PLAN_ANNOTATIONS,
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
      // and Create-Lead-If-Missing per company without between-company
      // confirmation gates. Where the MCP doesn't support it (remote-mcp at
      // time of writing), Zod silently strips the unknown field and the agent
      // falls back to a per-company manual loop — same behaviour as before. The
      // directive is cross-MCP-safe.
      const plan = [
        {
          tool: TOOL_NAMES.discover,
          reason:
            "Find candidate companies matching the brief. Present the matches and ask the user which to investigate; do not auto-pick the top result.",
        },
        {
          tool: TOOL_NAMES.domainSearch,
          reason:
            "If the user picked 2+ companies: call once with the first picked domain and `pending_companies` set to the remaining picks. The response chain threads through Email-Verifier and the lead-save step per company. If the user picked exactly one company, do not pass `pending_companies` — single-company mode keeps the confirmation gate.",
        },
        {
          tool: TOOL_NAMES.emailVerifier,
          reason: "Verify each email the user wants to save. The Domain-Search handoff carries suggestedArgs.email.",
        },
        {
          tool: TOOL_NAMES.createLeadIfMissing,
          reason:
            'Save only emails that returned status: "valid". Create the lead if no lead with that email exists; otherwise return the existing lead unchanged. Idempotent and never overwrites existing records.',
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
        "After the user picks companies from the discover step: if they picked 2 or more, call Domain-Search once with the first domain and `pending_companies` set to the remaining picks — the response chain advances through Email-Verifier and the lead-save step per company without between-company confirmation gates. If they picked exactly one company, do not pass `pending_companies` so the per-call confirmation gate stays in place. The `pending_companies` array accepts at most 50 entries; for larger picks, loop Domain-Search manually per company.",
        "Before issuing the first Domain-Search call with `pending_companies`, summarise the expected credit cost to the user and wait for approval: each picked company costs roughly 1 search credit (Domain-Search) plus up to 1 verification credit (Email-Verifier per saved valid email). This is the single confirmation point for the whole loop. After approval, do not pause between companies.",
        "Once the loop is underway, do not re-ask 'should I do all of them or a subset?' between companies. If the brief lacks an explicit lead count and the discover step returned more candidates than the user clearly intends, clarify once upfront before starting Domain-Search.",
        "If Domain-Search returns zero contacts for a company, emit complete with 'no contacts found for {domain}' and continue the loop with the next company.",
        "If a response is an ask_user (recovery prompt or any other ask_user), relay it verbatim to the user and wait for their answer; do not bypass an ask_user with a manual loop.",
        "Status updates while looping are fine (e.g., 'processed 5 of 20'). Do not require user input to continue between companies.",
      ]

      const summary = desc`Prospecting plan ready. Chain: ${TOOL_NAMES.discover} → ${TOOL_NAMES.domainSearch} → ${TOOL_NAMES.emailVerifier} → ${TOOL_NAMES.createLeadIfMissing} → next ${TOOL_NAMES.domainSearch} per picked company. Read ${CAPABILITIES_RECOVERY_URI} first to translate ambiguous job titles in the brief.`

      return {
        content: [
          // `audience: ["user"]` distinguishes the human-readable summary from
          // the assistant-only directive payload below (HUN-19943 todos/013).
          { type: "text" as const, text: summary, annotations: { audience: ["user"] } },
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
