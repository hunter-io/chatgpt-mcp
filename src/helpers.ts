import { z } from "zod"

import type { HunterError } from "./schemas/common"

// Credential / Bearer scrub for upstream bodies. Three narrowly-scoped patterns
// to avoid the over-matching trap (e.g. the earlier `(?:bearer|authorization)…`
// catch-all collapsed "authorization required" into "Bearer [REDACTED] required"
// because the trailing alnum class consumed plain English). Defined here (not
// in `schemas/common.ts`) to avoid a runtime circular import — `schemas/common`
// imports `TOOL_NAMES` from this module; a reverse value-import would evaluate
// the schema with TOOL_NAMES still undefined. See HUN-19943 todos/019.
//
// BEARER_RE — `Bearer <token>` with ≥16-char token. The minimum-length anchor
// excludes literal-English false matches like "Bearer of bad news"; real Hunter
// API keys are 40 chars and JWTs are 100+, so legitimate tokens pass through.
const BEARER_RE = /\bBearer\s+[A-Za-z0-9\-._~+/]{16,}=*/gi
// AUTH_HEADER_RE — full HTTP-style `Authorization: …` header echo. Requires
// the colon, so "authorization required" never matches. Excludes `"` from the
// value class so the regex is safe to run on JSON envelope text — without
// that exclusion, an `Authorization: Bearer xyz` substring embedded inside a
// JSON string value would consume past the closing `"` through the rest of
// the line, destroying brackets, commas, and other fields in the envelope.
// The other three credential regexes already stop at `"` characters or
// whitespace and don't need this guard.
const AUTH_HEADER_RE = /\bAuthorization\s*:\s*[^\r\n"]+/gi
// TOKEN_KV_RE — URL-encoded form `api_key=…`, `apikey=…`, `token=…`, or
// `authorization=…`. Stops at whitespace/&/quotes so other querystring keys
// remain visible after a single redaction.
const TOKEN_KV_RE = /\b(?:api[_-]?key|apikey|token|authorization)\s*=\s*[^\s&"']+/gi
// JWT_RE — three base64url segments separated by dots. Same shape regardless
// of issuer; safe to redact whenever it appears.
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g

/**
 * Scrubs credential-shaped tokens from an upstream message string. Pass
 * `Number.POSITIVE_INFINITY` for `max` when caller is the success-path JSON
 * envelope (no truncation appropriate); the default 200-char cap suits
 * one-line error messages.
 */
export function sanitizeUpstreamMessage(value: string, max = 200): string {
  return value
    .replace(BEARER_RE, "Bearer [REDACTED]")
    .replace(AUTH_HEADER_RE, "Authorization: [REDACTED]")
    .replace(TOKEN_KV_RE, "[REDACTED_CREDENTIAL]")
    .replace(JWT_RE, "[REDACTED_JWT]")
    .slice(0, max)
}

export const BASE_API_URL_PRODUCTION = "https://api.hunter.io/v2"
export const BASE_API_URL_DEVELOPMENT = "http://localhost:3000/v2"
export const HUNTER_BASE = "https://hunter.io"

// Trailing suffix appended to the user-visible content text on every successful
// Hunter API response so the model can attribute the data. Centralized here
// (todo #108) because both `callHunterApi` and `stripResponseFields` reproduce
// the JSON-envelope-plus-source format; a divergence between them would
// silently desync the success-path text from the structuredContent.
export const HUNTER_SOURCE_SUFFIX = "\n\nSource: Hunter.io (https://hunter.io)"

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
  discover: "Find-Companies",
  domainSearch: "Domain-Search",
  emailFinder: "Email-Finder",
  emailVerifier: "Email-Verifier",
  emailCount: "Email-Count",
  // enrichment
  personEnrichment: "Person-Enrichment",
  companyEnrichment: "Company-Enrichment",
  combinedEnrichment: "Combined-Enrichment",
  // account
  account: "Get-Account-Details",
  // email accounts
  listEmailAccounts: "List-Email-Accounts",
  // sequences
  listSequenceFollowUps: "List-Sequence-Follow-Ups",
  pauseSequence: "Pause-Sequence",
  resumeSequence: "Resume-Sequence",
  archiveSequence: "Archive-Sequence",
  getSequenceStats: "Get-Sequence-Stats",
  // leads
  listLeads: "List-Leads",
  getLead: "Get-Lead",
  createLead: "Create-Lead",
  updateLead: "Update-Lead",
  deleteLead: "Delete-Lead",
  upsertLead: "Create-Or-Update-Lead",
  createLeadIfMissing: "Create-Lead-If-Missing",
  leadExists: "Lead-Exists",
  saveCompany: "Save-Company",
  // leads lists
  listLeadsLists: "List-Leads-Lists",
  getLeadsList: "Get-Leads-List",
  createLeadsList: "Create-Leads-List",
  updateLeadsList: "Update-Leads-List",
  deleteLeadsList: "Delete-Leads-List",
  mergeLeadsLists: "Merge-Leads-Lists",
  // company lists
  listCompanyLists: "List-Company-Lists",
  getCompanyList: "Get-Company-List",
  createCompanyList: "Create-Company-List",
  updateCompanyList: "Update-Company-List",
  deleteCompanyList: "Delete-Company-List",
  favoriteCompanyList: "Favorite-Company-List",
  unfavoriteCompanyList: "Unfavorite-Company-List",
  addCompanyToList: "Add-Company-To-List",
  removeCompanyFromList: "Remove-Company-From-List",
  // company list folders
  listCompanyListFolders: "List-Company-List-Folders",
  createCompanyListFolder: "Create-Company-List-Folder",
  updateCompanyListFolder: "Update-Company-List-Folder",
  deleteCompanyListFolder: "Delete-Company-List-Folder",
  // connected apps
  listConnectedApps: "List-Connected-Apps",
  getConnectedApp: "Get-Connected-App",
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
  prospecting: "Plan-Prospecting-Flow",
  // feedback
  reportFeedback: "Report-API-Feedback",
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
 *
 * Note: HUN-19943 todos/015 evaluated a discriminated `McpSuccessResult |
 * McpErrorResult` union for compile-time narrowing on `isError`. It rippled
 * through byte-aligned `embedNextAction` and SDK index-signature constraints
 * in ways that produced more cost than benefit (handlers already narrow at
 * runtime via `if (result.isError) return result`, and `callHunterApi`
 * guarantees the typed `structuredContent.error` envelope on every error
 * path). Deferred until the byte-aligned region is decoupled or the SDK's
 * CallToolResult type loosens.
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
    ...result,
    // `audience: ["user"]` so hosts route human-readable narration distinctly
    // from the JSON envelope in structuredContent (HUN-19943 todos/013).
    content: [
      { type: "text" as const, text: `${text}\n\nView in Hunter: ${url}`, annotations: { audience: ["user"] } },
    ],
    structuredContent: { ...result.structuredContent, viewInHunter: url },
  }
}

