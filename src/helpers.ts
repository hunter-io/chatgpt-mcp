import { z } from "zod"

export const BASE_API_URL_PRODUCTION = "https://api.hunter.io/v2"
export const BASE_API_URL_DEVELOPMENT = "http://localhost:3000/v2"
export const HUNTER_BASE = "https://hunter.io"

// TOOL_NAMES_START
// Single source of truth for every tool name exposed by Hunter MCPs.
// All names use PascalCase-Hyphenated for consistency. The only semantic
// rename is `Email-Enrichment` → `Person-Enrichment` (the operation enriches
// a person/profile, not an email — the email is just the input). Aligns with
// claude-plugin/skills/person-enrichment/.
//
// This block must be BYTE-IDENTICAL between chatgpt-mcp/src/helpers.ts and
// remote-mcp/src/helpers.ts — enforced by scripts/check-tool-names-aligned.mjs.
//
// See docs/plans/2026-04-28-feat-chatgpt-app-review-readiness-plan.md (Pillar 0).
export const TOOL_NAMES = {
  // search
  discover: "Discover",
  domainSearch: "Domain-Search",
  emailFinder: "Email-Finder",
  emailVerifier: "Email-Verifier",
  emailCount: "Email-Count",
  // enrichment
  personEnrichment: "Person-Enrichment",
  companyEnrichment: "Company-Enrichment",
  combinedEnrichment: "Combined-Enrichment",
  // account
  account: "Account",
  // leads
  listLeads: "List-Leads",
  getLead: "Get-Lead",
  createLead: "Create-Lead",
  updateLead: "Update-Lead",
  deleteLead: "Delete-Lead",
  upsertLead: "Upsert-Lead",
  leadExists: "Lead-Exists",
  saveCompany: "Save-Company",
  // leads lists
  listLeadsLists: "List-Leads-Lists",
  getLeadsList: "Get-Leads-List",
  createLeadsList: "Create-Leads-List",
  updateLeadsList: "Update-Leads-List",
  deleteLeadsList: "Delete-Leads-List",
  mergeLeadsLists: "Merge-Leads-Lists",
  // custom attributes
  listCustomAttributes: "List-Custom-Attributes",
  getCustomAttribute: "Get-Custom-Attribute",
  createCustomAttribute: "Create-Custom-Attribute",
  updateCustomAttribute: "Update-Custom-Attribute",
  deleteCustomAttribute: "Delete-Custom-Attribute",
  // campaigns
  listCampaigns: "List-Campaigns",
  listCampaignRecipients: "List-Campaign-Recipients",
  addCampaignRecipients: "Add-Campaign-Recipients",
  removeCampaignRecipients: "Remove-Campaign-Recipients",
  startCampaign: "Start-Campaign",
  // coordinator
  prospecting: "Prospecting",
} as const satisfies Record<string, string>

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES]

/**
 * Tagged template that accepts only string | ToolName interpolations.
 * Use in tool descriptions to keep cross-tool references valid:
 *
 *   description: desc`Use ${TOOL_NAMES.emailVerifier} to check deliverability.`
 *
 * Renaming a tool then becomes a single-file change to TOOL_NAMES.
 */
export function desc(strings: TemplateStringsArray, ...values: (string | ToolName)[]): string {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "")
}
// TOOL_NAMES_END

/**
 * Structured MCP tool result. Content carries user-visible (and optionally
 * assistant-only) text blocks; structuredContent carries machine-readable
 * data the model can reason over without parsing JSON out of prose.
 *
 * The `[key: string]: unknown` index signature is required by the MCP SDK's
 * CallToolResult type for forward compatibility. We keep it but also declare
 * the canonical fields explicitly — typos on those still fail type-check;
 * only fields we don't explicitly model fall through the index hatch.
 */
