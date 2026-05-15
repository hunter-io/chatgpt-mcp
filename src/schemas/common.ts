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
// `pendingToolCall.args` is strict per confirmable tool — currently only
// Start-Campaign. Strict-shape prevents an attacker-controlled upstream tool
// result from swapping campaign_id under cover of a user-confirmed prompt.
export const startCampaignArgsSchema = z
  .object({
    campaign_id: z.number().int().positive(),
    confirmed: z.literal(true),
  })
  .strict()

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
    pendingToolCall: z
      .object({
        tool: z.literal(TOOL_NAMES.startCampaign),
        args: startCampaignArgsSchema,
      })
      .optional(),
  }),
  z.object({
    kind: z.literal("complete"),
    summary: z.string(),
  }),
])

// ─── mutationAckSchema ──────────────────────────────────────────────────────
//
// Synthesised by callHunterApi on HTTP 202/204 empty-body responses. Without
// this, every delete-style tool's success path would fail outputSchema
// validation (the SDK rejects `outputSchema declared but no structuredContent`).
//
// `kind: "ack"` discriminator distinguishes a synthesised acknowledgement from
// a real Hunter `{ data, meta }` envelope, so handlers can branch cleanly.
//
// Strict (no `.loose()`) — this payload is synthesised by `callHunterApi` and
// has a fixed shape; passthrough would only mask synthesis bugs.
export const mutationAckSchema = z.object({
  kind: z.literal("ack"),
  ok: z.literal(true),
  status: z.number().int(),
  message: z.string(),
})

// ─── errorSchema ────────────────────────────────────────────────────────────
//
// Even when `isError: true` (SDK skips validation), the agent needs typed
// recovery information — retryability, retry_after, which field failed, the
// failure category — to plan the next step. Without this, callers have to
// regex over prose. Biggest agent-native win in the HUN-19943 plan.
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
// `.loose()` ONLY at the envelope level — leaf object schemas should declare
// known keys so typos surface in vitest. Generic `<T extends z.ZodType>` keeps
// inference downstream so `z.infer<ReturnType<typeof buildResponseSchema>>`
// yields a precise `data` type, not `any`.
//
// `metaSchema` is optional and defaults to a loose object. List-style tools
// should pass `paginationMetaSchema` so agents can plan the next page without
// regex over prose.
export const buildResponseSchema = <T extends z.ZodType, M extends z.ZodType = z.ZodObject>(
  dataSchema: T,
  metaSchema?: M,
) =>
  z
    .object({
      data: dataSchema,
      meta: (metaSchema ?? z.object({}).loose()).optional(),
      viewInHunter: hunterUrl.optional(),
      nextAction: nextActionSchema.optional(),
    })
    .loose()

// `sanitizeUpstreamMessage` (Bearer / api_key scrub for upstream error bodies)
// is defined directly in `helpers.ts` to avoid a runtime circular import:
// `schemas/common.ts` imports `TOOL_NAMES` from `helpers.ts`; if `helpers.ts`
// then value-imports any function from `schemas/common.ts`, schema evaluation
// runs while `helpers.ts` is still initialising and `TOOL_NAMES` is undefined.
