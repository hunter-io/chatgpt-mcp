import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  BILLABLE_LOOKUP_ANNOTATIONS,
  HUNTER_SOURCE_SUFFIX,
  type McpTextResult,
  READ_ONLY_PUBLIC_ANNOTATIONS,
  TOOL_NAMES,
  type VerificationDecision,
  advanceLoop,
  buildNextAction,
  callHunterApi,
  carryLoopFilters,
  domainStringSchema,
  embedNextAction,
  loopRecoveryAction,
  parseHunterApiData,
  pendingCompaniesSchema,
  requireBulkConsent,
  sanitizeUpstreamMessage,
} from "../helpers"
import {
  approvalRequiredShape,
  buildResponseSchema,
  errorSchema,
  hunterUrl,
  nextActionSchema,
  nullableBoolean,
  nullableNumber,
  nullableString,
  paginationMetaSchema,
  verificationSchema,
} from "../schemas/common"

// The email-entry sub-shape `shouldVerify` reads. Mirrors `emailEntrySchema`
// below (the wire shape from app/app/views/api/domain_search/show.json.jbuilder),
// but typed loosely here because `firstEmailEntry` returns the raw parsed object
// — the predicate only inspects `verification.status` + `confidence`, both of
// which Rails always emits on every entry (verification is present-with-null-
// leaves; see the jbuilder note on `emailEntrySchema`).
interface DomainSearchEmailEntry {
  value?: string
  confidence?: number
  // Per-email accept_all is rare on Domain-Search (it's a domain-level signal),
  // but Hunter occasionally tags an individual entry; honour it if present.
  accept_all?: boolean
  verification?: { status?: string | null; date?: string | null }
}

interface DomainSearchData {
  emails?: Array<DomainSearchEmailEntry>
  // Domain-level catch-all flag. When true, the MX accepts every mailbox, so a
  // re-verify of any single address would just echo `accept_all` and burn a
  // billable verification — `shouldVerify` reads this via the `domainAcceptAll`
  // param to suppress the wasteful re-check.
  accept_all?: boolean
}

interface EmailVerifierData {
  status?: string
  email?: string
}

// Shared skip-verify trust band. Domain-Search already returned a verification
// for this email; re-running Email-Verifier is only worth a billable credit when
// that prior verification is NOT trustworthy. We treat status === "valid" with a
// confidence at/above this threshold as trustworthy and skip the re-verify.
//
// 90 matches the recovery resource's "use directly" confidence band (the
// `capabilities-recovery.ts` guidance tells the model a ≥90 score is safe to use
// as-is). Keep the two in lockstep — if one moves, move the other. The constant
// lives OUTSIDE any byte-locked region (search.ts is chatgpt-only), so it's a
// single-file change here.
export const CONFIDENCE_SKIP_THRESHOLD = 90

// Statuses Domain-Search can carry on an email entry's `verification.status`.
// Used by `shouldVerify` to fail OPEN (re-verify) on any value outside this set
// — an unknown/garbage status must never let an unverified email slip past the
// Email-Verifier gate. `null` (the dominant case: no fresh EmailVerification row)
// is intentionally NOT in this set, so the predicate falls through to "verify".
const KNOWN_VERIFICATION_STATUSES = new Set(["valid", "invalid", "accept_all", "webmail", "disposable", "unknown"])

/**
 * Deterministic, server-side decision: does this Domain-Search email entry still
 * need an Email-Verifier round-trip before we trust it?
 *
 * SKIP (return false) only when the email is already trustworthy as-returned:
 *   - `verification.status === "valid"` AND `confidence >= CONFIDENCE_SKIP_THRESHOLD`
 *     → Domain-Search already has a fresh, high-confidence verification (the
 *       server only emits a non-null status when an EmailVerification row exists
 *       and is < 1 month old, so there's no date-freshness arm to check here —
 *       Rails already enforced it).
 *   - `accept_all` (per-email OR the domain-level `domainAcceptAll`) → a
 *     re-verify would just return `accept_all` again and is billable; surface it
 *     as-is instead of re-charging.
 *   - `invalid` → no point re-verifying a known-bad address; surface/drop it per
 *     the caller's "verified only" rule.
 *
 * VERIFY (return true) for everything else, including the dominant case where
 * `verification.status` is `null` (no fresh EmailVerification row), and for any
 * unknown/out-of-range status (fail open — defense-in-depth). `confidence` is
 * schema-bounded 0–100 so no range guard is needed there.
 */
export function shouldVerify(entry: DomainSearchEmailEntry, opts: { domainAcceptAll?: boolean }): boolean {
  const status = entry.verification?.status ?? null

  // accept_all (either level) → surface without a wasteful re-verify.
  if (entry.accept_all === true || opts.domainAcceptAll === true || status === "accept_all") return false

  // Known-bad → no re-verify.
  if (status === "invalid") return false

  // Already fresh-valid AND high-confidence → trust Domain-Search's verification.
  if (status === "valid" && (entry.confidence ?? 0) >= CONFIDENCE_SKIP_THRESHOLD) return false

  // Everything else (null status — the majority — plus low-confidence valid and
  // any unknown/out-of-range status) falls open to a verify.
  if (status !== null && !KNOWN_VERIFICATION_STATUSES.has(status)) {
    console.warn(`shouldVerify: unknown verification.status "${status}" — failing open to verify`)
  }
  return true
}

// Three-way verification routing decision (HUN-20651 review fix A). `shouldVerify`
// answers a single question — "does this email still need an Email-Verifier
// round-trip?" — and collapses TWO very different skip reasons into one `false`:
//
//   1. fresh valid + high confidence  → trustworthy, USE it (save / include)
//   2. accept_all OR invalid          → re-verify is pointless AND billable, but
//                                        the address is NOT trustworthy to save
//
// Routing on the boolean alone is the bug: in SAVE mode `!shouldVerify` short-
// circuited past Email-Verifier straight into Create-Lead-If-Missing for case 2,
// so an accept_all/invalid FIRST contact got SAVED — whereas the old verify path
// only ever saved on Email-Verifier `status === "valid"`. Splitting the skip into
// two outcomes lets the handler save case 1, DROP case 2 (advance the loop /
// complete without writing), and verify everything else.
//
// The `VerificationDecision` union is declared in helpers.ts (so `advanceLoop`
// can take it without a circular import) and re-exported here next to its
// producer (it's imported as a type above).
export type { VerificationDecision }