export interface McpTextResult {
  [key: string]: unknown
  content: { type: "text"; text: string; annotations?: { audience?: ("user" | "assistant")[] } }[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
  _meta?: Record<string, unknown>
}

export function withDeepLink(result: McpTextResult, path: string): McpTextResult {
  if (result.isError) return result
  const url = `${HUNTER_BASE}${path}`
  const text = result.content[0]?.text ?? ""
  return {
    content: [{ type: "text" as const, text: `${text}\n\nView in Hunter: ${url}` }],
  }
}

export function withDeepLinkFromId(result: McpTextResult, pathFn: (id: number) => string): McpTextResult {
  try {
    const raw = result.content[0]?.text ?? ""
    const jsonText = raw.split("\n\nSource:")[0]
    const id = JSON.parse(jsonText).data?.id
    if (typeof id === "number" && id > 0) return withDeepLink(result, pathFn(id))
  } catch (e) {
    console.warn("withDeepLinkFromId: failed to extract ID", e)
  }
  return result
}

/**
 * Parses the full top-level response from a callHunterApi result. Mirrors
 * the extraction pattern used by `withDeepLinkFromId` — content[0].text is
 * JSON with a `\n\nSource: ...` suffix appended.
 *
 * Use this when you need fields outside `.data` (e.g., `.meta.count`,
 * `.data.message`). For `.data`-only access prefer `parseHunterApiData<T>`.
 *
 * Returns null on parse failure or when the result is an error. The generic
 * T is unchecked at runtime — callers are responsible for defensive narrowing.
 */
export function parseHunterApiResponse<T>(result: McpTextResult): T | null {
  if (result.isError) return null
  try {
    const raw = result.content[0]?.text ?? ""
    const jsonText = raw.split("\n\nSource:")[0]
    return JSON.parse(jsonText) as T
  } catch {
    return null
  }
}

/**
 * Parses the `.data` payload out of a callHunterApi result. Convenience
 * wrapper around `parseHunterApiResponse`.
 */
export function parseHunterApiData<T>(result: McpTextResult): T | null {
  const response = parseHunterApiResponse<{ data?: T }>(result)
  return response?.data ?? null
}

interface FormParamsMap {
  [key: string]: string | string[] | FormParamsMap
}
type FormParams = FormParamsMap

type QueryParams = Record<string, string>

interface GetOptions {
  path: string
  apiKey: string
  baseUrl: string
  params?: QueryParams
  signal?: AbortSignal
}

interface MutateOptions {
  path: string
  apiKey: string
  baseUrl: string
  method: "POST" | "PUT" | "DELETE"
  params?: FormParams
  signal?: AbortSignal
}

type CallOptions = GetOptions | MutateOptions

function buildRailsFormBody(params: FormParams, prefix = ""): URLSearchParams {
  const result = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    const paramKey = prefix ? `${prefix}[${key}]` : key

    if (typeof value === "string") {
      result.append(paramKey, value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        result.append(`${paramKey}[]`, item)
      }
    } else {
      const nested = buildRailsFormBody(value, paramKey)
      for (const [k, v] of nested.entries()) {
        result.append(k, v)
      }
    }
  }

  return result
}