export function withDeepLinkFromId(result: McpTextResult, pathFn: (id: number) => string): McpTextResult {
  // Prefer the structuredContent.data.id path — it's typed and trustworthy.
  // Fall back to the legacy text-content JSON parse for tools that haven't
  // migrated yet (HUN-19943 Phase 3 batches still in progress).
  //
  // `Number.isSafeInteger` rejects NaN / Infinity / non-integer / values past
  // 2^53 — all of which would otherwise generate malformed deep-link URLs
  // (e.g. https://hunter.io/leads/Infinity). See todos/014.
  const data = (result.structuredContent as { data?: { id?: unknown } } | undefined)?.data
  if (data && Number.isSafeInteger(data.id) && (data.id as number) > 0) {
    return withDeepLink(result, pathFn(data.id as number))
  }
  try {
    const raw = result.content[0]?.text ?? ""
    const jsonText = raw.split("\n\nSource:")[0]
    const id = JSON.parse(jsonText).data?.id
    if (Number.isSafeInteger(id) && id > 0) return withDeepLink(result, pathFn(id))
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

/**
 * Maps Hunter API HTTP status + body to a typed `errorSchema` envelope. Even
 * though the MCP SDK skips validation when `isError: true`, the agent needs
 * typed recovery information (retryable? retry_after? which field?) to plan
 * the next step without regex over prose. See HUN-19943 plan, agent-native
 * review.
 */
function mapHunterError(status: number, retryAfter: string | null, body: string): HunterError {
  // Defensive parse — Hunter's Rails API returns
  // { errors: [{ id, code, details }] } but proxies / 5xx pages may return
  // plain text.
  let parsedDetails: string | undefined
  let parsedField: string | undefined
  try {
    const parsed = JSON.parse(body) as { errors?: Array<{ details?: string; code?: string; id?: string }> }
    const first = parsed.errors?.[0]
    parsedDetails = first?.details
    // Hunter's `id` (e.g. "invalid_argument") sometimes encodes the offending
    // field; not authoritative, but a useful hint for the agent.
    if (first?.id && first.id !== "invalid_argument") parsedField = first.id
  } catch {
    // body wasn't JSON; that's fine
  }

  // Scrub Bearer/api_key patterns out of the upstream body before echoing it
  // into `errorSchema.message` and `content[0].text` (HUN-19943 todos/019).
  // `||` (not `??`) so empty-string `details` and empty `body` fall through to
  // the HTTP status fallback. With `??`, `parsedDetails === ""` would short-
  // circuit and produce a useless empty message; `body` is always defined so
  // the final fallback was unreachable.
  const rawMessage = parsedDetails || body || `HTTP ${status}`
  const message = sanitizeUpstreamMessage(rawMessage)

  if (status === 429) {
    const seconds = retryAfter ? Number.parseInt(retryAfter, 10) : Number.NaN
    return {
      code: "rate_limited",
      retryable: true,
      ...(Number.isFinite(seconds) && seconds >= 0 && { retry_after_seconds: seconds }),
      message,
    }
  }
  // QUOTA_SCRUB_START
  // HUN-20170: scrub the upstream upgrade/checkout CTA. Hunter's 402 response
  // body includes copy like "Please log in to Hunter to upgrade your plan or
  // purchase additional credits." OpenAI's app submission guidelines forbid
  // selling subscriptions, tokens, or credits inside ChatGPT (including
  // freemium upsells), so the user-facing message must be a neutral quota
  // notice — the upstream message is logged once (sanitized) for operator
  // triage and `parsedField` is surfaced on the envelope so the agent can
  // distinguish which quota bucket tripped (search vs verification vs
  // enrichment) without grepping prose.
  //
  // This block must be BYTE-IDENTICAL between chatgpt-mcp/src/helpers.ts and
  // remote-mcp/src/helpers.ts — enforced by scripts/check-tool-names-aligned.mjs.
  if (status === 402) {
    console.warn(
      `mapHunterError: scrubbed 402 quota response; upstream message: ${sanitizeUpstreamMessage(rawMessage)}`,
    )
    return {
      code: "quota_exceeded",
      retryable: false,
      ...(parsedField && { field: parsedField }),
      message: "Your monthly Hunter quota is exhausted. Quota resets at the start of your next billing cycle.",
    }
  }
  // QUOTA_SCRUB_END
  if (status === 401 || status === 403) {
    return { code: "unauthorized", retryable: false, message }
  }
  if (status === 404) {
    return { code: "not_found", retryable: false, message }
  }
  if (status === 422) {
    return {
      code: "invalid_input",
      retryable: false,
      ...(parsedField && { field: parsedField }),
      message,
    }
  }
  if (status >= 500) {
    return { code: "upstream_error", retryable: true, message }
  }
  return { code: "validation", retryable: false, message }
}

/**
 * Defense-in-depth: only the MCP server may set chain-control fields on
 * structuredContent. If Hunter's Rails API ever returns a record carrying
 * `nextAction`, `pendingToolCall`, or `viewInHunter` — at ANY depth — strip
 * it and log so an attacker controlling a scraped record can't steer the
 * chain through the `embedNextAction` / `withDeepLink` merges. See
 * HUN-19943 todos/016.
 *
 * Walks objects and arrays recursively. Returns a structurally-shared copy
 * with sanitized keys; non-objects pass through unchanged.
 */
// Source-of-truth Set (case-preserved for human readability). The runtime
// check at `stripInjectedFieldsInner` uses the lowercase-normalized variant
// below so camelCase entries like `nextAction` still match the literal key,
// AND PascalCase / SHOUT-CASE variants from a future proxy header echo or
// new upstream field also get stripped. Looking up `key.toLowerCase()`
// against the original case-preserved Set would silently break the
// chain-control strip — that's the regression the post-merge codex review
// caught at helpers.ts:408.
const INJECTED_FIELD_NAMES = new Set([
  // Chain-control fields. Defense-in-depth against prompt injection through
  // Hunter response records steering the agent's next call (see HUN-19943
  // todos/016).
  "nextAction",
  "pendingToolCall",
  "viewInHunter",
  // `save_leads` (HUN-20651 Phase 2): the coordinator-resolved research-vs-save
  // mode flag. The server treats it like `confirmed_credit_use` — set once at the
  // consented start and carried forward via `carryLoopFilters`. A Hunter response
  // record carrying `save_leads` (e.g. an attacker-controlled lead note or
  // scraped record) must never be able to flip a research loop into a write loop,
  // so we strip it at any depth before the model ever sees it.
  "save_leads",
  // `confirmed_save_use` (HUN-20651 review fix B): the save-SCOPED bulk consent
  // token. It authorizes the write path (Email-Verifier → Create-Lead-If-Missing
  // in a bulk loop), so an attacker-controlled Hunter record carrying it must
  // never reach the model and let a research loop start saving without the
  // save-cost approval. Strip it like `save_leads`.
  "confirmed_save_use",
  // Telemetry / internal-ID fields. OpenAI Apps SDK submission privacy
  // guidance: "session IDs, trace IDs, request IDs, timestamps" must not
  // appear in user-facing tool responses. Hunter's Rails API doesn't
  // routinely emit these today, but the filter keeps the surface tight as
  // upstream adds observability fields. `account_id` is intentionally NOT
  // in this set — Hunter's API uses `id` for many legitimate resources
  // (leads, lists, attributes), and `account_id` specifically is not
  // currently emitted.
  "request_id",
  "trace_id",
  "correlation_id",
  "internal_id",
  "x_request_id",
  "x-request-id",
])
const INJECTED_FIELD_NAMES_LOWERCASE = new Set([...INJECTED_FIELD_NAMES].map((k) => k.toLowerCase()))

function stripInjectedFields(parsed: unknown): unknown {
  if (parsed == null || typeof parsed !== "object") return parsed
  return stripInjectedFieldsInner(parsed, "")
}

function stripInjectedFieldsInner(value: unknown, path: string): unknown {
  if (value == null || typeof value !== "object") return value
  if (Array.isArray(value)) {
    return value.map((item, i) => stripInjectedFieldsInner(item, `${path}[${i}]`))
  }
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    // Case-insensitive match — Hunter Rails emits snake_case today but a future
    // upstream addition or a proxy header echo using PascalCase / SHOUT-CASE
    // (e.g. `X-Request-ID`) would otherwise slip through the strip. We use a
    // pre-computed lowercase variant set so camelCase entries in
    // INJECTED_FIELD_NAMES (`nextAction`, `pendingToolCall`, `viewInHunter`)
    // still match — looking up `key.toLowerCase()` against the original
    // case-preserved Set silently breaks chain-control stripping.
    if (INJECTED_FIELD_NAMES_LOWERCASE.has(key.toLowerCase())) {
      const at = path ? `${path}.${key}` : key
      console.warn(`callHunterApi: stripped injected \`${at}\` from Hunter response`)
      continue
    }
    out[key] = stripInjectedFieldsInner(val, path ? `${path}.${key}` : key)
  }
  return out
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
      // Read as raw text so non-JSON 5xx bodies (Cloudflare proxy HTML, plain
      // text upstream errors) reach `mapHunterError`'s defensive parser
      // intact. `mapHunterError` JSON.parses defensively in a try/catch, so
      // passing raw text is strictly compatible. Mirrors remote-mcp.
      errorText = await response.text()
    } catch {
      errorText = `HTTP ${response.status}`
    }
    const error = mapHunterError(response.status, response.headers.get("retry-after"), errorText)
    return {
      // `audience: ["user"]` so hosts route human-readable error narration
      // distinct from the typed envelope in structuredContent.error
      // (HUN-19943 todos/013). Same posture as success-path content blocks.
      // Use `error.message` (sanitized via `sanitizeUpstreamMessage` inside
      // `mapHunterError`) instead of raw `errorText` so Bearer / api_key
      // patterns never reach the user-visible content block.
      content: [{ type: "text" as const, text: error.message, annotations: { audience: ["user"] } }],
      structuredContent: { error },
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
    const message = `Failed to read response body from Hunter: ${e instanceof Error ? e.message : String(e)}`
    return {
      content: [{ type: "text" as const, text: message, annotations: { audience: ["user"] } }],
      structuredContent: {
        error: { code: "upstream_error" as const, retryable: true, message },
      },
      isError: true,
    }
  }
  if (text.length === 0) {
    const message =
      response.status === 202 ? "Accepted — operation scheduled for asynchronous completion." : "Success (no content)."
    return {
      content: [
        {
          type: "text" as const,
          text: `${message}${HUNTER_SOURCE_SUFFIX}`,
          annotations: { audience: ["user"] },
        },
      ],
      // mutationAckSchema-shaped envelope so delete-style tools' outputSchema
      // validates on 202/204 success.
      structuredContent: {
        kind: "ack" as const,
        ok: true as const,
        status: response.status,
        message,
      },
    }
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    // 2xx with non-JSON body. A misconfigured proxy / edge could serve HTML
    // or plain text with a 200 status; surface as an error so downstream
    // tools don't silently treat malformed responses as success.
    const message = `Unexpected non-JSON response from Hunter (status ${response.status}): ${text.slice(0, 200)}`
    return {
      content: [{ type: "text" as const, text: message, annotations: { audience: ["user"] } }],
      structuredContent: {
        error: { code: "upstream_error" as const, retryable: false, message },
      },
      isError: true,
    }
  }
  // Strip any attacker-injected `nextAction` keys (security defense-in-depth).
  const sanitized = stripInjectedFields(json) as Record<string, unknown>
  // Defense-in-depth: also scrub credential-shaped tokens out of the
  // user-visible content text. If a saved Hunter record (lead notes, custom-
  // attribute value, campaign subject) carries `Authorization: Bearer …`,
  // `api_key=…`, or a raw JWT in any string value, the scrub redacts it before
  // the model sees it. `structuredContent` still ships the raw value — that
  // surface is for machine consumption and is harder to use for exfil via the
  // assistant transcript. No truncation here: pass `Number.POSITIVE_INFINITY`
  // so the JSON envelope renders in full.
  const rawText = `${JSON.stringify(sanitized)}${HUNTER_SOURCE_SUFFIX}`
  return {
    // `audience: ["user"]` tags the JSON-envelope text block so hosts can route
    // it distinctly from the assistant-only nextAction blocks emitted by
    // `embedNextAction` (which use `audience: ["assistant"]`). HUN-19943 todos/013.
    content: [
      {
        type: "text" as const,
        text: sanitizeUpstreamMessage(rawText, Number.POSITIVE_INFINITY),
        annotations: { audience: ["user"] },
      },
    ],
    structuredContent: sanitized,
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
// The model honors the chained nextAction directly from structuredContent;
// no special prose hint is needed in descriptions (HUN-20170 removed the
// historical "CRITICAL:" prose to comply with OpenAI submission guidelines).
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

// READ_ONLY_ANNOTATIONS and PAID_TOOL_ANNOTATIONS were removed in HUN-20170
// (zero call sites after the Phase 4 matrix overhaul). Their replacements
// live below the NEXT_ACTION_END marker:
//   READ_ONLY_ANNOTATIONS  → READ_ONLY_PUBLIC_ANNOTATIONS or PRIVATE_READ_ANNOTATIONS
//   PAID_TOOL_ANNOTATIONS  → BILLABLE_LOOKUP_ANNOTATIONS (drops destructiveHint
//                            because credit spend isn't irreversible per OpenAI
//                            submission guidance; bulk-spend protection moved
//                            to Plan-Prospecting-Flow's upfront confirmation).

/**
 * Bounded writes against the user's Hunter workspace via Hunter's external
 * SaaS API. `openWorldHint: true` reflects the external surface (see HUN-19943
 * — OpenAI Apps SDK guidance treats `openWorldHint` as "interacts with
 * external systems, accounts, public platforms").
 */
export const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const

/**
 * Destructive mutations against Hunter resources. `destructiveHint: true`
 * triggers the OpenAI host's confirmation prompt; `openWorldHint: true`
 * matches the external SaaS surface (see HUN-19943).
 */
export const DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: true,
} as const

/**
 * Writes with effects beyond the user's Hunter workspace — `Start-Campaign`
 * triggers real outbound email to external recipients. `destructiveHint: true`
 * so the host surfaces a confirmation prompt; outbound emails cannot be
 * recalled and the action is effectively irreversible (see HUN-19943).
 */
export const EXTERNAL_SIDE_EFFECT_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: true,
} as const
// NEXT_ACTION_END