/**
 * Maps a Domain-Search email entry to one of three routing outcomes:
 *
 *   - `"skip_and_use"`  — fresh `valid` + confidence ≥ threshold. Trust Domain-
 *     Search's verification: skip Email-Verifier AND (in save mode) save it /
 *     (in research mode) include it. This wins over a domain-level catch-all flag —
 *     a per-email `valid` is an authoritative positive verification of THIS address.
 *   - `"skip_and_drop"` — per-email `accept_all`/`invalid`, OR a domain-level
 *     catch-all with no per-email `valid`. Re-verifying just echoes the same non-
 *     saveable status and burns a billable credit, so we skip the re-verify — but
 *     the address is NOT trustworthy to save, so save mode must NOT create a lead
 *     for it (drop / surface only).
 *   - `"verify"`        — everything else (the dominant null-status case, low-
 *     confidence valid, and any unknown/out-of-range status → fail open).
 *
 * This is the authoritative router for the save/research terminals. `shouldVerify`
 * is retained for the `verification_source` provenance marker only (where both
 * skip kinds are correctly "trusted as Domain-Search returned it" =
 * "domain_search"), so the two stay consistent: `verificationDecision !== "verify"`
 * iff `shouldVerify === false`.
 */
export function verificationDecision(
  entry: DomainSearchEmailEntry,
  opts: { domainAcceptAll?: boolean },
): VerificationDecision {
  const status = entry.verification?.status ?? null

  // Per-email definitive non-saveable signals first: a known-bad address, or one
  // that is ITSELF catch-all (the per-email `accept_all` field or `status:
  // accept_all`). Re-verify is wasteful and the address isn't trustworthy → drop.
  if (status === "invalid") return "skip_and_drop"
  if (entry.accept_all === true || status === "accept_all") return "skip_and_drop"

  // Fresh per-email valid + high confidence → trust it as returned (skip verify AND
  // use) — even when the DOMAIN is catch-all. A stored `valid` status (not
  // `accept_all`) is an independent positive verification of THIS address, and the
  // product treats per-email verification as authoritative, falling back to the
  // domain-level catch-all flag only when no per-email verification exists
  // (app/app/views/api/domain_search/_emails.haml). Checking this BEFORE the
  // domain-level drop keeps a deliverable contact saveable.
  if (status === "valid" && (entry.confidence ?? 0) >= CONFIDENCE_SKIP_THRESHOLD) return "skip_and_use"

  // Domain-level catch-all with no definitive per-email valid: a re-verify would
  // just echo accept_all and burn a credit, and the address isn't trustworthy to
  // save → skip the re-verify but drop it from the save path.
  if (opts.domainAcceptAll === true) return "skip_and_drop"

  // Null status (majority), low-confidence valid, unknown/out-of-range → verify.
  return "verify"
}

// ─── Output schemas (co-located with handlers) ───────────────────────────────

// Hunter domain-search emit shape from app/app/views/api/domain_search/.
// .loose() at envelope level; leaf is strict.
const emailEntrySchema = z
  .object({
    value: z.string(),
    type: z.string().optional(),
    confidence: z.number().int().min(0).max(100).optional(),
    first_name: nullableString().optional(),
    last_name: nullableString().optional(),
    position: nullableString().optional(),
    seniority: nullableString().optional(),
    department: nullableString().optional(),
    linkedin: nullableString().optional(),
    twitter: nullableString().optional(),
    phone_number: nullableString().optional(),
    verification: verificationSchema.optional(),
    sources: z.array(z.unknown()).optional(),
    // Per-row provenance marker the handler stamps on (HUN-20651 Phase 1):
    // "domain_search" = trusted as Domain-Search returned it (skip-verify);
    // "email_verifier" = still needs / will get an Email-Verifier round-trip.
    // Server-emitted only — never read off the wire.
    verification_source: z.enum(["domain_search", "email_verifier"]).optional(),
  })
  .loose()

const domainSearchDataSchema = z
  .object({
    domain: z.string(),
    disposable: z.boolean().optional(),
    webmail: z.boolean().optional(),
    accept_all: z.boolean().optional(),
    pattern: nullableString().optional(),
    organization: nullableString().optional(),
    country: nullableString().optional(),
    state: nullableString().optional(),
    emails: z.array(emailEntrySchema),
  })
  .loose()

// `app/views/api/email_finder/show.json.jbuilder` emits `linkedin_url` (not
// `linkedin` like Domain-Search's emailEntrySchema). The Ruby attribute
// `@result.linkedin` is incidental — the wire key is what matters.
const emailFinderDataSchema = z
  .object({
    first_name: nullableString().optional(),
    last_name: nullableString().optional(),
    email: nullableString(),
    score: nullableNumber(),
    domain: z.string().optional(),
    // `accept_all` is sourced from `@result&.accept_all` and the Rails jbuilder
    // ALWAYS emits the key — it is `null` on a not-found / inconclusive-
    // verification result. `.optional()` permits a missing key but rejects
    // `null`, so the MCP SDK threw -32602 and Claude looped retrying. Accept
    // null. (HUN-20344)
    accept_all: nullableBoolean().optional(),
    position: nullableString().optional(),
    twitter: nullableString().optional(),
    linkedin_url: nullableString().optional(),
    phone_number: nullableString().optional(),
    company: nullableString().optional(),
    sources: z.array(z.unknown()).optional(),
    verification: verificationSchema.optional(),
  })
  .loose()