export async function callHunterApi(options: CallOptions): Promise<McpTextResult> {
  const isGet = !("method" in options)
  const method = isGet ? "GET" : options.method

  let url: string
  let body: string | undefined

  if (isGet) {
    const search = options.params ? new URLSearchParams(options.params).toString() : ""
    url = search ? `${options.baseUrl}${options.path}?${search}` : `${options.baseUrl}${options.path}`
  } else {
    if (options.params && Object.keys(options.params).length > 0) {
      const formBody = buildRailsFormBody(options.params)
      url = `${options.baseUrl}${options.path}`
      body = formBody.toString()
    } else {
      url = `${options.baseUrl}${options.path}`
    }
  }

  const headers: Record<string, string> = {
    "X-SOURCE": "hunter-chatgpt",
    Authorization: `Bearer ${options.apiKey}`,
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded"
  }

  const response = await fetch(url, { method, headers, body, signal: options.signal })

  if (!response.ok) {
    let errorText: string
    try {
      const errorJson = await response.json()
      errorText = JSON.stringify(errorJson)
    } catch {
      errorText = `HTTP ${response.status}`
    }
    return {
      content: [{ type: "text" as const, text: errorText }],
      isError: true,
    }
  }

  // Detect 2xx responses with no body. Cloudflare Workers commonly omits
  // `content-length` for chunked-transfer responses, so header sniffing is
  // unreliable; reading the body once and branching on its length is both
  // simpler and defensive against missing/lying headers. Hunter's Rails API
  // returns 202 Accepted with an empty body (e.g. `Delete-Leads-List` on
  // lists with >10 leads triggers an async `scheduled_destroy`); 204 is the
  // canonical no-content case. Wrapping in try/catch protects against
  // mid-request cancellation (Worker abort, client disconnect) — without it,
  // `response.text()` rejects and throws out of the tool handler uncaught.
  let text: string
  try {
    text = await response.text()
  } catch (e) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to read response body from Hunter: ${e instanceof Error ? e.message : String(e)}`,
        },
      ],
      isError: true,
    }
  }
  if (text.length === 0) {
    const message =
      response.status === 202 ? "Accepted — operation scheduled for asynchronous completion." : "Success (no content)."
    return {
      content: [{ type: "text" as const, text: `${message}\n\nSource: Hunter.io (https://hunter.io)` }],
    }
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    // 2xx with non-JSON body. A misconfigured proxy / edge could serve HTML
    // or plain text with a 200 status; surface as an error so downstream
    // tools don't silently treat malformed responses as success.
    return {
      content: [
        {
          type: "text" as const,
          text: `Unexpected non-JSON response from Hunter (status ${response.status}): ${text.slice(0, 200)}`,
        },
      ],
      isError: true,
    }
  }
  return {
    content: [{ type: "text" as const, text: `${JSON.stringify(json)}\n\nSource: Hunter.io (https://hunter.io)` }],
  }
}

// NEXT_ACTION_START
// ─── NextAction chaining (Pillar 1) ────────────────────────────────────────
//
// Mirrors openai/openai-apps-sdk-examples/cards_against_ai_server_node — the
// documented-by-example pattern for forcing the model to chain tool calls
// reliably. Multi-step tools return a NextAction in BOTH
// structuredContent.nextAction AND a model-only content text block:
//   - structuredContent is machine-readable
//   - the assistant-only block is JSON the model sees but the user does not
//     (audience: ["assistant"])
// Description prose reinforces with "CRITICAL: if nextAction.kind === 'call_tool',
// call the indicated tool immediately."
//
// This region (between NEXT_ACTION_START / NEXT_ACTION_END markers) must be
// BYTE-IDENTICAL between chatgpt-mcp/src/helpers.ts and remote-mcp/src/helpers.ts
// — enforced by scripts/check-tool-names-aligned.mjs.
//
// See docs/plans/2026-04-29-feat-chatgpt-mcp-confirmation-gates-plan.md (Phase 1).

/**
 * Tools whose chained `nextAction` may carry a `pendingToolCall` for hard
 * confirmation. Currently only `Start-Campaign` (sends real emails — Phase 4).
 * Narrowing the type prevents future emissions from steering the model into
 * arbitrary tools under cover of an `ask_user` question.
 */
export type ConfirmableToolName = typeof TOOL_NAMES.startCampaign

/**
 * The chaining hint a tool emits to tell the model what to do next.
 *
 * - `call_tool`: chain into another tool. `tool` is the registered ToolName
 *   (compile-time check). `reason` is constants only — never untrusted API
 *   data (prompt-injection guard). `requiresConfirmation: true` is a
 *   model-prompting signal (advisory; not a documented OpenAI Apps SDK field).
 * - `ask_user`: stop and wait for user input. Used for destructive ops and
 *   ambiguous next steps where the model shouldn't auto-pick. When
 *   `pendingToolCall` is present, the model should relay `question` to the
 *   user, then on confirmation re-issue `pendingToolCall.tool` with
 *   `pendingToolCall.args`. The receiving tool inspects `args.confirmed`
 *   to distinguish a confirmed re-issue from a fresh direct call.
 * - `complete`: terminal step, summarise and stop.
 */
export type NextAction =
  | {
      kind: "call_tool"
      tool: ToolName
      reason: string
      suggestedArgs?: Readonly<Record<string, unknown>>
      requiresConfirmation?: boolean
    }
  | {
      kind: "ask_user"
      question: string
      pendingToolCall?: { tool: ConfirmableToolName; args: Readonly<Record<string, unknown>> }
    }
  | { kind: "complete"; summary: string }