// ─── Submission-aligned annotation constants (HUN-20170) ──────────────────
//
// Added 2026-05-27 to satisfy OpenAI Apps SDK's tighter annotation semantics
// (https://developers.openai.com/apps-sdk/deploy/submission). These live
// OUTSIDE the NEXT_ACTION region so they don't force byte-identical edits in
// remote-mcp/src/helpers.ts.
//
// The five legacy constants above (READ_ONLY_*/PAID_TOOL_*/WRITE_*/DESTRUCTIVE_*/
// EXTERNAL_SIDE_EFFECT_*) stay exported for backwards compatibility until a
// follow-up PR migrates remaining callers.
//
// Matrix mapping:
//   READ_ONLY_PUBLIC_ANNOTATIONS    → public-data lookups (Find-Companies, Email-Count)
//   PRIVATE_READ_ANNOTATIONS         → private-workspace reads (Get-Account-Details,
//                                       List/Get-Lead, Lead-Exists, lists, attributes,
//                                       campaigns reads)
//   BILLABLE_LOOKUP_ANNOTATIONS      → paid lookups (Domain-Search, Email-Finder,
//                                       Email-Verifier, Person/Company/Combined-Enrichment)
//   PRIVATE_WRITE_ANNOTATIONS        → private-workspace create-only writes (Create-Lead,
//                                       Create-Lead-If-Missing, Save-Company, Create/Update
//                                       lists & attributes)
//   PRIVATE_DESTRUCTIVE_ANNOTATIONS  → private-workspace overwrite/delete/merge (Update-Lead,
//                                       Create-Or-Update-Lead, Delete-Lead, Delete/Merge
//                                       lists, Delete-Custom-Attribute)
//   LOCAL_PLAN_ANNOTATIONS           → Plan-Prospecting-Flow (synthesizes a plan locally;
//                                       no Hunter API call, no external effect)

