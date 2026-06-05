import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  TOOL_NAMES,
  WRITE_ANNOTATIONS,
} from "../helpers"
import { buildResponseSchema, nullableString } from "../schemas/common"

// Per-step shape from app/app/views/api/sequences/follow_ups/index.jbuilder.
// Leaf is strict (no `.loose()`) so a jbuilder typo surfaces in vitest; the
// envelope is loose via buildResponseSchema. `step` is 0-based: step 0 is the
// introduction message, steps 1+ are follow-up steps. `subject` is emitted via
// `display_subject` (app/app/models/follow_up.rb), which resolves the
// SUBJECT_INHERITANCE_PLACEHOLDER to the closest prior concrete subject and
// falls back to an empty string (`""`) when the chain can't resolve — so it is
// always a (possibly empty) string, never JSON null. We keep `nullableString()`
// as a defensive cushion rather than a contract claim. `variant` is null for
// non-variant follow-ups and "A"/"B" for A/B tests. `message_format` is the
// FollowUp message format ("text" or "html"), but the underlying
// `follow_ups.message_format` column is a nullable varchar with no default
// (db/structure.sql), and the jbuilder emits the raw column value. The
// MessageFormat concern only validates inclusion conditionally and treats a
// blank value as HTML for persisted records, so a legacy/unmigrated row can
// serialize `message_format: null`. Admit null (alongside the enum) so the SDK
// does not reject an otherwise-valid response and drop the whole follow-up list.
const followUpSchema = z.object({
  id: z.number().int().positive(),
  step: z.number().int().nonnegative(),
  wait_days: z.number().int().nonnegative(),
  message_format: z.union([z.enum(["text", "html"]), z.null()]),
  messages_sent: z.number().int().nonnegative(),
  subject: nullableString(),
  body: z.string(),
  variant: nullableString(),
})

// index.jbuilder emits `json.data do json.follow_ups @follow_ups do ... end`,
// so `data` is a `{ follow_ups: [...] }` object (not a bare array). `meta`
// carries `{ limit, offset }` — declare those explicitly. The follow-ups are
// ordered by (step ASC, variant ASC).
const listSequenceFollowUpsOutputSchema = buildResponseSchema(
  z.object({ follow_ups: z.array(followUpSchema) }),
  z.object({ limit: z.number().int(), offset: z.number().int() }).loose(),
)

// Pause-Sequence renders a minimal inline JSON body (not a jbuilder, not an
// empty 202/204 ack): `app/app/controllers/api/sequences/pause_controller.rb#create`
// returns `render json: { data: { id: sequence.id, paused: sequence.paused } }`.
// `paused` is always true on the success path. Leaf is strict (no `.loose()`)
// so a controller shape change surfaces in vitest; the envelope stays loose via
// buildResponseSchema.
const pauseSequenceSchema = z.object({
  id: z.number().int().positive(),
  paused: z.boolean(),
})

const pauseSequenceOutputSchema = buildResponseSchema(pauseSequenceSchema)

// Resume-Sequence renders a minimal inline JSON body (not a jbuilder, not an
// empty 202/204 ack): `app/app/controllers/api/sequences/pause_controller.rb#destroy`
// returns `render json: { data: { message: t(...) } }` on both the resume path
// ("Sequence resumed.") and the no-op path ("Sequence is not paused."). Only
// `message` is emitted. Leaf is strict (no `.loose()`) so a controller shape
// change surfaces in vitest; the envelope stays loose via buildResponseSchema.
const resumeSequenceSchema = z.object({
  message: z.string(),
})

const resumeSequenceOutputSchema = buildResponseSchema(resumeSequenceSchema)

// Archive-Sequence renders a minimal inline JSON body (not a jbuilder, not an
// empty 202/204 ack): `app/app/controllers/api/sequences/archive_controller.rb#create`
// returns `render json: { data: { id: sequence.id, archived: sequence.archived } }`.
// `archived` is always true on the success path. Leaf declares every key (not
// `.loose()`) so a renamed key surfaces in vitest as a missing-key parse error;
// the envelope stays loose via buildResponseSchema. NOT `.strict()` — an output
// leaf must tolerate fields the API may add later (HUN-19943), so it strips
// unknowns rather than rejecting the whole response.
const archiveSequenceSchema = z.object({
  id: z.number().int().positive(),
  archived: z.boolean(),
})

