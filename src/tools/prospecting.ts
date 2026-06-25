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
      description: desc`Use this when the user gives a natural-language prospecting brief (e.g. "Find 20 marketing leads at fintech companies in Berlin") and wants a step-by-step plan for finding companies and their contacts. Returns the plan plus a first action so the model can execute the chain end to end. By default it gathers contacts for review and returns them as a table; it only saves to the user's Hunter leads when the user explicitly asks. Free to call; sub-tools charge their own credits.`,
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
      // since HUN-19560), this auto-threads the chain per company without
      // between-company confirmation gates. Where the MCP doesn't support it
      // (remote-mcp until it ports the loop), Zod silently strips the unknown
      // fields and the agent falls back to a per-company manual loop — same
      // behaviour as before. The directive is cross-MCP-safe.
      //
      // Two modes (HUN-20651): RESEARCH (the default) returns the contacts as a
      // table and saves nothing; SAVE writes leads, and only when the user
      // explicitly asked. The mode is resolved ONCE here, at plan time, from the
      // brief, and carried by the chain — never re-decided per company. The
      // safe default is load-bearing: guessing research only yields a table the
      // user can then save, whereas guessing save writes unrequested data.
      //
      // Loop closure (HUN-20651 Phase 2.5; review fix E): after a research table,
      // the user can still capture it without re-running the search. The final
      // directive routes the already-discovered rows straight through
      // Create-Lead-If-Missing (no second Domain-Search), keying each row on its
      // verification STATUS + confidence (which the model has in the table), not on
      // a save-eligible marker: valid+high-confidence rows save directly, not-yet-
      // valid rows are verified first (a single confirmation on that net-new
      // deliverability spend), and accept_all/invalid rows are NEVER saved — they
      // are surfaced back as unsaved. This mirrors the save handler's three-way
      // verificationDecision so the capture path can't drift into persisting
      // catch-all/invalid contacts that the bulk SAVE path drops.
      const plan = [
        {
          tool: TOOL_NAMES.discover,
          reason:
            "Find candidate companies matching the brief. Present the matches and ask the user which to investigate; do not auto-pick the top result.",
        },
        {
          tool: TOOL_NAMES.domainSearch,
          reason:
            "If the user picked 2+ companies: call once with the first picked domain and `pending_companies` set to the remaining picks. By default (return-results-only) the response chain advances company-to-company and you render a table at the end. If — and only if — the user explicitly asked to save the contacts, also set `save_leads: true` so the chain saves each contact. If the user picked exactly one company, do not pass `pending_companies`.",
        },
        {
          tool: TOOL_NAMES.emailVerifier,
          reason:
            "Only when saving: verify each email before it is saved. The Domain-Search handoff carries suggestedArgs.email. Skipped entirely in the default return-results-only flow.",
        },
        {
          tool: TOOL_NAMES.createLeadIfMissing,
          reason:
            "Only when saving: create the lead if no lead with that email exists; otherwise return the existing lead unchanged. Idempotent and never overwrites existing records. Not used in the default return-results-only flow.",
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
        "Decide the goal from the brief BEFORE starting, and keep it for the whole run. Default to returning the found contacts as a table for review (gathering only). Switch to saving leads ONLY when the user explicitly asked to save, add to leads, or create/append to a list. A request that merely says 'leads' (e.g. 'find 20 leads') is a request to FIND contacts, not to save them — keep gathering-only unless the user clearly asked to save. If unsure, gather and offer to save afterwards.",
        "When the goal is saving AND the user asked to put the contacts into a list (a new list, or a named/existing one such as 'add to my Q3 list', 'create a list of leads', 'save these to <name>'), set up the list BEFORE the save chain runs: for a new or named-but-missing list call Create-Leads-List once and keep the returned list id; for an existing list, find its id with List-Leads-Lists. Then pass that id as `leads_list_id` on every Create-Lead-If-Missing call so newly saved contacts land in the intended list instead of unlisted. Carry the same `leads_list_id` through the loop's chained suggestedArgs just like the other save fields. Create-Lead-If-Missing only assigns the list to leads it CREATES: a contact that already exists is returned unchanged and is NOT moved into the list (even if it currently sits in a different list or none) — so report those as already-existing and left where they were, and do NOT claim an already-existing contact was added to the list when it wasn't. If the user asked to save but did NOT mention any list, saving the contacts unlisted is fine — do not invent a list.",
        "After the user picks companies from the discover step: if they picked 2 or more, call Domain-Search once with the first domain and `pending_companies` set to the remaining picks; the response chain then advances per company without between-company confirmation gates. If the goal is saving, also set `save_leads: true` on that first call. If they picked exactly one company, do not pass `pending_companies`. The `pending_companies` array accepts at most 50 entries and a call carrying more than 50 is rejected before it runs (so the server cannot ask for you); when the user picked more than 50 companies, do NOT pass all of them — run the first 50 as one batch and then offer to continue with the rest, or ask the user to narrow the selection first. Within the 50-cap, run the loop in one chain rather than calling Domain-Search company-by-company yourself.",
        "Before issuing the first Domain-Search call with `pending_companies`, summarise the expected credit cost and wait for approval: each picked company costs roughly 1 credit for the contact search, and (only when saving) up to 1 more per company to check deliverability before the save. This is the single confirmation point for the whole loop. After the user approves, set `confirmed_credit_use: true` for a gathering-only run, or `confirmed_save_use: true` when saving, on the Domain-Search call; the server returns an ask_user without the matching flag, and subsequent chained calls carry it forward automatically. A gathering-only approval does NOT cover saving — if you switch to saving you must summarise the higher save cost and get approval again. Do not pause between companies after approval.",
        "Carry `save_leads` (when saving), `confirmed_credit_use`, and `confirmed_save_use` forward exactly as they arrive in each chained call's suggestedArgs. Do not start saving partway through a gathering-only run, and do not re-ask 'should I do all of them or a subset?' between companies. If the brief lacks an explicit count and discover returned more candidates than the user clearly intends, clarify once upfront before starting Domain-Search.",
        "If Domain-Search returns no contacts for a company, report that and continue the loop with the next company. To find a person's email, use Domain-Search (a company's contacts) or Email-Finder (one named person). The enrichment tools (Person-Enrichment, Company-Enrichment, Combined-Enrichment) return profile/company data for contacts you already have — they never return new email addresses, and there is no separate 'enrich' lookup for emails. If a contact tool returns no email, report that and continue; never call a tool that is not listed (do not invent an endpoint to recover).",
        "When the brief names a role, search with the closest department + seniority enums (e.g. 'Head of Sales' → department=sales, seniority=executive), then post-filter the returned rows by job title to keep related titles like VP Sales, Sales Director, or Revenue Lead — don't drop a row just because its exact title isn't an enum value.",
        "If a response is an ask_user (recovery prompt or any other ask_user), relay it verbatim and wait for the answer; do not bypass an ask_user with a manual loop. Status updates while looping are fine (e.g., 'processed 5 of 20'); do not require user input to continue between companies.",
        "When the run is gathering-only, finish by rendering the collected contacts as a table (one row per email: name, position, email, verification status) and offer to save them to Hunter leads as the next step.",
        "When the brief explicitly asks for VERIFIED contacts (e.g. 'verified emails', 'only deliverable contacts') AND the run is gathering-only: before rendering the table, check deliverability for the rows that are not already confirmed deliverable. A row whose status is already valid with high confidence is trusted as-is — do not re-check it (re-checking just spends credits again). For each remaining row (no status, or low confidence), call Email-Verifier on that email and put the returned status in the table's verification column; accept_all and invalid rows stay in the table flagged as such. If the Domain-Search response marked the whole domain as catch-all (`accept_all: true`), treat every row from it that lacks its own valid, high-confidence status as accept_all — flag it that way and do NOT call Email-Verifier on it (a re-check on a catch-all domain just returns accept_all and burns a credit). This does NOT save anything — gathering-only never creates leads. Summarise how many rows need a deliverability check and confirm once before that spend.",
        "If the user accepts that offer to save a table you already gathered, decide each row by its verification status shown in the table, and save with Create-Lead-If-Missing — one call per saved contact, reusing the email, name, position, and company already in the table. If the user wants those contacts in a list, create or select it first (Create-Leads-List for a new/named list, or List-Leads-Lists to find an existing one) and pass its id as `leads_list_id` on each Create-Lead-If-Missing call; otherwise save them unlisted. Do NOT re-run Domain-Search for companies you already searched. Save a row directly only when its status is valid with high confidence — it is already confirmed deliverable, so re-verifying it just spends credits again. For a row that is not yet valid (no status or low confidence), verify it with Email-Verifier first and save it only if that check returns valid. Do NOT save a row whose status is accept_all or invalid — those addresses are not confirmed deliverable; leave them out of the save and list them back to the user as not saved. A row gathered from a catch-all domain (its Domain-Search response had `accept_all: true`) counts as accept_all unless it carries its own valid, high-confidence status — do not verify it (the check just returns accept_all) and do not save it. Summarise the deliverability checks needed for the not-yet-verified rows and confirm once before that spend; the already-valid rows and the lead creation itself cost no extra confirmation. Create-Lead-If-Missing never overwrites an existing lead. Afterwards, give the deep-link to view the leads in Hunter.",
      ]

      const summary = desc`Prospecting plan ready. Default: ${TOOL_NAMES.discover} → ${TOOL_NAMES.domainSearch} per picked company → render the contacts as a table (nothing is saved). When the user explicitly asked to save, the chain instead runs ${TOOL_NAMES.domainSearch} → ${TOOL_NAMES.emailVerifier} → ${TOOL_NAMES.createLeadIfMissing} per company. Read ${CAPABILITIES_RECOVERY_URI} first to translate ambiguous job titles in the brief.`

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