/** Public-data lookup tools that read from Hunter's hosted index of public-internet data. */
export const READ_ONLY_PUBLIC_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const

/** Read-only access to the user's private Hunter workspace. */
export const PRIVATE_READ_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const

/**
 * Paid lookup. Credit-spend (not read-only) but no delete/overwrite of user data
 * (not destructive). Bulk credit consent is enforced server-side via
 * `confirmed_credit_use` on Domain-Search. See HUN-20170-v3 plan, Phase 1.1c.
 * https://developers.openai.com/apps-sdk/reference
 */
export const BILLABLE_LOOKUP_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const

/** Create-only writes to the user's private Hunter workspace. */
export const PRIVATE_WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
} as const

/**
 * Overwrite/delete/merge operations on the user's private Hunter workspace.
 * "Destructive" is the broader, accurate label (covers deletes + merges too,
 * not just field overwrites).
 */
export const PRIVATE_DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: false,
} as const

/** Local plan synthesis only; no Hunter API call. Used by Plan-Prospecting-Flow. */
export const LOCAL_PLAN_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const

/**
 * Report-API-Feedback. Records a free, non-billable feedback note about the
 * Hunter API/tools. Not read-only (it writes a feedback row), not destructive
 * (it never touches user data), and stays inside Hunter (no open-world effect).
 */