const REASON_MAX_LENGTH = 200
const QUESTION_MAX_LENGTH = 300
// Sized to fit a fully-loaded multi-company chain: 50-domain pending_companies
// (~25 chars/domain × 50 = 1250 + JSON quoting/comma overhead ~200) plus the
// rest of a call_tool nextAction (kind/tool/reason/domain/filterCarry/etc, ~250
// bytes). 2KB leaves comfortable headroom for IDN-encoded domains while still
// bounding token cost (≈500 tokens per call, amortised across the loop).
const SUGGESTED_ARGS_MAX_BYTES = 2048

/**
 * Truncates `reason`/`question` to keep chained-flow token cost bounded.
 * The discriminated union enforces shape at compile time — no runtime throws.
 */
export function buildNextAction(input: NextAction): NextAction {
  if (input.kind === "call_tool") {
    return {
      kind: "call_tool",
      tool: input.tool,
      reason: truncate(input.reason, REASON_MAX_LENGTH, "reason"),
      ...(input.suggestedArgs !== undefined && { suggestedArgs: input.suggestedArgs }),
      ...(input.requiresConfirmation && { requiresConfirmation: true }),
    }
  }
  if (input.kind === "ask_user") {
    return {
      kind: "ask_user",
      question: truncate(input.question, QUESTION_MAX_LENGTH, "question"),
      ...(input.pendingToolCall !== undefined && { pendingToolCall: input.pendingToolCall }),
    }
  }
  return input
}

function truncate(value: string, max: number, label: string): string {
  if (value.length <= max) return value
  console.warn(`buildNextAction: ${label} truncated from ${value.length} to ${max} chars`)
  return value.slice(0, max - 3) + "..."
}

/**
 * Embeds a NextAction in a tool response across two carriers:
 *   - structuredContent.nextAction       (machine-readable)
 *   - content block with audience:["assistant"] (model-only)
 *
 * Single helper means the two locations can never drift apart.
 *
 * If the serialised payload exceeds the byte cap (e.g., bloated suggestedArgs
 * or a long pending_companies array of IDN domains), embeds a generic
 * ask_user fallback so the model gets a visible "I can't auto-continue"
 * signal instead of guessing why the loop terminated.
 *
 * `evenOnError: true` allows callers to embed a recovery nextAction (e.g., a
 * skip/retry/stop ask_user) on a `result.isError` path. Default is false —
 * error results normally don't get chained next-actions because the caller
 * has bigger problems than continuing the chain.
 */
export function embedNextAction(
  result: McpTextResult,
  nextAction: NextAction,
  opts?: { evenOnError?: boolean },
): McpTextResult {
  if (result.isError && !opts?.evenOnError) return result
  const append = (action: NextAction): McpTextResult => ({
    ...result,
    content: [
      ...result.content,
      {
        type: "text" as const,
        text: JSON.stringify(action),
        annotations: { audience: ["assistant"] },
      },
    ],
    structuredContent: { ...result.structuredContent, nextAction: action },
  })
  const byteSize = new TextEncoder().encode(JSON.stringify(nextAction)).byteLength
  if (byteSize > SUGGESTED_ARGS_MAX_BYTES) {
    console.warn(
      `embedNextAction: payload ${byteSize} bytes exceeds ${SUGGESTED_ARGS_MAX_BYTES} cap — emitting fallback ask_user`,
    )
    return append(buildOverCapFallback(nextAction))
  }
  return append(nextAction)
}

/**
 * Builds a recovery `ask_user` when `embedNextAction`'s byte cap is hit. If the
 * truncated action carried `pending_companies` (the multi-company loop carry),
 * the fallback names the cause and remaining count so the agent has actionable
 * continuation data instead of a generic "too large" message.
 */
