import { z } from "zod"
import { TOOL_NAMES } from "../helpers"

// ─── Nullable primitives ────────────────────────────────────────────────────
//
// Use `nullableString()` / `nullableNumber()` etc. instead of `.nullable()`.
// Zod v4 `.nullable()` emits `anyOf: [{type:"string"},{type:"null"}]` — valid
// JSON Schema 2020-12, but OpenAI structured-output models behave more
// reliably with the explicit union form that compiles to
// `{type:["string","null"]}`. See Zod issue #5100 and the HUN-19943 plan.
//
// `nullish()` is the helper for `<T> | null | undefined` (field may be absent
// OR present-as-null). Use deliberately — most Hunter Rails views emit `null`
// for empty fields, not omission, so plain `nullableX()` is the right default.
export const nullableString = () => z.union([z.string(), z.null()])
export const nullableNumber = () => z.union([z.number(), z.null()])
export const nullableBoolean = () => z.union([z.boolean(), z.null()])
export const nullish = <T extends z.ZodType>(s: T) => z.union([s, z.null()]).optional()

// Open-ended key-value bag for opaque payloads (suggestedArgs etc.). Emits
// `additionalProperties: true` in the published JSON Schema, unlike
// `z.object({}).loose()` which omits the key (spec-default true on 2020-12).
export const jsonArgs = z.record(z.string(), z.unknown())

// Hunter Rails-served deep links must originate from hunter.io. Refines after
// `z.url()` so we get the URL parser (rejects `javascript:` / `data:` URIs
// without explicit allowlist work) and then origin-lock to `https://hunter.io`.
// Prevents open-redirect / XSS payloads from sneaking in via a future Rails
// jbuilder regression where a path-traversed lead id reflects into a URL.
export const hunterUrl = z.url().refine((value) => {
  try {
    return new URL(value).origin === "https://hunter.io"
  } catch {
    return false
  }
}, "must be a hunter.io URL")

// ─── nextActionSchema ───────────────────────────────────────────────────────
//
// IMPORTANT: this discriminated union is NEVER used as a top-level outputSchema.
// The MCP SDK's `normalizeObjectSchema` filters by `def.type === 'object'` and
// silently drops top-level z.discriminatedUnion (issue #1643). Always nest
// inside a `z.object(...)` via `buildResponseSchema`.
//
// `tool` is `z.enum(TOOL_NAMES)` — Zod v4 accepts the const record directly
// (no `as [Foo, ...Foo[]]` cast), so the literal type is derived from the
// single source of truth and cannot drift.
//
// `pendingToolCall.args` is strict per confirmable tool. Strict-shape prevents
// an attacker-controlled upstream tool result from swapping resource ids (or
// smuggling extra fields) under cover of a user-confirmed prompt. Every
// confirmable tool follows the same gate pattern: the first call (without
// `confirmed`) returns ask_user + pendingToolCall carrying the original args
// plus `confirmed: true`; the re-issued call executes. Arg shapes mirror the
// Rails controllers' permitted params (see each tool's handler for the
// controller reference).
export const startSequenceArgsSchema = z
  .object({
    sequence_id: z.number().int().positive(),
    confirmed: z.literal(true),
  })
  .strict()

export const deleteSequenceArgsSchema = z
  .object({
    sequence_id: z.number().int().positive(),
    confirmed: z.literal(true),
  })
  .strict()

export const bulkMoveLeadsArgsSchema = z
  .object({
    leads_list_id: z.number().int().positive(),
    target_leads_list_id: z.number().int().positive(),
    lead_ids: z.array(z.number().int().positive()).optional(),
    confirmed: z.literal(true),
  })
  .strict()

export const bulkDeleteLeadsArgsSchema = z
  .object({
    lead_ids: z.array(z.number().int().positive()).optional(),
    leads_list_id: z.number().int().positive().optional(),
    confirmed: z.literal(true),
  })
  .strict()