const emailVerifierDataSchema = z
  .object({
    status: z.string(),
    result: z.string().optional(),
    score: nullableNumber(),
    email: z.string(),
    regexp: z.union([z.boolean(), z.null()]).optional(),
    gibberish: z.union([z.boolean(), z.null()]).optional(),
    disposable: z.union([z.boolean(), z.null()]).optional(),
    webmail: z.union([z.boolean(), z.null()]).optional(),
    mx_records: z.union([z.boolean(), z.null()]).optional(),
    smtp_server: z.union([z.boolean(), z.null()]).optional(),
    smtp_check: z.union([z.boolean(), z.null()]).optional(),
    accept_all: z.union([z.boolean(), z.null()]).optional(),
    block: z.union([z.boolean(), z.null()]).optional(),
    sources: z.array(z.unknown()).optional(),
  })
  .loose()

const emailCountDataSchema = z
  .object({
    total: z.number().int().nonnegative(),
    personal_emails: z.number().int().nonnegative().optional(),
    generic_emails: z.number().int().nonnegative().optional(),
    department: z.object({}).loose().optional(),
    seniority: z.object({}).loose().optional(),
  })
  .loose()

// Domain-Search can return two shapes:
//   1. Normal Hunter API response — `{ data, meta, viewInHunter?, nextAction? }`
//   2. Approval-required short-circuit (HUN-20170-v3 Phase 1.1c) — fires when
//      `pending_companies` is set without `confirmed_credit_use: true`. No
//      Hunter API call happens; structuredContent carries `kind:
//      "approval_required"` + the bulk credit-cost estimate, and `nextAction`
//      is an `ask_user`.
// Both shapes coexist in one outputSchema with `data` optional and a `kind`
// discriminator; cleaner than a top-level union (Zod top-level union is
// dropped by the MCP SDK's normalizeObjectSchema — see schemas/common.ts:40).
//
// HUN-20651 review fix D: this custom schema MIRRORS the bulk-consent short-
// circuit shape but originally OMITTED the error/ack envelope that `callHunterApi`
// still emits on 4xx/5xx (and 202/204). Because `registerTool` publishes
// `.shape` (which the SDK re-wraps as a FRESH `additionalProperties: false`
// object — the `.loose()` is dropped), a Domain-Search 4xx/5xx `{ error }`
// envelope landed as an UNDECLARED top-level key and a schema-validating client
// rejected it with -32602. So every synthesised top-level key the standard
// `buildResponseSchema` declares must be declared here too: `error`, the flat
// ack fields (`kind:"ack"`, `status`, `message`), alongside the approval-required
// `kind:"approval_required"` + `estimated_credits`. `kind` accepts BOTH literals.
const domainSearchOutputSchema = z
  .object({
    data: domainSearchDataSchema.optional(),
    meta: paginationMetaSchema.optional(),
    viewInHunter: hunterUrl.optional(),
    nextAction: nextActionSchema.optional(),
    // 4xx/5xx envelope (callHunterApi → `{ error }`, isError:true). Was missing.
    error: errorSchema.optional(),
    // Discriminator: "approval_required" (bulk-consent short-circuit) OR "ack"
    // (callHunterApi's synthesised 202/204 acknowledgement). Both must validate.
    // `kind` + `estimated_credits` come from the shared `approvalRequiredShape`
    // (HUN-20651 review fix N) so the three approval-emitting tools (Domain-Search,
    // Email-Verifier, Create-Lead-If-Missing) declare them identically.
    ...approvalRequiredShape,
    ok: z.literal(true).optional(),
    // Flat ack envelope fields (202/204 path), matching buildResponseSchema.
    status: z.number().int().optional(),
    message: z.string().optional(),
  })
  .loose()
const emailFinderOutputSchema = buildResponseSchema(emailFinderDataSchema)
// Email-Verifier can now short-circuit with the bulk-consent approval_required
// envelope (HUN-20651 review fixes J/O), so its published schema must declare
// `kind: "approval_required"` + `estimated_credits` on top of the standard
// `{ data, meta, error, ack }` envelope — otherwise the closed (.shape-rewrapped)
// schema rejects the approval prompt with -32602 (review fix N). `.extend` with
// the shared `approvalRequiredShape` overrides `buildResponseSchema`'s
// `kind: z.literal("ack")` with the union (which still admits "ack").
const emailVerifierOutputSchema = buildResponseSchema(emailVerifierDataSchema).extend(approvalRequiredShape)
const emailCountOutputSchema = buildResponseSchema(emailCountDataSchema)

/**
 * Returns the first email ENTRY (the full object with `verification` +
 * `confidence`), not just its string value, so the handler can run
 * `shouldVerify` on it. The string is still reachable via `.value`. Returns
 * `null` when there's no usable entry.
 *
 * Changed from the prior `firstEmailValue` (string-only) in HUN-20651 Phase 1:
 * conditional verification needs the entry-level `verification.status` and
 * `confidence`, which the bare string threw away.
 */
function firstEmailEntry(data: DomainSearchData | null): DomainSearchEmailEntry | null {
  if (!data || !Array.isArray(data.emails)) return null
  for (const entry of data.emails) {
    if (entry && typeof entry.value === "string" && entry.value.length > 0) {
      return entry
    }
  }
  return null
}

/**
 * Tags every Domain-Search email row with a `verification_source` marker so the
 * model knows which rows were trusted as Domain-Search returned them vs which
 * still need (or will get) an Email-Verifier round-trip — without re-inferring
 * trust from prose. `"domain_search"` = `shouldVerify` said skip (fresh-valid +
 * high-confidence, or accept_all/invalid); `"email_verifier"` = everything that
 * still warrants a check.
 *
 * Re-serializes `content[0]` from the mutated structuredContent and re-runs
 * `sanitizeUpstreamMessage` — same invariant `minimizeResponseData` /
 * `stripResponseFields` honour, because we discard `callHunterApi`'s original
 * text and build a fresh one. No-ops on errors and on responses with no emails.
 */