export const FEEDBACK_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
} as const

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
    desc`Multi-company loop carry (capped at 50 domains). When the user has picked 2+ companies, set this on the first ${TOOL_NAMES.domainSearch} call to the array of REMAINING picks (everything except the first picked domain that goes in the 'domain' arg). The response chain threads through ${TOOL_NAMES.domainSearch} → ${TOOL_NAMES.emailVerifier} → ${TOOL_NAMES.createLeadIfMissing} per company and auto-continues to the next pending domain without between-company confirmation gates. Downstream tools receive this via suggestedArgs and shrink it as the chain advances; pass it through verbatim from the prior tool's chained nextAction. Leave UNDEFINED for single-call usage and for prospecting flows where the user picked exactly ONE company (single-company mode preserves the confirmation gate on Email-Verifier).`,
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
  // Bulk credit-consent flag (HUN-20170-v3 Phase 1.1c). When set true on the
  // first Domain-Search call in a `pending_companies` batch, authorizes the
  // entire chain. Carried through chained `suggestedArgs` so subsequent
  // Domain-Search calls in the loop don't re-trigger the server-side guard.
  confirmed_credit_use?: boolean
  // Save-SCOPED bulk credit-consent flag (HUN-20651 review fix B). Distinct from
  // `confirmed_credit_use` (the research-scoped consent) so a research-mode
  // approval — whose estimate carried verification: 0 — can NOT authorize the
  // save path (search + verify + write). `requireBulkConsent` requires THIS token
  // in save mode; it's only ever produced by the save loop carry below, so a
  // research loop's carry can never forge it. One-time-set + carried like the
  // others. Stripped from upstream Hunter responses (INJECTED_FIELD_NAMES).
  confirmed_save_use?: boolean
  // Research-vs-save mode flag (HUN-20651 Phase 2). Coordinator-resolved and
  // one-time-set, like `confirmed_credit_use`: absent/false ⇒ research (default,
  // return-a-table; the loop advances Domain-Search → next Domain-Search and
  // NEVER chains to a write tool); `true` ⇒ save (the loop terminates at
  // Create-Lead-If-Missing). Carried through chained `suggestedArgs` so the mode
  // chosen on the first Domain-Search call governs the whole loop and can't be
  // silently re-decided mid-chain. Stripped from upstream Hunter responses (see
  // INJECTED_FIELD_NAMES) so a scraped record can't flip the mode.
  save_leads?: boolean
  // Destination list for the save loop (HUN-20651 review fix M). When the user
  // asked to save the gathered contacts INTO a list, the coordinator resolves the
  // list id once (Create-Leads-List for a new/named list, or List-Leads-Lists for
  // an existing one) and carries it through every chained Create-Lead-If-Missing
  // so the saved leads land in the intended list instead of unlisted. Carried
  // verbatim like the other save fields; only forwarded when present. Domain-Search
  // and Email-Verifier accept it as a carry-only field (they never read it), and
  // Create-Lead-If-Missing consumes it as a real lead field. Research loops simply
  // never set it.
  leads_list_id?: number
}

/**
 * Picks the loop-filter fields out of an args object and returns them as a
 * plain record suitable for spreading into chained `suggestedArgs`. Undefined
 * fields are dropped so the chained payload stays minimal.
 */
export function carryLoopFilters(args: LoopFilters): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  if (args.limit !== undefined) out.limit = args.limit
  if (args.type) out.type = args.type
  if (args.seniority) out.seniority = args.seniority
  if (args.department) out.department = args.department
  if (args.required_field) out.required_field = args.required_field
  if (args.confirmed_credit_use === true) out.confirmed_credit_use = true
  // Save-scoped consent carry (HUN-20651 review fix B). Only forwarded inside a
  // bona-fide save loop (save_leads === true AND the save consent was granted).
  // A research loop never carries `save_leads`, so it can never propagate
  // `confirmed_save_use` either — which is exactly what stops a research-scoped
  // approval from later authorizing the save path. Kept monotonic-toward-save
  // like `save_leads`.
  if (args.save_leads === true && args.confirmed_save_use === true) out.confirmed_save_use = true
  // Only carry `save_leads` when it's explicitly true. Carrying `false`/absent
  // would be redundant (research is the default) and would also give a mid-loop
  // `false` a foothold to flip a save loop back to research — keep the carry
  // monotonic-toward-save-only and let the handler own the one-time-set guard.
  if (args.save_leads === true) out.save_leads = true
  // Destination list carry (HUN-20651 review fix M). Forward `leads_list_id`
  // whenever it's present so the loop-emitted Create-Lead-If-Missing suggestedArgs
  // carry the intended list id through to the save terminal. It's a passive carry
  // on Domain-Search/Email-Verifier (they don't read it) and a real lead field on
  // Create-Lead-If-Missing. Research loops never set it, so it's naturally absent
  // there. Not mode-bound: a list id without save_leads is inert (no save tool is
  // ever reached), so no extra guard is needed.
  if (args.leads_list_id !== undefined) out.leads_list_id = args.leads_list_id
  return out
}