function buildOverCapFallback(nextAction: NextAction): NextAction {
  if (nextAction.kind === "call_tool") {
    const args = nextAction.suggestedArgs as { domain?: unknown; pending_companies?: unknown } | undefined
    if (Array.isArray(args?.pending_companies)) {
      // When suggestedArgs carries `domain`, the next call is a Domain-Search
      // for that domain — `pending_companies` is the slice AFTER it, so the
      // total remaining count is `length + 1`. When `domain` is absent (chain
      // to Email-Verifier or Upsert-Lead with `email` instead), the array
      // already holds every remaining domain, so no +1.
      const hasNextDomain = typeof args.domain === "string"
      const remaining = args.pending_companies.length + (hasNextDomain ? 1 : 0)
      return buildNextAction({
        kind: "ask_user",
        question: `The pending companies list is too large to chain automatically (${remaining} domains remain). Tell me which to process next, or say 'stop' to end the loop.`,
      })
    }
  }
  return buildNextAction({
    kind: "ask_user",
    question: "The next chained step is too large to embed automatically. Please tell me how to proceed.",
  })
}

// ───────────────────────────────────────────────────────────────────────────

export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const

/**
 * Paid tools — flag `destructiveHint: true` so ChatGPT host UI surfaces a
 * confirmation prompt before invocation.
 *
 * IMPORTANT: `readOnlyHint` is `false` even though paid tools only read from
 * the Hunter API. Per the MCP spec, `destructiveHint` is "meaningful only
 * when readOnlyHint is false" — clients honoring the spec ignore
 * `destructiveHint` whenever `readOnlyHint: true` and may auto-approve the
 * tool as safe. To actually trigger the host UI prompt, the tool must
 * advertise that it modifies environment state.
 *
 * Defensible semantically: paid tools deduct credits from the user's
 * account, which is a billing-state modification. The user's credit balance
 * is environment state, even if no Hunter resource is mutated.
 *
 * The semantic stretch on "destructive" ("usually means delete-or-overwrite")
 * is intentional: per OpenAI Apps SDK submission guidelines, destructive-
 * style friction is the documented primitive for credit-consuming actions.
 * Empirical verification required (plan Phase 1.5) — Feb 2026 community
 * reports document intermittent ChatGPT ignoring of MCP annotations.
 */
export const PAID_TOOL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: true,
} as const

export const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
} as const

export const DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: false,
} as const

/**
 * Writes that have effects beyond the user's Hunter workspace — e.g.
 * `Start-Campaign` triggers real outbound emails to external recipients.
 * `openWorldHint: true` keeps the open-world safety treatment for those
 * external side effects, while bounded-write tools use WRITE_ANNOTATIONS.
 */
export const EXTERNAL_SIDE_EFFECT_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const
// NEXT_ACTION_END

/**
 * RFC 1035-shaped hostname regex used to validate the primary `domain` input
 * on Domain-Search / Email-Finder / Email-Count and every element of
 * `pending_companies`. Rejects non-domain payloads (control chars, newlines,
 * free-form prose, "ignore prior instructions" strings) so they can't ride
 * into chained `suggestedArgs` and reflect into the model-only content block.
 * Matches punycode (`xn--*`) for IDN; UTF-8 IDNs must be encoded by the caller.
 */
export const DOMAIN_REGEX = /^([a-z0-9-]+\.)+[a-z]{2,}$/i

/**
 * Domain-shaped string with a 253-char cap (RFC 1035). Use for any tool input
 * whose value is later interpolated into chained next-action questions or
 * suggestedArgs — without this, an attacker controlling the input could
 * inject control chars / newlines into the assistant-only content block.
 */
export const domainStringSchema = z.string().regex(DOMAIN_REGEX, "must be a valid domain").max(253)