const archiveSequenceOutputSchema = buildResponseSchema(archiveSequenceSchema)

// Get-Sequence-Stats renders aggregated sequence stats plus a per-follow-up
// breakdown from app/app/views/api/sequences/stats/show.jbuilder and
// stats/_follow_up.jbuilder. The top-level fields are summed from the
// sequence's follow-ups (sent/opened/clicked/replied/bounced), `delivered` is
// `sent - bounced`, and the rates are floats in the 0.0-1.0 range (0 when the
// denominator is zero — see the jbuilder's `.zero? ? 0 : …` guards), NOT
// percentages. `unsubscribed_recipients` is the count of recipients who
// unsubscribed and `unsubscribed_recipients_rate` divides it by
// `recipients_count`. Leaves are strict (no `.loose()`) so a jbuilder field
// rename surfaces in vitest; the envelope stays loose via buildResponseSchema.
// `follow_ups` are ordered by (step ASC, variant ASC); `variant` is null for a
// non-variant (default) follow-up and "A"/"B" for A/B tests. The per-follow-up
// `delivered` comes from `messages_delivered` and the rates mirror the
// top-level ones (`unsubscribe_rate` = unsubscribed / delivered).
const sequenceStatsFollowUpSchema = z.object({
  id: z.number().int().positive(),
  step: z.number().int().nonnegative(),
  variant: nullableString(),
  messages_sent: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  opened: z.number().int().nonnegative(),
  clicked: z.number().int().nonnegative(),
  replied: z.number().int().nonnegative(),
  bounced: z.number().int().nonnegative(),
  unsubscribed: z.number().int().nonnegative(),
  open_rate: z.number(),
  click_rate: z.number(),
  reply_rate: z.number(),
  bounce_rate: z.number(),
  unsubscribe_rate: z.number(),
})

const sequenceStatsSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  recipients_count: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  opened: z.number().int().nonnegative(),
  clicked: z.number().int().nonnegative(),
  replied: z.number().int().nonnegative(),
  bounced: z.number().int().nonnegative(),
  unsubscribed_recipients: z.number().int().nonnegative(),
  open_rate: z.number(),
  click_rate: z.number(),
  reply_rate: z.number(),
  bounce_rate: z.number(),
  unsubscribed_recipients_rate: z.number(),
  follow_ups: z.array(sequenceStatsFollowUpSchema),
})

const getSequenceStatsOutputSchema = buildResponseSchema(sequenceStatsSchema)