export const bulkMoveCompaniesArgsSchema = z
  .object({
    company_list_id: z.number().int().positive(),
    target_company_list_id: z.number().int().positive(),
    company_ids: z.array(z.number().int().positive()).optional(),
    confirmed: z.literal(true),
  })
  .strict()

export const bulkCopyCompaniesArgsSchema = z
  .object({
    target_company_list_id: z.number().int().positive(),
    company_list_id: z.number().int().positive().optional(),
    company_ids: z.array(z.number().int().positive()).optional(),
    confirmed: z.literal(true),
  })
  .strict()

export const bulkDeleteCompaniesArgsSchema = z
  .object({
    company_ids: z.array(z.number().int().positive()).optional(),
    company_list_id: z.number().int().positive().optional(),
    confirmed: z.literal(true),
  })
  .strict()

export const pushLeadsToCrmArgsSchema = z
  .object({
    connected_app_id: z.number().int().positive(),
    lead_ids: z.array(z.number().int().positive()).optional(),
    leads_list_id: z.number().int().positive().optional(),
    confirmed: z.literal(true),
  })
  .strict()

export const createApiKeyArgsSchema = z
  .object({
    name: z.string().max(255).optional(),
    confirmed: z.literal(true),
  })
  .strict()

export const deleteApiKeyArgsSchema = z
  .object({
    api_key_id: z.number().int().positive(),
    confirmed: z.literal(true),
  })
  .strict()

// One entry per ConfirmableToolName (helpers.ts NEXT_ACTION region). A plain
// union (not discriminatedUnion) because the discriminator lives one level up
// on `tool` with per-tool args shapes — Zod tries each branch in order.
export const pendingToolCallSchema = z.union([
  z.object({ tool: z.literal(TOOL_NAMES.startSequence), args: startSequenceArgsSchema }),
  z.object({ tool: z.literal(TOOL_NAMES.deleteSequence), args: deleteSequenceArgsSchema }),
  z.object({ tool: z.literal(TOOL_NAMES.bulkMoveLeads), args: bulkMoveLeadsArgsSchema }),
  z.object({ tool: z.literal(TOOL_NAMES.bulkDeleteLeads), args: bulkDeleteLeadsArgsSchema }),
  z.object({ tool: z.literal(TOOL_NAMES.bulkMoveCompanies), args: bulkMoveCompaniesArgsSchema }),
  z.object({ tool: z.literal(TOOL_NAMES.bulkCopyCompanies), args: bulkCopyCompaniesArgsSchema }),
  z.object({ tool: z.literal(TOOL_NAMES.bulkDeleteCompanies), args: bulkDeleteCompaniesArgsSchema }),
  z.object({ tool: z.literal(TOOL_NAMES.pushLeadsToCrm), args: pushLeadsToCrmArgsSchema }),
  z.object({ tool: z.literal(TOOL_NAMES.createApiKey), args: createApiKeyArgsSchema }),
  z.object({ tool: z.literal(TOOL_NAMES.deleteApiKey), args: deleteApiKeyArgsSchema }),
])

export const nextActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("call_tool"),
    tool: z.enum(TOOL_NAMES),
    reason: z.string().max(200),
    suggestedArgs: jsonArgs.optional(),
    requiresConfirmation: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("ask_user"),
    question: z.string().max(300),
    pendingToolCall: pendingToolCallSchema.optional(),
  }),
  z.object({
    kind: z.literal("complete"),
    summary: z.string(),
  }),
])

// ─── errorSchema ────────────────────────────────────────────────────────────
//
// Even when `isError: true` (SDK skips validation), the agent needs typed
// recovery information — retryability, retry_after, which field failed, the
// failure category — to plan the next step. Without this, callers have to
// regex over prose. Biggest agent-native win in the HUN-19943 plan.
//
// Defined before `mutationAckSchema` and `buildResponseSchema` because both
// reference it (an error envelope is a valid output of every tool — see below).
export const errorSchema = z.object({
  code: z.enum([
    "rate_limited",
    "quota_exceeded",
    "invalid_input",
    "not_found",
    "unauthorized",
    "upstream_error",
    "validation",
  ]),
  retryable: z.boolean(),
  retry_after_seconds: z.number().int().nonnegative().optional(),
  field: z.string().optional(),
  message: z.string(),
})