/**
 * Strips fields from `structuredContent.data` that aren't in the supplied
 * Zod schema's allowlist by parsing the data through the schema. Zod 4's
 * default object behavior drops unknown keys at parse time; the schema
 * therefore acts as a positive allowlist (the doc-comment says "here's what
 * we keep"; the runtime enforces it).
 *
 * Why this exists: declaring an outputSchema is necessary but not sufficient
 * for response minimization. The MCP SDK validates `structuredContent`
 * against the outputSchema, but it does NOT use the parsed (stripped) result
 * — `parseResult.data` is discarded after validation. So fields outside the
 * schema's allowlist still reach the model through `structuredContent` and
 * the JSON envelope text. Codex flagged this on PR #12677 at enrichment.ts:33.
 *
 * On parse failure (schema doesn't match — e.g. required field missing) the
 * helper falls back to the original `result`. Callers that need a stronger
 * guarantee should also use `stripResponseFields` with an explicit named
 * field list as a belt-and-suspenders pass.
 *
 * On no-op (parsed data is structurally identical to the original) the
 * helper returns the original `result` to avoid re-serialization.
 */
export function minimizeResponseData(result: McpTextResult, schema: z.ZodType): McpTextResult {
  if (result.isError) return result
  const sc = result.structuredContent as { data?: unknown } | undefined
  if (!sc?.data || typeof sc.data !== "object") return result
  const parseResult = schema.safeParse(sc.data)
  if (!parseResult.success) return result
  const trimmed = parseResult.data
  // No-op fast path: shape unchanged → reuse the original `result` so we
  // don't re-allocate or re-serialize on every call.
  const originalJson = JSON.stringify(sc.data)
  const trimmedJson = JSON.stringify(trimmed)
  if (originalJson === trimmedJson) return result
  const trimmedStructured = { ...sc, data: trimmed }
  // Re-run `sanitizeUpstreamMessage` on the rewritten text — same reason as
  // `stripResponseFields`: we serialize fresh from the parsed data and need
  // to re-apply the scrub invariant that `callHunterApi` ran on the original
  // text.
  const rawText = `${JSON.stringify(trimmedStructured)}${HUNTER_SOURCE_SUFFIX}`
  return {
    ...result,
    content: [
      { ...result.content[0], type: "text" as const, text: sanitizeUpstreamMessage(rawText, Number.POSITIVE_INFINITY) },
    ],
    structuredContent: trimmedStructured,
  }
}

/**
 * Strips named keys from a tool result's `structuredContent.data` AND rewrites
 * the JSON-envelope text in `content[0]` to match. No-op on error responses
 * (they don't carry a `data` envelope) and when none of the named keys are
 * present. Extracted in todo #107 so any tool needing per-field response
 * minimization shares the same shape; the original site is `Get-Account-Details`
 * (PII strip: first_name, last_name, email, team_id).
 *
 * Uses the shared `HUNTER_SOURCE_SUFFIX` to mirror `callHunterApi`'s success-
 * path text format, so a future tweak to the source attribution propagates
 * to all callers without silent desync.
 *
 * Compare with `minimizeResponseData` above: this function takes an explicit
 * named field list (what to remove), the other takes a Zod schema (what to
 * keep). Account uses both, chained — defense-in-depth.
 */
export function stripResponseFields(result: McpTextResult, fieldsToStrip: ReadonlySet<string>): McpTextResult {
  if (result.isError) return result
  const sc = result.structuredContent as { data?: Record<string, unknown> } | undefined
  if (!sc?.data || typeof sc.data !== "object") return result
  const trimmed: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(sc.data)) {
    if (!fieldsToStrip.has(k)) trimmed[k] = v
  }
  // No-op if every key was already absent — keep the original result intact
  // so we don't allocate or re-serialize on every call.
  if (Object.keys(trimmed).length === Object.keys(sc.data).length) return result
  const trimmedStructured = { ...sc, data: trimmed }
  // Re-run `sanitizeUpstreamMessage` on the rewritten text. callHunterApi's
  // success branch ran the same scrub on its original `content[0].text`; this
  // function discards that text and serializes fresh from the (unscrubbed)
  // structuredContent, so the scrub invariant has to be re-applied here.
  // Without it, a credential-shaped string in a value we kept (anything
  // outside `fieldsToStrip`) would re-surface in the user-visible channel
  // even though callHunterApi already redacted it once.
  const rawText = `${JSON.stringify(trimmedStructured)}${HUNTER_SOURCE_SUFFIX}`
  return {
    ...result,
    content: [
      { ...result.content[0], type: "text" as const, text: sanitizeUpstreamMessage(rawText, Number.POSITIVE_INFINITY) },
    ],
    structuredContent: trimmedStructured,
  }
}

/**
 * Server-side bulk credit-consent guard. When the call is an unconsented bulk
 * (or save) entry, returns a synthesized `McpTextResult` carrying an `ask_user`
 * nextAction with the credit-cost summary — the caller should `return` it
 * immediately, short-circuiting the Hunter API call. Returns `null` when the
 * call is authorized to proceed.
 *
 * Today `Domain-Search` is the only tool that calls this, because it's the
 * only credit-debit entry to bulk loops. As soon as a second tool wants to
 * accept `pending_companies` directly (e.g. a future bulk-verification entry
 * point), it MUST call this helper at handler-top — otherwise the implicit
 * invariant "the loop always re-enters Domain-Search before next credit
 * debit" silently breaks. Extracted from the original inline guard so the
 * contract is grep-able (`grep -r requireBulkConsent`).
 *
 * `pending === undefined` (a genuine single-company call) is always allowed —
 * single-company save keeps its own per-email `requiresConfirmation` gate in the
 * handler. The distinction that matters for the gate is "pending is a DEFINED
 * array" (the model entered the bulk shape) vs "pending is undefined".
 *
 * HUN-20651 review fix H — empty-pending save backdoor. `pending: []` (an empty
 * but DEFINED array) routes the handler through the multi-company `advanceLoop`
 * path, which chains straight to Create-Lead-If-Missing without a per-email gate.
 * If the gate early-returned on `length === 0`, a save_leads call with empty
 * pending and no consent wrote a lead with NEITHER the bulk consent gate NOR the
 * single-company per-email gate. Fix: in SAVE mode, an empty-but-defined pending
 * is treated as a 1-company save batch and the gate fires when the save isn't yet
 * consented (count the current company). Research mode keeps the old behavior —
 * an empty-pending research call has nothing to charge for beyond this single
 * company's search (which the model already authorized by entering the loop) and
 * just completes with a table, so it never gates on empty.
 *
 * Lives outside the NEXT_ACTION byte-aligned region so each MCP adopts
 * independently. See HUN-20170-v3 plan Phase 1.1c + todo #106.
 */
