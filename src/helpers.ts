import { z } from "zod"

import { currentClientUserAgent } from "./client-context"
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
// All names use PascalCase-Hyphenated for consistency. Semantic renames:
// `Email-Enrichment` → `Person-Enrichment` (the operation enriches a
// person/profile, not an email — the email is just the input; aligns with
// claude-plugin/skills/person-enrichment/), and the HUN-20867/HUN-20869
// campaign→sequence terminology migration (`List-Campaigns` → `List-Sequences`,
// `Start-Campaign` → `Start-Sequence`, recipient tools renamed to match) —
// "sequence" is the canonical product term and the tools hit /v2/sequences/*.
//
// Shared with chatgpt-mcp/src/helpers.ts and remote-mcp/src/helpers.ts. The
// entries of chatgpt-mcp's TOOL_NAMES must be a subset of remote-mcp's, with the
// same keys and values: the ChatGPT app does not ship the person-email,
// people-finding, and API-key tools (HUN-23709). The rest of this block must be
// BYTE-IDENTICAL. Enforced by scripts/check-tool-names-aligned.mjs.
//
// See docs/plans/2026-04-28-feat-chatgpt-app-review-readiness-plan.md (Pillar 0).
export const TOOL_NAMES = {
  // search
  discover: "Find-Companies",
  emailVerifier: "Email-Verifier",
  emailCount: "Email-Count",
  // enrichment
  companyEnrichment: "Company-Enrichment",
  // account
  account: "Get-Account-Details",
  // email accounts
  listEmailAccounts: "List-Email-Accounts",
  getEmailAccount: "Get-Email-Account",
  listEmailAccountSequences: "List-Email-Account-Sequences",
  // sequences
  listSequences: "List-Sequences",
  getSequence: "Get-Sequence",
  createSequence: "Create-Sequence",
  updateSequence: "Update-Sequence",
  deleteSequence: "Delete-Sequence",
  listSequenceFollowUps: "List-Sequence-Follow-Ups",
  getSequenceFollowUp: "Get-Sequence-Follow-Up",
  createSequenceFollowUp: "Create-Sequence-Follow-Up",
  updateSequenceFollowUp: "Update-Sequence-Follow-Up",
  deleteSequenceFollowUp: "Delete-Sequence-Follow-Up",
  pauseSequence: "Pause-Sequence",
  resumeSequence: "Resume-Sequence",
  archiveSequence: "Archive-Sequence",
  getSequenceStats: "Get-Sequence-Stats",
  listSequenceRecipients: "List-Sequence-Recipients",
  addSequenceRecipients: "Add-Sequence-Recipients",
  removeSequenceRecipients: "Remove-Sequence-Recipients",
  startSequence: "Start-Sequence",
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
  // message templates
  listMessageTemplates: "List-Message-Templates",
  getMessageTemplate: "Get-Message-Template",
  createMessageTemplate: "Create-Message-Template",
  updateMessageTemplate: "Update-Message-Template",
  deleteMessageTemplate: "Delete-Message-Template",
  // lead tags
  listLeadTags: "List-Lead-Tags",
  createLeadTag: "Create-Lead-Tag",
  updateLeadTag: "Update-Lead-Tag",
  deleteLeadTag: "Delete-Lead-Tag",
  addTagToLead: "Add-Tag-To-Lead",
  removeTagFromLead: "Remove-Tag-From-Lead",
  // leads list folders + favorites
  listLeadsListFolders: "List-Leads-List-Folders",
  createLeadsListFolder: "Create-Leads-List-Folder",
  updateLeadsListFolder: "Update-Leads-List-Folder",
  deleteLeadsListFolder: "Delete-Leads-List-Folder",
  favoriteLeadsList: "Favorite-Leads-List",
  unfavoriteLeadsList: "Unfavorite-Leads-List",
  // bulk operations
  bulkMoveLeads: "Bulk-Move-Leads",
  bulkDeleteLeads: "Bulk-Delete-Leads",
  bulkMoveCompanies: "Bulk-Move-Companies",
  bulkCopyCompanies: "Bulk-Copy-Companies",
  bulkDeleteCompanies: "Bulk-Delete-Companies",
  // discover people + saved searches
  listSavedSearches: "List-Saved-Searches",
  getSavedSearch: "Get-Saved-Search",
  createSavedSearch: "Create-Saved-Search",
  deleteSavedSearch: "Delete-Saved-Search",
  // integrations (CRM push + webhooks)
  pushLeadsToCrm: "Push-Leads-To-CRM",
  listWebhooks: "List-Webhooks",
  updateWebhook: "Update-Webhook",
  // usage
  getUsage: "Get-Usage",
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

/**
 * A hunter.io link with the ChatGPT app's UTM parameters (HUN-23709). The
 * widgets use the same `utm_source`. Rails stores the UTMs on the account when
 * a new visitor signs up; PostHog sees them on the pageview of a logged-in user.
 * `utmContent` names the tool, to measure which link the user opened.
 */
export function hunterLink(path: string, utmContent?: string): string {
  const url = new URL(path, HUNTER_BASE)
  url.searchParams.set("utm_source", "hunter-chatgpt")
  url.searchParams.set("utm_medium", "chatgpt-app")
  if (utmContent) url.searchParams.set("utm_content", utmContent)
  return url.toString()
}

export function withDeepLink(result: McpTextResult, path: string, utmContent?: string): McpTextResult {
  if (result.isError) return result
  const url = hunterLink(path, utmContent)
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
  // Optional JSON request body, sent with `Content-Type: application/json`
  // INSTEAD of form-encoding `params`. Use this when the payload contains a
  // nested array of objects whose shape must round-trip verbatim: Rails'
  // `x-www-form-urlencoded` parser (Rack::Utils.parse_nested_query) cannot
  // rebuild an array-of-hashes from `key[0][..]`/`key[1][..]` (numeric brackets
  // become a Hash keyed "0","1", not an Array) and MERGES disjoint-key objects
  // under `key[][..]` (e.g. `[{continent},{country}]` collapses into one hash).
  // A JSON body preserves arrays exactly, so `params.permit(filters: {})` stores
  // the same shape it will later return. `params` and `jsonBody` are mutually
  // exclusive; when both are present `jsonBody` wins.
  jsonBody?: unknown
  signal?: AbortSignal
  // Optional caller-supplied Idempotency-Key. When absent, POST requests get
  // an auto-generated UUID per invocation (HUN-18680 / HUN-20867).
  idempotencyKey?: string
}

type CallOptions = GetOptions | MutateOptions

// HUN-18680 / HUN-20867: Idempotency-Key on resource-creating POSTs.
//
// The header is sent on EVERY POST — Rails ignores it on endpoints that have
// not adopted Api::Concerns::Idempotency yet, and the HUN-18680 rollout
// (sequences, follow-ups, templates, messages, leads, imports) picks it up
// endpoint by endpoint with no worker change needed.
//
// The network-failure RETRY below is scoped to the paths where the server
// enforces idempotency TODAY (only POST /sequences — the sole controller
// including the concern as of HUN-18638; widen this regex as the Rails
// rollout lands on more endpoints). Retrying an unprotected POST could
// double-create: the first request may have succeeded with the response lost
// in transit, and without a server-side key check the second request creates
// a duplicate.
const IDEMPOTENT_RETRY_PATH_RE = /^\/sequences$/

function isIdempotentRetryPath(path: string): boolean {
  return IDEMPOTENT_RETRY_PATH_RE.test(path.split("?")[0] ?? "")
}

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
  // HUN-18680: Rails' Api::Concerns::Idempotency returns 409 with
  // `Retry-After: 2` (IDEMPOTENCY_RETRY_AFTER_SECONDS) while a request
  // carrying the same Idempotency-Key is still in flight. The original
  // request may still be processing — or may already have succeeded — so a
  // blind re-issue risks a duplicate create. Surface it as retryable with an
  // explicit wait (Retry-After parsing mirrors the 429 branch, defaulting to
  // 2) and steer the model to verify before re-creating.
  if (status === 409) {
    const seconds = retryAfter ? Number.parseInt(retryAfter, 10) : Number.NaN
    const retryAfterSeconds = Number.isFinite(seconds) && seconds >= 0 ? seconds : 2
    return {
      code: "rate_limited",
      retryable: true,
      retry_after_seconds: retryAfterSeconds,
      message: `A previous request with the same Idempotency-Key is still being processed — it may still complete or may have already succeeded. Wait ${retryAfterSeconds} seconds, then check whether the resource already exists (e.g. via List-Sequences) before re-issuing the create.`,
    }
  }
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
  // `save_leads` (HUN-20651 Phase 2): the save-request flag on Email-Verifier.
  // A Hunter response record carrying it (e.g. an attacker-controlled lead
  // note) must never steer the model into a write, so we strip it at any depth.
  "save_leads",
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

  let isJsonBody = false
  if (isGet) {
    const search = options.params ? new URLSearchParams(options.params).toString() : ""
    url = search ? `${options.baseUrl}${options.path}?${search}` : `${options.baseUrl}${options.path}`
  } else {
    url = `${options.baseUrl}${options.path}`
    if (options.jsonBody !== undefined) {
      // JSON body preserves nested array-of-object shape verbatim (Rails parses
      // it straight into `params`), which form-encoding cannot round-trip.
      body = JSON.stringify(options.jsonBody)
      isJsonBody = true
    } else if (options.params && Object.keys(options.params).length > 0) {
      body = buildRailsFormBody(options.params).toString()
    }
  }

  const headers: Record<string, string> = {
    "X-SOURCE": "hunter-chatgpt",
    Authorization: `Bearer ${options.apiKey}`,
  }
  // The calling MCP host's User-Agent, verbatim. Rails turns it into a client
  // slug (`Mcp::Client`) — see client-context.ts for why the mapping lives there
  // and not here. Absent outside a request scope, and absent when the caller sent
  // no User-Agent at all; Rails records that case as `unknown`, which is a
  // different thing from a User-Agent it cannot name.
  const clientUserAgent = currentClientUserAgent()
  if (clientUserAgent) headers["X-MCP-USER-AGENT"] = clientUserAgent
  if (body !== undefined) {
    headers["Content-Type"] = isJsonBody ? "application/json" : "application/x-www-form-urlencoded"
  }
  if (!isGet && options.method === "POST") {
    // One UUID per tool invocation: duplicate deliveries of the SAME request
    // (network retry below) are dedupe-safe, while a genuine second tool call
    // gets a fresh key and is allowed to create a second resource.
    headers["Idempotency-Key"] = options.idempotencyKey ?? crypto.randomUUID()
  }

  let response: Response
  try {
    response = await fetch(url, { method, headers, body, signal: options.signal })
  } catch (e) {
    // Network-level failure (DNS, connection reset, socket close): the request
    // may or may not have reached Hunter. For POSTs to idempotency-protected
    // paths, retry once REUSING the same Idempotency-Key — if the original
    // actually succeeded, the server replays the stored response instead of
    // double-creating (HUN-18680). Deliberate aborts and all other requests
    // propagate unchanged.
    const aborted = (e instanceof Error && e.name === "AbortError") || options.signal?.aborted === true
    if (aborted || isGet || options.method !== "POST" || !isIdempotentRetryPath(options.path)) throw e
    console.warn(`callHunterApi: network failure on POST ${options.path}; retrying once with the same Idempotency-Key`)
    try {
      response = await fetch(url, { method, headers, body, signal: options.signal })
    } catch (retryError) {
      // A deliberate abort on the retry (caller cancelled, timeout fired between
      // the two attempts) must propagate exactly like an abort on the initial
      // fetch — never get masked as an upstream_error. Same guard as above.
      const retryAborted =
        (retryError instanceof Error && retryError.name === "AbortError") || options.signal?.aborted === true
      if (retryAborted) throw retryError
      // The retry ALSO failed at the network layer. callHunterApi's contract is
      // to never throw on network failure, so return the same typed error
      // envelope every other network-ish path returns instead of letting the
      // exception escape (HUN-18680).
      const message = `Network failure calling Hunter (${options.path}) and its idempotent retry both failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`
      return {
        content: [{ type: "text" as const, text: message, annotations: { audience: ["user"] } }],
        structuredContent: {
          error: { code: "upstream_error" as const, retryable: true, message },
        },
        isError: true,
      }
    }
  }

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
  // attribute value, sequence subject) carries `Authorization: Bearer …`,
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

/**
 * Tools whose chained `nextAction` may carry a `pendingToolCall` for hard
 * confirmation. `Start-Sequence` sends real emails (Phase 4); the HUN-20852 /
 * HUN-20858 / HUN-20861 additions gate bulk mutations, CRM pushes, and sequence
 * deletion behind the same explicit-confirmation pattern (first call returns
 * ask_user + pendingToolCall; the re-issued call with `confirmed: true`
 * executes). Narrowing the type prevents future
 * emissions from steering the model into arbitrary tools under cover of an
 * `ask_user` question.
 *
 * Lives outside the NEXT_ACTION region: each MCP lists only the confirmable
 * tools it registers (chatgpt-mcp has no API-key tools, HUN-23709).
 */
export type ConfirmableToolName =
  | typeof TOOL_NAMES.startSequence
  | typeof TOOL_NAMES.deleteSequence
  | typeof TOOL_NAMES.addSequenceRecipients
  | typeof TOOL_NAMES.bulkMoveLeads
  | typeof TOOL_NAMES.bulkDeleteLeads
  | typeof TOOL_NAMES.bulkMoveCompanies
  | typeof TOOL_NAMES.bulkCopyCompanies
  | typeof TOOL_NAMES.bulkDeleteCompanies
  | typeof TOOL_NAMES.pushLeadsToCrm

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
// Confirmation payloads get a larger ceiling than chained `suggestedArgs`.
// The 2048 cap bounds CHAINED data — `pending_companies` and friends, which
// can carry upstream/scraped content into a model-visible block. A
// `pendingToolCall` is a different animal: it echoes the CALLER'S OWN
// arguments straight back, and every shape is strictly bounded by its per-tool
// schema in `schemas/common.ts` (Add-Sequence-Recipients, the widest, tops out
// at 50 x 254-char emails ~= 13 KB). Sharing the 2048 cap silently dropped the
// `pendingToolCall` from a full 50-address batch — 50 x 35 chars already
// serializes to ~2.2 KB — leaving an ask_user the agent could not act on.
// (HUN-21555; Codex review on #14128)
const PENDING_TOOL_CALL_MAX_BYTES = 16384

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
  const cap =
    nextAction.kind === "ask_user" && nextAction.pendingToolCall !== undefined
      ? PENDING_TOOL_CALL_MAX_BYTES
      : SUGGESTED_ARGS_MAX_BYTES
  const byteSize = new TextEncoder().encode(JSON.stringify(nextAction)).byteLength
  if (byteSize > cap) {
    console.warn(`embedNextAction: payload ${byteSize} bytes exceeds ${cap} cap — emitting fallback ask_user`)
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
 * Writes with effects beyond the user's Hunter workspace — `Start-Sequence`
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
// EXTERNAL_SIDE_EFFECT_*) stay exported for backwards compatibility. As of
// HUN-20797 EXTERNAL_SIDE_EFFECT_* (Start-Sequence) and WRITE_* (Resume-Sequence
// and Add-Sequence-Recipients — both can trigger real outbound email on a started
// / paused-with-pending sequence) still have callers; DESTRUCTIVE_* is now unused,
// kept only because it sits inside the byte-locked NEXT_ACTION region above.
//
// Matrix mapping:
//   READ_ONLY_PUBLIC_ANNOTATIONS    → public-data lookups (Find-Companies)
//   PRIVATE_READ_ANNOTATIONS         → private-workspace reads (Get-Account-Details,
//                                       List/Get-Lead, Lead-Exists, lists, attributes,
//                                       sequences reads)
//   BILLABLE_LOOKUP_ANNOTATIONS      → paid lookups (Email-Verifier, Company-Enrichment)
//   PRIVATE_WRITE_ANNOTATIONS        → private-workspace writes (Create-Lead,
//                                       Create-Lead-If-Missing, Save-Company, Create lists &
//                                       attributes; Pause-Sequence — HUN-20797)
//   PRIVATE_DESTRUCTIVE_ANNOTATIONS  → private-workspace overwrite/delete/merge (Update-Lead,
//                                       Create-Or-Update-Lead, Delete-Lead, Delete/Merge
//                                       lists, Delete-Custom-Attribute; Archive-Sequence,
//                                       Remove-Sequence-Recipients — HUN-20797)
//   TEAM_SHARED_WRITE_ANNOTATIONS /
//   TEAM_SHARED_DESTRUCTIVE_ANNOTATIONS → lead tags and list folders (see below)

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
 * (not destructive). https://developers.openai.com/apps-sdk/reference
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

/**
 * Lead tags and list folders. OpenAI's MCP scan (2026-10-02) held these tools
 * with `openWorldHint: false`, saying they interact with an external system.
 * The other private-workspace tools passed the same scan unchanged.
 */
export const TEAM_SHARED_WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const

export const TEAM_SHARED_DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: true,
} as const

/**
 * Report-API-Feedback. Records a free, non-billable feedback note about the
 * Hunter API/tools. Not read-only (it writes a feedback row) and not destructive
 * (it never touches user data). Open-world: OpenAI's MCP scan (2026-10-02) held
 * it with `openWorldHint: false`, because the note goes to Hunter's team.
 */
export const FEEDBACK_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const

/**
 * RFC 1035-shaped hostname regex used to validate the primary `domain` input
 * on Email-Count. Rejects non-domain payloads (control chars, newlines,
 * free-form prose, "ignore prior instructions" strings) so they can't ride
 * into the Hunter link or the model-only content block.
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
 * Path of the Hunter Domain Search page for a domain. Email-Count and
 * Count-Company-Emails return counts only; this page is where the user sees the
 * addresses (HUN-23709). A logged-out visitor is redirected to the public
 * `/try/search/<domain>` page.
 */
export function hunterDomainSearchPath(domain: string): string {
  return `/search/${encodeURIComponent(domain)}`
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