export type HunterErrorCode = z.infer<typeof errorSchema>["code"]
export type HunterError = z.infer<typeof errorSchema>

// ─── mutationAckSchema ──────────────────────────────────────────────────────
//
// The outputSchema for delete-style tools (they publish `mutationAckSchema.shape`
// directly, because callHunterApi synthesises this envelope on HTTP 202/204
// empty-body responses). `kind: "ack"` distinguishes a synthesised
// acknowledgement from a real Hunter `{ data, meta }` envelope.
//
// HUN-20460 — those same tools also return `callHunterApi`, which emits
// `{ error }` on 4xx/5xx (e.g. Delete-Leads-List on a missing list → 404). The
// published schema is `additionalProperties: false` (the `.shape` rewrap drops
// any passthrough), so without `error` declared here — and without the ack
// fields being optional — that error envelope fails client validation with the
// same `-32602` the shared buildResponseSchema fix addresses. So the ack fields
// are optional and `error` is declared: the schema accepts BOTH shapes.
export const mutationAckSchema = z.object({
  kind: z.literal("ack").optional(),
  ok: z.literal(true).optional(),
  status: z.number().int().optional(),
  message: z.string().optional(),
  error: errorSchema.optional(),
})

// ─── Verification ───────────────────────────────────────────────────────────
//
// Hunter's email-verification sub-shape (returned on `Domain-Search` email
// entries, `Email-Finder`, and on saved leads). Small + stable: `{ status,
// date }`. `.loose()` only because Hunter has historically added optional
// fields here (e.g. `confidence`) without notice — but the known keys are
// typed so jbuilder typos surface in vitest. See HUN-19943 todos/018.
export const verificationSchema = z
  .object({
    status: nullableString().optional(),
    date: nullableString().optional(),
  })
  .loose()

// ─── Pagination meta ────────────────────────────────────────────────────────
//
// Hunter's Rails API returns pagination metadata in `meta` on list endpoints:
// `count` (returned in this page), `total` (matching the filter), `offset` /
// `limit` (request params echoed back), and `results` (some endpoints alias
// `count` as `results`). Type explicitly so agents can plan pagination
// programmatically — `meta: z.object({}).loose()` (the prior default) left
// pagination unreadable. `.loose()` at envelope level so endpoints with
// additional meta fields (e.g. `params:` echo) still validate.
// See HUN-19943 todos/017.
export const paginationMetaSchema = z
  .object({
    count: z.number().int().nonnegative().optional(),
    total: z.number().int().nonnegative().optional(),
    offset: z.number().int().nonnegative().optional(),
    limit: z.number().int().nonnegative().optional(),
    results: z.number().int().nonnegative().optional(),
  })
  .loose()