export function requireBulkConsent(
  pending: readonly string[] | undefined,
  confirmed: boolean | undefined,
  summary: string,
  estimatedCredits: { search: number; verification: number },
  // Mode-binding (HUN-20651 review fix B). The carried consent token is
  // mode-SCOPED: a research-scoped approval (verification estimate 0) must NOT
  // authorize the save path (search + verify + write). Without this, a research
  // batch's `confirmed_credit_use: true` carried forward to a later `save_leads:
  // true` hop bypassed the gate and Email-Verifier / Create-Lead-If-Missing ran
  // on the higher save cost the user never approved. So:
  //   - research mode (saveLeads !== true): the gate is satisfied by
  //     `confirmed` (the research consent) — unchanged.
  //   - save mode (saveLeads === true): the gate requires the SAVE-scoped
  //     `confirmedSave` token. A research consent alone re-fires the gate with
  //     the (higher) save estimate. `confirmedSave` is only ever produced by the
  //     server's save loop carry (carryLoopFilters), so a research loop's carry
  //     can never satisfy the save gate.
  opts?: { saveLeads?: boolean; confirmedSave?: boolean },
): McpTextResult | null {
  // Genuine single-company call (pending undefined): never gate here; the handler
  // owns the single-company per-email confirmation.
  if (!pending) return null
  const isSave = opts?.saveLeads === true
  // Research mode + empty pending: nothing to gate (the loop is on its last hop
  // and just renders a table). Save mode + empty pending IS gated (review fix H):
  // the current company is a 1-company save batch that still needs save consent.
  if (pending.length === 0 && !isSave) return null
  const consented = isSave ? opts?.confirmedSave === true : confirmed === true
  if (consented) return null
  return embedNextAction(
    {
      content: [{ type: "text" as const, text: summary, annotations: { audience: ["user"] } }],
      structuredContent: {
        kind: "approval_required" as const,
        ok: true as const,
        estimated_credits: estimatedCredits,
      },
    },
    buildNextAction({ kind: "ask_user", question: summary }),
  )
}

/**
 * Shared terminal-step nextAction emitter for the multi-company prospecting
 * loop. Used by `Create-Or-Update-Lead` and `Create-Lead-If-Missing` after a
 * successful save (or already-existed no-op):
 *
 *   - If `pending_companies` is non-empty: chain into the next Domain-Search
 *     with the filter-carry forwarded, so the loop advances to the next
 *     selected company without a between-company confirmation gate.
 *   - If `pending_companies` is `undefined` (single-call mode) OR an empty
 *     array (last hop in a loop): emit `complete`. The flag distinguishes
 *     the two so the user-facing summary reads correctly in each path.
 *
 * Extracted in HUN-20170 todo #103 to dedupe two near-identical blocks in
 * leads.ts. Lives outside the NEXT_ACTION byte-aligned region so each MCP
 * can adopt independently.
 */
export function chainOrComplete(
  result: McpTextResult,
  pending: readonly string[] | undefined,
  filters: LoopFilters,
  copy: { reason: string; loopCompleteSummary: string; singleCompleteSummary: string },
): McpTextResult {
  if (pending !== undefined && pending.length > 0) {
    const [next, ...rest] = pending
    const filterCarry = carryLoopFilters(filters)
    return embedNextAction(
      result,
      buildNextAction({
        kind: "call_tool",
        tool: TOOL_NAMES.domainSearch,
        reason: copy.reason,
        suggestedArgs: { domain: next, pending_companies: rest, ...filterCarry },
      }),
    )
  }
  const isLastLoopHop = pending !== undefined
  return embedNextAction(
    result,
    buildNextAction({
      kind: "complete",
      summary: isLastLoopHop ? copy.loopCompleteSummary : copy.singleCompleteSummary,
    }),
  )
}

// Three-way verification routing outcome (HUN-20651 review fix A). Defined here
// (not in tools/search.ts) so `advanceLoop` can take it without a circular import
// — search.ts already imports from helpers.ts. The authoritative producer is
// `verificationDecision` in tools/search.ts, which re-exports this type.
//   - "skip_and_use"  : trustworthy as returned (save / include; skip verify)
//   - "skip_and_drop" : accept_all/invalid (not saveable; skip verify; drop)
//   - "verify"        : run Email-Verifier first (everything else)
export type VerificationDecision = "skip_and_use" | "skip_and_drop" | "verify"