export function registerSequenceTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listSequenceFollowUps,
    {
      description:
        "Use this when the user wants to see the follow-up steps of a sequence, ordered by step. Step 0 is the introduction message and steps 1 and up are follow-ups; each step reports its `wait_days` (days to wait before sending), `subject` (the email subject; an inherited subject is resolved to the prior step's subject, so it is rarely empty), `body`, `message_format` (text or html), `messages_sent`, and `variant` (null, or A/B for A/B-tested steps). Supports `limit` and `offset` pagination. Returns a not-found error if the sequence does not exist or belongs to another team. Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence to fetch follow-up steps for"),
        offset: z.number().int().nonnegative().optional().describe("Number of follow-up steps to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of follow-up steps to return (default 20, max 100)"),
      },
      outputSchema: listSequenceFollowUpsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ sequence_id, offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: `/sequences/${sequence_id}/follow_ups`, apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.pauseSequence,
    {
      description:
        "Use this when the user wants to pause a started sequence so it stops sending outbound emails until it is resumed. Only a started, non-archived sequence can be paused: pausing a draft (not yet started) or an archived sequence returns an invalid_input error (id sequence_not_active). Pausing an already-paused sequence is idempotent and succeeds. The response reports the sequence id and its paused state — surface that the sequence is now paused and that pausing is reversible. Returns a not-found error if the sequence does not exist or belongs to another user (this endpoint is owner-only). Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence to pause"),
      },
      outputSchema: pauseSequenceOutputSchema.shape,
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ sequence_id }) => {
      // On 422 (draft/archived → sequence_not_active) or 404 (not found /
      // not owner) callHunterApi returns the typed error envelope unchanged;
      // we pass it through so the model gets `structuredContent.error`.
      return callHunterApi({ path: `/sequences/${sequence_id}/pause`, apiKey, baseUrl, method: "POST" })
    },
  )

  server.registerTool(
    TOOL_NAMES.resumeSequence,
    {
      description:
        'Use this when the user wants to resume a paused sequence so it starts sending outbound emails again. Resuming runs the full validation pipeline (unlike pausing), so it can fail with an invalid_input error: resuming an archived sequence is rejected (id sequence_not_active), and resuming a sequence whose email account is no longer connected or whose schedule has no sending days fails validation (id validation_failed, with a field-specific message) — relay that message to the user so they can fix the configuration. Resuming a sequence that is not currently paused is a no-op that succeeds with the message "Sequence is not paused.". The response carries a `message` describing the outcome — surface it and note that resuming is reversible (pause to stop sending). Returns a not-found error if the sequence does not exist or belongs to another user (this endpoint is owner-only). Free to call.',
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence to resume"),
      },
      outputSchema: resumeSequenceOutputSchema.shape,
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ sequence_id }) => {
      // On 422 (archived → sequence_not_active; disconnected email account or
      // empty schedule → validation_failed) or 404 (not found / not owner)
      // callHunterApi returns the typed error envelope unchanged; we pass it
      // through so the model gets `structuredContent.error`.
      return callHunterApi({ path: `/sequences/${sequence_id}/pause`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    TOOL_NAMES.archiveSequence,
    {
      description:
        "Use this when the user wants to archive a started sequence to file it once it is finished. Only a started sequence (active or paused) can be archived: archiving a draft (a sequence that was never started) returns an invalid_input error (id sequence_not_started) — tell the user the sequence has to be started before it can be archived. Archiving an already-archived sequence is idempotent and succeeds. The response reports the sequence id and its archived state — surface that the sequence is now archived. Archiving stops the sequence from sending and cannot be undone through the API: an archived sequence cannot be resumed or un-archived via the API, so confirm with the user before archiving. Returns a not-found error if the sequence does not exist or belongs to another user (this endpoint is owner-only). Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence to archive"),
      },
      outputSchema: archiveSequenceOutputSchema.shape,
      // DESTRUCTIVE: archiving is irreversible via the API — resume rejects an
      // archived sequence (sequence_not_active) and there is no un-archive
      // endpoint — so destructiveHint:true makes the host confirm first. openWorld
      // stays true (touches the outbound delivery surface). HUN-20196, Codex review.
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ sequence_id }) => {
      // On 422 (draft → sequence_not_started) or 404 (not found / not owner)
      // callHunterApi returns the typed error envelope unchanged; we pass it
      // through so the model gets `structuredContent.error`.
      return callHunterApi({ path: `/sequences/${sequence_id}/archive`, apiKey, baseUrl, method: "POST" })
    },
  )

  server.registerTool(
    TOOL_NAMES.getSequenceStats,
    {
      description:
        "Use this when the user wants to see how a sequence is performing. Reports aggregated stats for a sequence plus a per-follow-up breakdown. The top-level totals (`recipients_count`, `sent`, `delivered`, `opened`, `clicked`, `replied`, `bounced`, `unsubscribed_recipients`) are summed across the sequence's follow-up steps, with `delivered` equal to `sent - bounced`. The rate fields (`open_rate`, `click_rate`, `reply_rate`, `bounce_rate`, `unsubscribed_recipients_rate`) are floats in the 0.0-1.0 range — multiply by 100 to present them as percentages to the user — and are 0 when their denominator is 0. The `follow_ups` array reports the same metrics per step (ordered by step, then variant), where `variant` is null for the default follow-up or A/B for A/B-tested steps. Returns a not-found error if the sequence does not exist or belongs to another team. Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence to fetch stats for"),
      },
      outputSchema: getSequenceStatsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ sequence_id }) => {
      // On 404 (sequence does not exist or belongs to another team)
      // callHunterApi returns the typed error envelope unchanged; we pass it
      // through so the model gets `structuredContent.error`.
      return callHunterApi({ path: `/sequences/${sequence_id}/stats`, apiKey, baseUrl })
    },
  )
}