// ─── buildResponseSchema ────────────────────────────────────────────────────
//
// Shared envelope for tools that wrap a Hunter `data` payload. Per-tool
// dataSchema co-locates with the handler — DO NOT centralise per-tool schemas
// here; co-location matches the inputSchema cohesion pattern and avoids a
// dead-on-arrival registry (see architecture review in the HUN-19943 plan).
//
// Leaf object schemas should declare known keys so typos surface in vitest.
// Generic `<T extends z.ZodType>` keeps inference downstream so
// `z.infer<ReturnType<typeof buildResponseSchema>>` yields a precise `data`
// type, not `any`.
//
// `metaSchema` is optional and defaults to a loose object. List-style tools
// should pass `paginationMetaSchema` so agents can plan the next page without
// regex over prose.
//
// HUN-20460 — this envelope MUST describe EVERY shape `callHunterApi` puts on
// `structuredContent`, not just the success one. On non-2xx / empty responses
// it synthesises two other top-level shapes:
//   • 4xx/5xx  → `{ error }`                       (errorSchema)
//   • 202/204  → `{ kind, ok, status, message }`   (mutationAckSchema, flat)
// Both are emitted with `isError`/ack semantics but still land in
// `structuredContent`, which a schema-validating MCP client checks against the
// PUBLISHED output schema. Crucially, `registerTool` is handed `<schema>.shape`
// (a ZodRawShape), so the SDK re-wraps the fields in a FRESH `z.object(...)` and
// the envelope `.loose()` below is DROPPED — the published JSON Schema is
// `additionalProperties: false`. So the not-found `{ error }` envelope failed
// client validation with `-32602` ("must have required property 'data', must
// NOT have additional properties"): `data` was required and `error` was an
// undeclared extra key. Therefore `data` MUST be optional and every synthesised
// top-level key MUST be declared here. (The `.loose()` is kept for intent/local
// use even though `registerTool` discards it via `.shape`.)
export const buildResponseSchema = <T extends z.ZodType, M extends z.ZodType = z.ZodObject>(
  dataSchema: T,
  metaSchema?: M,
) =>
  z
    .object({
      // Present on success; ABSENT on the error/ack envelopes below.
      data: dataSchema.optional(),
      meta: (metaSchema ?? z.object({}).loose()).optional(),
      // 4xx/5xx envelope (callHunterApi → `{ error }`, isError:true).
      error: errorSchema.optional(),
      // 202/204 acknowledgement envelope — mutationAckSchema fields, inlined
      // flat (they sit at the top level of structuredContent, not nested).
      kind: z.literal("ack").optional(),
      ok: z.literal(true).optional(),
      status: z.number().int().optional(),
      message: z.string().optional(),
      viewInHunter: hunterUrl.optional(),
      nextAction: nextActionSchema.optional(),
    })
    .loose()

// ─── Bulk-consent approval-required envelope ─────────────────────────────────
//
// `requireBulkConsent` (helpers.ts) short-circuits an unconsented bulk/save entry
// with `structuredContent = { kind: "approval_required", ok: true,
// estimated_credits: { search, verification } }` plus an `ask_user` nextAction.
// Every tool that can EMIT this envelope must DECLARE it in its outputSchema —
// otherwise `registerTool` publishes `.shape` as a closed
// (`additionalProperties: false`) object and a schema-validating client rejects
// the approval prompt with -32602 (HUN-20651 review fix N). Domain-Search already
// had these fields inlined in its custom schema; Email-Verifier and
// Create-Lead-If-Missing gained the gate (review fixes J/L/O) and so must declare
// them too.
//
// `buildResponseSchema` declares `kind: z.literal("ack")` (the 202/204 path). The
// bulk-consent path adds `kind: "approval_required"`, so these tools need `kind`
// to accept BOTH literals AND to declare `estimated_credits`. This helper returns
// the raw-shape fragment to merge into a `buildResponseSchema(...).extend(...)`
// (or to spread alongside other fields) so the declaration stays identical across
// every approval-emitting tool and can't drift. Lives here (outside any byte-
// locked region) per the cross-MCP constraint.
export const approvalRequiredShape = {
  // Widen `kind` to the union both envelopes use. `buildResponseSchema` already
  // declares `kind: z.literal("ack")`; `.extend` overrides it with this union,
  // which still admits "ack" so the 202/204 ack envelope keeps validating.
  kind: z.union([z.literal("approval_required"), z.literal("ack")]).optional(),
  estimated_credits: z
    .object({
      search: z.number().int().nonnegative(),
      verification: z.number().int().nonnegative(),
    })
    .optional(),
} as const

// `sanitizeUpstreamMessage` (Bearer / api_key scrub for upstream error bodies)
// is defined directly in `helpers.ts` to avoid a runtime circular import:
// `schemas/common.ts` imports `TOOL_NAMES` from `helpers.ts`; if `helpers.ts`
// then value-imports any function from `schemas/common.ts`, schema evaluation
// runs while `helpers.ts` is still initialising and `TOOL_NAMES` is undefined.