/**
 * Shared schema for the multi-company loop carry, used by Domain-Search,
 * Email-Verifier, and Upsert-Lead. Three defenses baked in:
 *
 *   - `.max(50)` bounds the credit-spend blast radius. Without a cap, a
 *     prompt-injection that coerces the model into seeding a 200-entry array
 *     would silently spend that many verification credits inside the chain
 *     (the loop drops `requiresConfirmation: true` on Email-Verifier because
 *     populating the array IS the user's authorization). 50 is a generous
 *     ceiling for legitimate prospecting picks — typical briefs are 5-20,
 *     longer ones (30-50) come up for B2B list-building. Beyond 50 the
 *     synchronous chain runtime (~5-10s/iter × 50 ≈ 4-8 min) becomes
 *     user-hostile anyway, so the cap aligns with UX boundaries.
 *
 *   - Each element validated by `DOMAIN_REGEX` so non-domain payloads can't
 *     flow through chained suggestedArgs.
 *
 *   - `.transform()` lowercases each entry and dedupes via Set. Hunter's API
 *     treats domains case-insensitively, so `["Stripe.com", "stripe.com"]`
 *     would otherwise burn two verification credits on the same lead. The
 *     transform fires on every entry point (DS, EV, US) so the dedup
 *     guarantee survives even when a model invokes EV/US directly without
 *     going through DS's handler.
 */
export const PENDING_COMPANIES_MAX = 50
export const pendingCompaniesSchema = z
  .array(domainStringSchema)
  .max(PENDING_COMPANIES_MAX, `Multi-company loop is capped at ${PENDING_COMPANIES_MAX} picks per chain.`)
  .transform((arr) => Array.from(new Set(arr.map((d) => d.toLowerCase()))))
  .optional()
  .describe(
    desc`Multi-company loop carry (capped at 50 domains). When the user has picked 2+ companies, set this on the first ${TOOL_NAMES.domainSearch} call to the array of REMAINING picks (everything except the first picked domain that goes in the 'domain' arg). The response chain threads through ${TOOL_NAMES.domainSearch} → ${TOOL_NAMES.emailVerifier} → ${TOOL_NAMES.upsertLead} per company and auto-continues to the next pending domain without between-company confirmation gates. Downstream tools receive this via suggestedArgs and shrink it as the chain advances; pass it through verbatim from the prior tool's chained nextAction. Leave UNDEFINED for single-call usage and for prospecting flows where the user picked exactly ONE company (single-company mode preserves the confirmation gate on Email-Verifier).`,
  )

/**
 * Builds an `ask_user` recovery next-action for an in-loop tool failure (Hunter
 * API error mid-chain). Used by Domain-Search, Email-Verifier, and Upsert-Lead
 * handlers — each emits the same skip/retry/stop prompt, just with a different
 * failure context. The next pending domain is named explicitly so the agent's
 * "skip" option is concrete (per agent-native review).
 *
 * Caller MUST verify `pending_companies?.length > 0` before invoking — the
 * helper assumes there's a next domain to advance to.
 */
export function loopRecoveryAction(
  result: McpTextResult,
  pending_companies: readonly string[],
  failureContext: string,
): McpTextResult {
  const remaining = pending_companies.length
  const noun = remaining === 1 ? "company" : "companies"
  const nextDomain = pending_companies[0]
  return embedNextAction(
    result,
    buildNextAction({
      kind: "ask_user",
      question: `${failureContext}. ${remaining} ${noun} remain in the loop (next: ${nextDomain}). Skip and continue, retry, or stop?`,
    }),
    { evenOnError: true },
  )
}

/**
 * Domain-Search filter args that should travel along the multi-company loop
 * chain so the next Domain-Search call applies the same filters as the first
 * (e.g. `seniority`, `department`). Without this carry, "find marketing
 * executives at companies X, Y, Z" would filter at X but run an unfiltered
 * search at Y and Z. Email-Verifier and Upsert-Lead accept these as carry-only
 * fields (ignored for their own API calls; only forwarded in chained
 * suggestedArgs). `offset` is intentionally NOT carried — each company starts
 * a fresh page-1 search.
 */
export interface LoopFilters {
  limit?: number
  type?: "personal" | "generic"
  seniority?: string
  department?: string
  required_field?: "full_name" | "position" | "phone_number"
}

/**
 * Picks the loop-filter fields out of an args object and returns them as a
 * plain record suitable for spreading into chained `suggestedArgs`. Undefined
 * fields are dropped so the chained payload stays minimal.
 */
export function carryLoopFilters(args: LoopFilters): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  if (args.limit !== undefined) out.limit = args.limit
  if (args.type) out.type = args.type
  if (args.seniority) out.seniority = args.seniority
  if (args.department) out.department = args.department
  if (args.required_field) out.required_field = args.required_field
  return out
}