function annotateVerificationSource(
  result: McpTextResult,
  data: DomainSearchData | null,
  domainAcceptAll: boolean,
): McpTextResult {
  if (result.isError) return result
  const sc = result.structuredContent as { data?: { emails?: unknown[] } } | undefined
  const emails = sc?.data?.emails
  if (!data || !Array.isArray(emails) || emails.length === 0) return result

  const annotatedEmails = emails.map((row, i) => {
    if (row == null || typeof row !== "object") return row
    const entry = data.emails?.[i] ?? (row as DomainSearchEmailEntry)
    const verification_source: "domain_search" | "email_verifier" = shouldVerify(entry, { domainAcceptAll })
      ? "email_verifier"
      : "domain_search"
    return { ...(row as Record<string, unknown>), verification_source }
  })

  const annotatedStructured = { ...sc, data: { ...sc?.data, emails: annotatedEmails } }
  const rawText = `${JSON.stringify(annotatedStructured)}${HUNTER_SOURCE_SUFFIX}`
  return {
    ...result,
    content: [
      { ...result.content[0], type: "text" as const, text: sanitizeUpstreamMessage(rawText, Number.POSITIVE_INFINITY) },
    ],
    structuredContent: annotatedStructured,
  }
}

export function registerSearchTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.domainSearch,
    {
      description:
        "Use this when the user wants the contacts published for a domain — emails with names, positions, and confidence scores. Optional filters: type, seniority, department, required field. Uses Hunter credits: 1 credit per 10 emails returned (rounded up), charged only when emails are found. Do not use this for personal/webmail domains (gmail.com, yahoo.com, etc.) — results will be empty.",
      inputSchema: {
        domain: domainStringSchema.describe("Domain name to find data for"),
        limit: z.number().optional().describe("Maximum number of email addresses to return"),
        offset: z.number().optional().describe("Number of email addresses to skip"),
        type: z.enum(["personal", "generic"]).optional().describe("Type of email addresses to return"),
        seniority: z
          .string()
          .optional()
          .describe(
            "Filter by seniority level. Values: junior, senior, executive. Supports comma-separated multi-values (e.g. 'senior,executive')",
          ),
        department: z
          .string()
          .optional()
          .describe(
            "Filter by department. Values: executive, it, finance, management, sales, legal, support, hr, marketing, communication, education, design, health, operations. Supports comma-separated multi-values (e.g. 'sales,marketing')",
          ),
        required_field: z
          .enum(["full_name", "position", "phone_number"])
          .optional()
          .describe("Only return results where this field has a value"),
        pending_companies: pendingCompaniesSchema,
        confirmed_credit_use: z
          .boolean()
          .optional()
          .describe(
            "Bulk credit-consent flag for the GATHER (return-results-only) batch. Set true after the user has approved the upfront credit estimate for a multi-company prospecting batch. Required when `pending_companies` is non-empty and you are NOT saving; otherwise the server returns an ask_user with the credit-cost summary and does NOT call Hunter. Single-company calls (no pending_companies) ignore this flag.",
          ),
        confirmed_save_use: z
          .boolean()
          .optional()
          .describe(
            "Bulk credit-consent flag for the SAVE batch (search + deliverability check + lead creation). Set true ONLY after the user approved the higher save-batch estimate, and only when `save_leads` is true with a non-empty `pending_companies`. A gather-batch approval does NOT cover saving: if `save_leads` is true but this flag is missing, the server returns an ask_user with the save-cost summary and does NOT call Hunter or write any lead. Carried forward through the loop automatically once set.",
          ),
        save_leads: z
          .boolean()
          .optional()
          .describe(
            "Research-vs-save mode for the prospecting loop. Leave UNSET (the default) to return results for review only — the loop advances company-to-company and renders a table, writing nothing. Set true ONLY when the user explicitly asked to save/add the contacts to their Hunter leads — then the loop ends each company by creating a lead (existing leads are never overwritten). Decide this once on the first call from the user's request; do not flip it mid-loop. A request for 'leads' on its own is not a request to save. The coordinator (Plan-Prospecting-Flow) resolves this from the brief and carries it forward; pass it through verbatim from the prior tool's chained suggestedArgs.",
          ),
        leads_list_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "Loop carry: when the user asked to save the contacts into a specific list, this is that list's id. Domain-Search does not use it; it is forwarded through the chain so the saved leads land in the intended list. Pass it through verbatim from the prior tool's chained suggestedArgs.",
          ),
      },
      outputSchema: domainSearchOutputSchema.shape,
      annotations: { ...BILLABLE_LOOKUP_ANNOTATIONS, title: "Find Emails By Domain" },
    },
    async ({
      domain,
      limit,
      offset,
      type,
      seniority,
      department,
      required_field,
      pending_companies,
      confirmed_credit_use,
      confirmed_save_use,
      save_leads,
      leads_list_id,
    }) => {
      // Server-side bulk credit-consent gate. Short-circuits with an ask_user
      // nextAction when the user is in a multi-company prospecting loop
      // (`pending_companies` non-empty) and hasn't yet approved the credit
      // estimate. Single-company calls ignore the flag and proceed. Subsequent
      // chained Domain-Search calls inside the same bulk session carry
      // `confirmed_credit_use: true` through `carryLoopFilters` so the guard
      // fires exactly once at the start of the loop. See `requireBulkConsent`
      // in helpers.ts for the contract a future bulk-eligible tool must honor.
      //
      // The message is user-facing (the prospecting directive instructs the
      // model to relay the ask_user question verbatim). Keep it free of
      // implementation jargon — no flag names, no "Domain-Search call", no
      // "authorize the batch". The model already knows from Plan-Prospecting-
      // Flow's directive that approval means re-issuing with
      // `confirmed_credit_use: true`.
      // Research vs. save mode (HUN-20651 Phase 2). Research is the default and
      // the load-bearing safety property: a wrong guess toward research only
      // yields a table the user can then save, whereas a wrong guess toward save
      // writes unrequested data. The coordinator resolves the mode from the brief
      // and carries `save_leads` through the loop; the handler only branches on it.
      const isResearch = save_leads !== true

      const totalCompanies = 1 + (pending_companies?.length ?? 0) // this domain + remaining picks
      // Bucket-agnostic credit copy (HUN-20651 Phase 1+2): legacy dual-bucket plans
      // and unified plans charge from different pools, so we describe WHEN credits
      // are spent (per company searched) rather than a per-plan fraction that would
      // be wrong for one of them. The gate fires once per loop in BOTH modes —
      // Domain-Search itself spends a credit per company regardless of mode — but
      // the copy diverges: research mode does NOT auto-run deliverability checks
      // (decision #2: verification is tied to lead creation), so it must not
      // promise (and charge for) verification the loop won't do. No "saved
      // contact" language in research copy. "up to" framing because not every
      // company necessarily returns billable emails.
      const consentSummary = isResearch
        ? `This will search up to ${totalCompanies} companies for published contacts, using Hunter credits for each. ` +
          `Approve to continue?`
        : `This will search up to ${totalCompanies} companies and check deliverability for the emails it finds before ` +
          `saving them, using Hunter credits for each. Approve to continue?`
      const consentGuard = requireBulkConsent(
        pending_companies,
        confirmed_credit_use,
        consentSummary,
        {
          search: totalCompanies,
          // Research mode doesn't auto-verify, so the upfront verification estimate
          // is 0; save mode estimates up to one verification per company.
          verification: isResearch ? 0 : totalCompanies,
        },
        // Mode-binding (review fix B): in save mode the gate requires the
        // SAVE-scoped consent token, so a research-scoped approval carried in
        // can't authorize the (higher) save cost — it re-fires with the save
        // estimate above.
        { saveLeads: !isResearch, confirmedSave: confirmed_save_use },
      )
      if (consentGuard) return consentGuard

      // Self-reference guard: drop the current domain from the loop carry so
      // the chain doesn't re-enter DS for the same company after saving its
      // lead. Dedup + lowercase normalization is handled by `pendingCompaniesSchema`'s
      // .transform() (entries arrive already-lowercased), so we only need to
      // compare against `domain.toLowerCase()` here to catch case-mixed
      // self-references like domain="Stripe.com" + pending=["stripe.com"].
      const domainLower = domain.toLowerCase()
      const cleanedPending = pending_companies && pending_companies.filter((d) => d !== domainLower)

      const params: Record<string, string> = { domain }
      if (limit !== undefined) params.limit = String(limit)
      if (offset !== undefined) params.offset = String(offset)
      if (type) params.type = type
      if (seniority) params.seniority = seniority
      if (department) params.department = department
      if (required_field) params.required_field = required_field
      const result = await callHunterApi({ path: "/domain-search", apiKey, baseUrl, params })
      if (result.isError) {
        if (cleanedPending !== undefined && cleanedPending.length > 0) {
          return loopRecoveryAction(result, cleanedPending, `Hunter API error on ${domain}`)
        }
        return result
      }

      const dsData = parseHunterApiData<DomainSearchData>(result)
      const domainAcceptAll = dsData?.accept_all === true
      const entry = firstEmailEntry(dsData)
      const email = entry?.value ?? null

      // Annotate every returned row with its verification provenance so the model
      // can render a "Verified" status column without re-inferring trust from
      // prose: rows whose Domain-Search verification we trust as-is are tagged
      // "domain_search"; rows that still need (or will get) an Email-Verifier
      // round-trip are tagged "email_verifier". Machine channel only
      // (structuredContent), per HUN-20651 Phase 1.
      const annotatedResult = annotateVerificationSource(result, dsData, domainAcceptAll)

      // Conditional verification (HUN-20651 Phase 1 + review fix A): map the
      // chosen email to a THREE-way routing decision, not a skip/verify boolean.
      //   - "skip_and_use"  : fresh valid + high confidence → trust as-is (save /
      //                        include, skip Email-Verifier).
      //   - "skip_and_drop" : accept_all/invalid → re-verify is pointless AND the
      //                        address is not trustworthy to save, so save mode
      //                        must NOT create a lead from it (advance / surface).
      //   - "verify"        : everything else (the dominant null-status case).
      // The old `!shouldVerify` boolean collapsed the first two outcomes, so an
      // accept_all/invalid first contact slipped into Create-Lead-If-Missing in
      // save mode. Routing on the decision keeps the old contract (save only the
      // valid+high-confidence case) intact.
      const decision: VerificationDecision = entry ? verificationDecision(entry, { domainAcceptAll }) : "verify"

      if (cleanedPending !== undefined) {
        // Multi-company loop. Forward DS filters (seniority, department, etc.) and
        // the mode flag through the chain so they apply at every company, not just
        // the seed call. `confirmed_credit_use: true` propagates so subsequent
        // Domain-Search calls don't re-trigger the consent guard
        // (HUN-20170-v3 Phase 1.1c/1.1d). `save_leads` carries the
        // coordinator-resolved mode (HUN-20651 Phase 2) — `carryLoopFilters` only
        // forwards it when true, so research loops never accumulate it.
        //
        // `advanceLoop` owns the mode branch: research advances Domain-Search →
        // next Domain-Search (rendering a table at the end and writing nothing);
        // save chains into Email-Verifier / Create-Lead-If-Missing (create-only
        // terminal). The handler has already done self-reference dedup and
        // error-recovery above, so `advanceLoop` only sees the cleaned slice.
        return advanceLoop(
          annotatedResult,
          cleanedPending,
          {
            limit,
            type,
            seniority,
            department,
            required_field,
            confirmed_credit_use: true,
            // Save-scoped consent carry (review fix B + bot follow-up). Forward the
            // ACTUAL `confirmed_save_use` rather than a hardcoded `true`: we only
            // reach here past the mode-bound `requireBulkConsent`, so in a legitimate
            // save loop it is already `true` and the carry forwards it unchanged —
            // but hardcoding `true` would defeat `advanceLoop`'s `saveGate`
            // defense-in-depth (it re-attaches `requiresConfirmation` only when
            // `confirmed_save_use !== true`). Passing the real value keeps that
            // backstop live; `carryLoopFilters` still drops it unless `save_leads`
            // is also true, so research loops never carry it.
            confirmed_save_use,
            save_leads,
            // Destination-list carry (HUN-20651 review fix M). Forwarded through
            // the loop so the chained Create-Lead-If-Missing saves into the
            // intended list; `carryLoopFilters` only forwards it when present, so
            // research loops (which never set it) stay unaffected.
            leads_list_id,
          },
          {
            domain,
            email,
            decision,
            reasons: {
              save: "Domain-Search already verified this contact; saving without a redundant re-check.",
              verify: "Verify deliverability before saving (multi-company loop).",
              advanceNoEmail: `No contacts at ${domain}; continuing loop with next picked company.`,
              advanceDrop: `Contact found at ${domain} but not saved (email was accept_all/invalid); continuing loop with next picked company.`,
              advanceResearch: `Collected contacts for ${domain}; continuing to the next picked company.`,
            },
            summaries: {
              loopComplete: `No contacts found for ${domain}. Multi-company loop complete.`,
              dropComplete: `Contact found at ${domain} but not saved (email was accept_all/invalid). Multi-company loop complete.`,
              researchComplete:
                "All picked companies searched. Render the collected contacts as a table (one row per email: " +
                "name, position, email, verification status). Offer to save them to Hunter leads if the user wants.",
            },
          },
        )
      }

      // ── Single-company mode (no `pending_companies`) ──────────────────────────
      if (!email) {
        return embedNextAction(
          annotatedResult,
          buildNextAction({
            kind: "complete",
            summary: `No contacts found for ${domain}.`,
          }),
        )
      }

      // Research mode (default): return the row(s) as a table; never verify or
      // save. This is the single-company counterpart to the loop's research
      // terminal — and it has NO per-email gate (decision #2: verification is
      // tied to lead creation, which research doesn't do).
      if (isResearch) {
        return embedNextAction(
          annotatedResult,
          buildNextAction({
            kind: "complete",
            summary:
              `Found contacts for ${domain}. Render them as a table (name, position, email, verification status). ` +
              "Offer to save them to Hunter leads if the user wants.",
          }),
        )
      }

      // Save mode, single company, accept_all/invalid (review fix A): the address
      // is not trustworthy to save and re-verifying just echoes the same status —
      // so DON'T create a lead. Surface the row (its verification_source marker is
      // already stamped) and complete; the user can act on it explicitly.
      if (decision === "skip_and_drop") {
        return embedNextAction(
          annotatedResult,
          buildNextAction({
            kind: "complete",
            summary:
              `The best contact found for ${domain} is not confirmed deliverable (catch-all or invalid), so it was not ` +
              "saved. Showing it in a table; the user can choose whether to save it.",
          }),
        )
      }

      // Save mode, single company, skip_and_use: route past Email-Verifier to the
      // create-only save terminal. The per-email confirmation gate still belongs
      // here (single-company save has no bulk consent — see needsGate below), so
      // we keep it; we just skip the redundant re-verify. Forward `leads_list_id`
      // (HUN-20651 review fix S) so the saved lead lands in the intended list
      // instead of unlisted — exactly as the multi-company carry does. `save_leads`
      // is not forwarded here because this terminal IS the save terminal
      // (Create-Lead-If-Missing); the chain ends, so there's no downstream hop to
      // tell the mode to.
      if (decision === "skip_and_use") {
        return embedNextAction(
          annotatedResult,
          buildNextAction({
            kind: "call_tool",
            tool: TOOL_NAMES.createLeadIfMissing,
            reason: "Domain-Search already verified this contact; saving without a redundant re-check.",
            suggestedArgs: leads_list_id !== undefined ? { email, leads_list_id } : { email },
            requiresConfirmation: true,
          }),
        )
      }

      // Save mode, single company, needs verify. The per-email confirmation gate
      // (`requiresConfirmation`) belongs on EVERY single-company save (review fix
      // C): a single-company call has no `pending_companies` batch, so
      // `requireBulkConsent` never ran and no bulk consent covers this spend. The
      // input contract is explicit that single-company calls IGNORE
      // `confirmed_credit_use`, so we must NOT let a carried-in flag suppress this
      // gate. Only the bulk loop suppresses the per-email gate, and it does so
      // inside `advanceLoop` (which emits no `requiresConfirmation`) because the
      // upfront bulk consent already covered the whole batch.
      //
      // Forward `save_leads: true` (HUN-20651 review fix R) so the chained
      // Email-Verifier stays in SAVE mode and chains on to Create-Lead-If-Missing
      // on a valid result. Without it, EV defaults to research (`save_leads !==
      // true`) and would just report the status, NEVER creating the lead the user
      // asked to save. Also forward `leads_list_id` (review fix S) so the lead the
      // verified-then-saved contact creates lands in the intended list. This makes
      // the single-company save handoff carry the same mode + destination fields
      // the multi-company `advanceLoop` already forwards.
      return embedNextAction(
        annotatedResult,
        buildNextAction({
          kind: "call_tool",
          tool: TOOL_NAMES.emailVerifier,
          reason: "Verify deliverability before saving.",
          suggestedArgs:
            leads_list_id !== undefined ? { email, save_leads: true, leads_list_id } : { email, save_leads: true },
          requiresConfirmation: true,
        }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.emailFinder,
    {
      description:
        "Use this when the user wants a specific person's email address at a company. Provide the person's full name and the company's domain. Returns only found addresses backed by public sources; when Hunter has only an inferred address, it returns not found. Uses Hunter credits, charged only when an email is found. Do not use this when the user already has the email and only wants to confirm it works — call Email-Verifier instead.",
      inputSchema: {
        full_name: z.string().min(1).max(200).describe("Full name of the person to find the email address for"),
        domain: domainStringSchema.describe("Domain name to find the person's email address for"),
      },
      outputSchema: emailFinderOutputSchema.shape,
      annotations: { ...BILLABLE_LOOKUP_ANNOTATIONS, title: "Find Person Email" },
    },
    async ({ full_name, domain }) => {
      return callHunterApi({ path: "/email-finder/found", apiKey, baseUrl, params: { full_name, domain } })
    },
  )

  server.registerTool(
    TOOL_NAMES.emailVerifier,
    {
      description:
        "Use this when the user wants to check whether an email address is deliverable. Returns a status (valid, invalid, accept_all, etc.) and a confidence score. Uses Hunter credits, charged only for valid, invalid, or accept_all results. Do not use this on role/group addresses (info@, support@, etc.) — deliverability of role addresses is not meaningful and the result will typically be accept_all.",
      inputSchema: {
        email: z.string().email().max(254).describe("Email address to verify"),
        pending_companies: pendingCompaniesSchema,
        // Domain-Search filter carry: not used by Email-Verifier itself, only
        // forwarded to the next chained call so filters survive the full loop.
        limit: z.number().optional().describe("Loop carry: forwarded from Domain-Search."),
        type: z.enum(["personal", "generic"]).optional().describe("Loop carry: forwarded from Domain-Search."),
        seniority: z.string().optional().describe("Loop carry: forwarded from Domain-Search."),
        department: z.string().optional().describe("Loop carry: forwarded from Domain-Search."),
        required_field: z
          .enum(["full_name", "position", "phone_number"])
          .optional()
          .describe("Loop carry: forwarded from Domain-Search."),
        confirmed_credit_use: z
          .boolean()
          .optional()
          .describe("Loop carry: forwarded from Domain-Search bulk credit-consent guard."),
        confirmed_save_use: z
          .boolean()
          .optional()
          .describe("Loop carry: forwarded from Domain-Search save-batch credit-consent guard."),
        save_leads: z
          .boolean()
          .optional()
          .describe(
            "Loop carry: forwarded from Domain-Search. Email-Verifier is only reached in save mode, so this is forwarded so the next chained Domain-Search keeps the same mode.",
          ),
        leads_list_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "Loop carry: forwarded from Domain-Search. The destination list id for the save loop; Email-Verifier does not use it, only forwards it so the chained Create-Lead-If-Missing saves into the intended list.",
          ),
      },
      outputSchema: emailVerifierOutputSchema.shape,
      annotations: { ...BILLABLE_LOOKUP_ANNOTATIONS, title: "Verify Email" },
    },
    async ({
      email,
      pending_companies,
      limit,
      type,
      seniority,
      department,
      required_field,
      confirmed_credit_use,
      confirmed_save_use,
      save_leads,
      leads_list_id,
    }) => {
      // Research-vs-save mode (HUN-20651 review fix K). Email-Verifier is reached
      // automatically only on a SAVE-mode loop's verify step, but a model can also
      // call it directly (e.g. a "verified contacts" brief). It must honor the mode
      // the same way Domain-Search does: in research mode a valid result must NOT
      // chain to Create-Lead-If-Missing — that would leak a write the gather-only
      // flow forbids. `save_leads !== true` ⇒ research (the default).
      const isResearch = save_leads !== true

      // Bulk-entry consent gate (HUN-20651 review fixes J + O). Email-Verifier
      // accepts `pending_companies` as a loop carry, so a model could invoke it
      // DIRECTLY as a bulk entry point without arriving from a consented
      // Domain-Search handoff. In that case no `requireBulkConsent` ran and
      // Email-Verifier would spend a verification credit (and, in save mode,
      // continue into Create-Lead-If-Missing) before any approval. Per the
      // `requireBulkConsent` contract, a pending-accepting tool MUST gate at
      // handler-top. We delegate the whole mode-aware decision to
      // `requireBulkConsent` — passed the SAME mode-binding Domain-Search uses, so
      // a direct bulk EV gates identically to a direct bulk DS:
      //   - research bulk (saveLeads false): gated by the gather token
      //     `confirmed_credit_use`; an empty-but-defined research pending is NOT
      //     gated (H rule — nothing to charge beyond this company's verify, which
      //     entering the loop authorized).
      //   - save bulk (saveLeads true): gated by the SAVE token
      //     `confirmed_save_use`; an empty-but-defined save pending IS gated as a
      //     1-company save batch (H rule).
      // Fix O: gate on a DEFINED `pending_companies` (empty OR non-empty) — `[]` is
      // still a bulk-shaped entry, and letting it verify+chain without consent was
      // the empty-array backdoor. A legitimate handoff from a consented
      // Domain-Search carries the matching token, so this fires only on a direct,
      // unconsented bulk invocation; a normal single Email-Verifier call
      // (pending_companies undefined) is unaffected.
      if (pending_companies !== undefined) {
        const totalCompanies = 1 + pending_companies.length
        // Estimate/message accuracy (HUN-20651 review fixes V + Y + DD). A direct
        // bulk EV verifies only THIS email here; the remaining companies are reached
        // via Domain-Search hops, which SEARCH (and, in save mode, verify) them. The
        // current email is verified by THIS call, NOT searched — so search counts
        // only the REMAINING companies (`pending_companies.length`) in BOTH modes
        // (review fixes Y + DD); counting `totalCompanies` overstated search by one.
        //   - research: one verification (this email) + one search per remaining
        //     company; the copy must not promise deliverability across all companies.
        //   - save: each remaining company is searched + verified, and the current
        //     email is verified+saved here, so verification = `totalCompanies`
        //     (this email + each remaining) while search = remaining only — the
        //     current email is not searched. This matches Domain-Search (where the
        //     current company IS searched here, so its search includes the current)
        //     and Create-Lead-If-Missing / Create-Or-Update-Lead (which neither
        //     search nor verify the current contact, so both buckets are
        //     remaining-only): each tool counts the current item in a bucket only
        //     when it actually performs that operation on the current item.
        const consentGuard = requireBulkConsent(
          pending_companies,
          confirmed_credit_use,
          isResearch
            ? `This will check deliverability for this email and search up to ${pending_companies.length} more ` +
                `companies for contacts, using Hunter credits. Approve to continue?`
            : `This will check deliverability for this email, search up to ${pending_companies.length} more ` +
                `companies for contacts, then verify and save the emails found — using Hunter credits for each. ` +
                `Approve to continue?`,
          {
            search: pending_companies.length,
            verification: isResearch ? 1 : totalCompanies,
          },
          { saveLeads: !isResearch, confirmedSave: confirmed_save_use },
        )
        if (consentGuard) return consentGuard
      }

      const result = await callHunterApi({ path: "/email-verifier", apiKey, baseUrl, params: { email } })
      if (result.isError) {
        if (pending_companies !== undefined && pending_companies.length > 0) {
          return loopRecoveryAction(result, pending_companies, `Email-Verifier failed for ${email}`)
        }
        return result
      }

      const status = parseHunterApiData<EmailVerifierData>(result)?.status

      if (pending_companies !== undefined) {
        const filterCarry = carryLoopFilters({
          limit,
          type,
          seniority,
          department,
          required_field,
          confirmed_credit_use,
          confirmed_save_use,
          save_leads,
          leads_list_id,
        })
        // Research mode (HUN-20651 review fix K): a valid result must NEVER chain
        // to Create-Lead-If-Missing — research gathers and writes nothing. Mirror
        // `advanceLoop`'s research terminal: advance to the next pending
        // Domain-Search, or complete with a table-render instruction. (Email-Verifier
        // is not normally reached in a research loop — `advanceLoop` skips it — but
        // a model can call it directly for a "verified contacts" brief, so honor the
        // mode here too.)
        if (isResearch) {
          if (pending_companies.length > 0) {
            const [next, ...rest] = pending_companies
            return embedNextAction(
              result,
              buildNextAction({
                kind: "call_tool",
                tool: TOOL_NAMES.domainSearch,
                reason: "Continuing to gather contacts from the next picked company.",
                suggestedArgs: { domain: next, pending_companies: rest, ...filterCarry },
              }),
            )
          }
          return embedNextAction(
            result,
            buildNextAction({
              kind: "complete",
              summary:
                "All picked companies searched. Render the collected contacts as a table (one row per email: " +
                "name, position, email, verification status). Offer to save them to Hunter leads if the user wants.",
            }),
          )
        }
        if (status === "valid") {
          return embedNextAction(
            result,
            buildNextAction({
              kind: "call_tool",
              tool: TOOL_NAMES.createLeadIfMissing,
              reason: "Save the verified contact as a new lead without overwriting any existing record.",
              suggestedArgs: { email, pending_companies, ...filterCarry },
            }),
          )
        }
        if (pending_companies.length > 0) {
          const [next, ...rest] = pending_companies
          return embedNextAction(
            result,
            buildNextAction({
              kind: "call_tool",
              tool: TOOL_NAMES.domainSearch,
              reason: `Email status: ${status ?? "unknown"} — skipping save and continuing loop.`,
              suggestedArgs: { domain: next, pending_companies: rest, ...filterCarry },
            }),
          )
        }
        return embedNextAction(
          result,
          buildNextAction({
            kind: "complete",
            summary: status
              ? `Email is ${status} — not saving. Multi-company loop complete.`
              : "Email verification status unavailable — not saving. Multi-company loop complete.",
          }),
        )
      }

      // Single Email-Verifier call (no pending_companies). In research mode (the
      // default) a valid result must NOT chain to Create-Lead-If-Missing (HUN-20651
      // review fix K) — surface the deliverability result and stop. Save mode keeps
      // the existing chain to the create-only terminal.
      if (status === "valid" && !isResearch) {
        return embedNextAction(
          result,
          buildNextAction({
            kind: "call_tool",
            tool: TOOL_NAMES.createLeadIfMissing,
            reason: "Save the verified contact as a new lead without overwriting any existing record.",
            suggestedArgs: leads_list_id !== undefined ? { email, leads_list_id } : { email },
          }),
        )
      }

      // Reaches here for: research-mode single call (any status, including valid —
      // no save), or save-mode single call with a non-valid status (not saveable).
      // Research copy just reports the status; save copy keeps the "not saving"
      // wording since the user asked to save and this address wasn't saveable.
      return embedNextAction(
        result,
        buildNextAction({
          kind: "complete",
          summary: isResearch
            ? status
              ? `Email is ${status}.`
              : "Email verification status unavailable."
            : status
              ? `Email is ${status} — not saving.`
              : "Email verification status unavailable — not saving.",
        }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.emailCount,
    {
      description:
        "Use this when the user wants the count of email addresses Hunter has indexed for a domain, optionally split by personal vs generic. Free to call. Do not use this as a substitute for Domain-Search; this returns a count only, not the email list itself.",
      inputSchema: {
        domain: domainStringSchema.describe("Domain name to count email addresses for"),
        type: z.enum(["personal", "generic"]).optional().describe("Type of email addresses to count"),
      },
      outputSchema: emailCountOutputSchema.shape,
      annotations: READ_ONLY_PUBLIC_ANNOTATIONS,
    },
    async ({ domain, type }) => {
      const params: Record<string, string> = { domain }
      if (type) params.type = type
      return callHunterApi({ path: "/email-count", apiKey, baseUrl, params })
    },
  )
}