/**
 * Terminal router for a successful Domain-Search hop in the multi-company loop
 * (HUN-20651 Phase 2). Lives outside the NEXT_ACTION byte-aligned region so each
 * MCP adopts it independently. The Domain-Search handler funnels BOTH modes
 * through this one helper so the mode-branch lives in a single, testable place
 * instead of duplicated inline.
 *
 * The original prospecting flow was hardwired toward saving leads: every
 * Domain-Search success chained into Email-Verifier → Create-Lead-If-Missing.
 * Research mode (the new default) wants the opposite — a gate-free read loop that
 * returns a table and writes nothing.
 *
 *   - SAVE mode (`filters.save_leads === true`) — unchanged from the shipped
 *     loop: when this company yielded an email, chain into Create-Lead-If-Missing
 *     (skip-verify) or Email-Verifier (verify); the create-only terminal is
 *     preserved (never Create-Or-Update-Lead). When it yielded none, advance to
 *     the next pending company, or `complete` the loop.
 *
 *   - RESEARCH mode (default) — NEVER chains into Email-Verifier or any write
 *     tool. Whether or not this company yielded an email, advance straight to the
 *     next pending Domain-Search (carrying the same filters + mode + bulk-consent
 *     flag), or — when no companies remain — emit `complete` with a table-render
 *     instruction so the model renders the rows it collected across the loop.
 *     Research persists nothing; the table IS the deliverable.
 *
 * Self-reference dedup and `loopRecoveryAction` recovery are handled by the
 * caller BEFORE it invokes this (it has already cleaned `pending` of the current
 * domain and short-circuited on `result.isError`). `email` is `null` when the
 * company returned no usable contact (the 0-contact advance). This helper is only
 * reached when `pending !== undefined` (multi-company mode); single-company
 * routing stays inline in the handler because its terminals differ (`complete`
 * table vs. the per-email confirmation gate).
 */
export function advanceLoop(
  result: McpTextResult,
  pending: readonly string[],
  filters: LoopFilters,
  ctx: {
    domain: string
    email: string | null
    // Three-way verification routing (HUN-20651 review fix A). `"skip_and_use"`
    // = trustworthy as returned (save it / skip Email-Verifier). `"verify"` =
    // run Email-Verifier first. `"skip_and_drop"` = accept_all/invalid — a
    // re-verify is pointless AND the address is NOT trustworthy to save, so save
    // mode must advance WITHOUT creating a lead (the 0-contact path). Replaces
    // the old `skipVerify` boolean, which conflated `skip_and_use` and
    // `skip_and_drop` and let an invalid/accept_all first contact get SAVED.
    decision: VerificationDecision
    reasons: { save: string; verify: string; advanceNoEmail: string; advanceDrop: string; advanceResearch: string }
    summaries: { loopComplete: string; dropComplete: string; researchComplete: string }
  },
): McpTextResult {
  const filterCarry = carryLoopFilters(filters)
  const isResearch = filters.save_leads !== true

  // Defense-in-depth per-email gate (HUN-20651 review fix H). The bulk loop only
  // suppresses the per-email `requiresConfirmation` because the upfront
  // `requireBulkConsent` already covered the whole save batch via
  // `confirmed_save_use`. If we reached a SAVE terminal WITHOUT that save consent
  // (e.g. an empty-pending entry that slipped past the gate, or a direct
  // Email-Verifier bulk entry — review fix J), the write is uncovered, so we must
  // NOT suppress the gate: re-attach `requiresConfirmation: true` to the save
  // terminal. A legitimate consented loop carries `confirmed_save_use: true` and
  // advances ungated as before.
  const saveGate = !isResearch && filters.confirmed_save_use !== true ? { requiresConfirmation: true } : {}

  // SAVE mode, `skip_and_drop`, WITH an email in hand (HUN-20651 review fix F): a
  // contact WAS found at this domain — it's just accept_all/invalid, so we won't
  // create a lead from it. This is a distinct outcome from the genuine 0-contact
  // case below, and must NOT reuse the "No contacts found" copy (which would
  // misreport that Domain-Search found nothing). It gets its own drop-specific
  // reason/summary. Research mode never sets this (it falls through to the
  // research advance/complete copy regardless of decision).
  const isSaveDrop = !isResearch && ctx.email != null && ctx.decision === "skip_and_drop"

  // SAVE mode with a SAVEABLE email in hand: chain to the create-only terminal
  // (skip_and_use) or to Email-Verifier first (verify). `skip_and_drop`
  // (accept_all/invalid) falls through to the next-company advance below WITHOUT
  // saving — surfacing the unsaveable row but never creating a lead from it.
  // Research mode never enters here — it falls through to the next-company
  // advance regardless of `email`.
  if (!isResearch && ctx.email && ctx.decision !== "skip_and_drop") {
    if (ctx.decision === "skip_and_use") {
      return embedNextAction(
        result,
        buildNextAction({
          kind: "call_tool",
          tool: TOOL_NAMES.createLeadIfMissing,
          reason: ctx.reasons.save,
          suggestedArgs: { email: ctx.email, pending_companies: pending, ...filterCarry },
          ...saveGate,
        }),
      )
    }
    return embedNextAction(
      result,
      buildNextAction({
        kind: "call_tool",
        tool: TOOL_NAMES.emailVerifier,
        reason: ctx.reasons.verify,
        suggestedArgs: { email: ctx.email, pending_companies: pending, ...filterCarry },
        ...saveGate,
      }),
    )
  }

  // Advance to the next pending company. In research mode this is the ONLY
  // forward edge (a found email is rendered into the table, not saved); in save
  // mode this is either the 0-contact advance (no email worth saving) OR the
  // drop advance (a contact was found but its email was accept_all/invalid, so it
  // was intentionally not saved — distinct copy, never the "no contacts" copy).
  if (pending.length > 0) {
    const [next, ...rest] = pending
    return embedNextAction(
      result,
      buildNextAction({
        kind: "call_tool",
        tool: TOOL_NAMES.domainSearch,
        reason: isResearch
          ? ctx.reasons.advanceResearch
          : isSaveDrop
            ? ctx.reasons.advanceDrop
            : ctx.reasons.advanceNoEmail,
        suggestedArgs: { domain: next, pending_companies: rest, ...filterCarry },
      }),
    )
  }

  // No companies left. Research ends with a table-render instruction; a save run
  // whose last company was dropped (accept_all/invalid) gets the drop-complete
  // summary; a genuine no-contact save run gets the loop-complete summary.
  return embedNextAction(
    result,
    buildNextAction({
      kind: "complete",
      summary: isResearch
        ? ctx.summaries.researchComplete
        : isSaveDrop
          ? ctx.summaries.dropComplete
          : ctx.summaries.loopComplete,
    }),
  )
}
