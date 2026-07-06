import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  EXTERNAL_SIDE_EFFECT_ANNOTATIONS,
  type McpTextResult,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  TOOL_NAMES,
  WRITE_ANNOTATIONS,
  PRIVATE_WRITE_ANNOTATIONS,
  buildNextAction,
  embedNextAction,
  parseHunterApiResponse,
  withDeepLink,
  withDeepLinkFromId,
} from "../helpers"
import {
  buildResponseSchema,
  mutationAckSchema,
  nullableBoolean,
  nullableString,
  paginationMetaSchema,
} from "../schemas/common"

interface SequenceDetailCountResponse {
  data?: {
    recipients_count?: number | null
  }
}

interface StartSequenceResponse {
  data?: {
    message?: string
  }
}

// The Hunter Rails endpoint at /v2/sequences/:id/start (an alias of the
// campaigns start controller — app/app/controllers/api/campaigns/start_controller.rb)
// short-circuits with HTTP 200 + data.message: "Sequence already started."
// when the sequence is already running. We surface this as isError in the MCP
// layer so the model doesn't treat a no-op as a fresh successful start.
const ALREADY_STARTED_MESSAGE = "Sequence already started."
// 1500ms cap — the recipient-count fetch lives on the Start-Sequence
// confirmation critical path. Hunter's GET /sequences/:id detail endpoint
// should respond in <500ms in practice; if it doesn't, we fall back to
// "all configured recipients".
// `Promise.all`-style parallelism doesn't help here: stub assembly is
// synchronous (microseconds) and the count is the only async dependency, so
// there's nothing to overlap. See HUN-19943 todos/020.
const RECIPIENT_COUNT_TIMEOUT_MS = 1500

// Hunter sequence + recipient shapes. .loose() at envelope level via
// buildResponseSchema; leaves are strict so jbuilder typos surface in vitest.
// Per-item shape from app/app/views/api/sequences/index.jbuilder: the jbuilder
// emits lifecycle booleans (started/archived/paused), not a single status
// field, plus `owner` (`sequence.user && { id, email }` — null when the
// sequence's user is gone). The index jbuilder emits the RAW columns:
// `started`/`paused` are nullable booleans with no default and
// `recipients_count` is a nullable int, so a legacy NULL row must parse as
// null rather than -32602-failing the whole list. `archived` is NOT NULL
// (default false), so it stays a plain boolean. `campaigns.name` is nullable
// with no model presence validation (a dashboard-created sequence saved without
// a name persists NULL and the jbuilder renders `name: null`), so admit null.
const sequenceSchema = z
  .object({
    id: z.number().int().positive(),
    name: nullableString(),
    recipients_count: z.union([z.number().int().nonnegative(), z.null()]).optional(),
    editable: z.boolean().optional(),
    started: nullableBoolean().optional(),
    archived: z.boolean().optional(),
    paused: nullableBoolean().optional(),
    owner: z.union([z.object({ id: z.number().int().positive(), email: z.string() }).loose(), z.null()]).optional(),
  })
  .loose()

// Recipient PII categories are disclosed in the OpenAI dashboard data form.
// The declared set matches app/app/views/api/campaigns/recipients/index.jbuilder
// EXACTLY: email, first_name, last_name, position, company, website,
// sending_status, and lead_id (raw nullable column) — the jbuilder emits no
// `id` or `status` field. Schema uses Zod's default strip-on-parse behavior:
// any new field Hunter adds to the jbuilder is silently dropped at parse time
// and never reaches the model. Adding a new recipient field to the surface
// requires a deliberate schema bump here + disclosure update.
const recipientSchema = z.object({
  email: z.string(),
  first_name: nullableString().optional(),
  last_name: nullableString().optional(),
  position: nullableString().optional(),
  company: nullableString().optional(),
  website: nullableString().optional(),
  sending_status: nullableString().optional(),
  lead_id: z.union([z.number().int().positive(), z.null()]).optional(),
})

const listSequencesDataSchema = z.object({ sequences: z.array(sequenceSchema) }).loose()
const listRecipientsDataSchema = z.object({ recipients: z.array(recipientSchema) }).loose()

const listSequencesOutputSchema = buildResponseSchema(listSequencesDataSchema, paginationMetaSchema)
const listRecipientsOutputSchema = buildResponseSchema(listRecipientsDataSchema, paginationMetaSchema)
const addRecipientsOutputSchema = buildResponseSchema(
  z
    .object({
      recipients_added: z.number().int().nonnegative().optional(),
      skipped_recipients: z.array(z.unknown()).optional(),
      // Forward-compat / older API shape:
      recipients: z.array(recipientSchema).optional(),
      emails_added: z.number().int().nonnegative().optional(),
    })
    .loose(),
)
// Hunter Rails (`app/app/views/api/campaigns/recipients/destroy.jbuilder`)
// emits `{ data: { recipients_canceled: [...emails], messages_canceled:
// <count> } }` — there is no `emails_removed` field. The previous schema declared a
// fictional field that would have been advertised in the JSON Schema and
// always resolved to `undefined` against real payloads (silent misdirection).
const removeRecipientsOutputSchema = buildResponseSchema(
  z
    .object({
      recipients_canceled: z.array(z.string()).optional(),
      messages_canceled: z.number().int().nonnegative().optional(),
    })
    .loose(),
)
const startSequenceOutputSchema = buildResponseSchema(
  z
    .object({
      id: z.number().int().positive().optional(),
      status: z.string().optional(),
      message: z.string().optional(),
    })
    .loose(),
)

// Reads the recipient count from the sequence detail (GET /sequences/:id —
// app/app/views/api/sequences/show.jbuilder). The recipients index endpoint's
// meta carries ONLY { limit, offset } — never a total — so the detail payload
// is the sole source of the count. `recipients_count` is the raw nullable
// column; null (or a missing field) falls through to the generic phrasing at
// the call sites (Start-Sequence + Delete-Sequence confirmation gates).
async function fetchRecipientCount(sequence_id: number, apiKey: string, baseUrl: string): Promise<number | null> {
  try {
    const result = await callHunterApi({
      path: `/sequences/${sequence_id}`,
      apiKey,
      baseUrl,
      signal: AbortSignal.timeout(RECIPIENT_COUNT_TIMEOUT_MS),
    })
    if (result.isError) return null
    const response = parseHunterApiResponse<SequenceDetailCountResponse>(result)
    return response?.data?.recipients_count ?? null
  } catch {
    return null
  }
}

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

// Get-Sequence-Stats renders recipient-based sequence stats plus a per-follow-up
// breakdown from app/app/views/api/sequences/stats/show.jbuilder and
// stats/_follow_up.jbuilder. The top-level engagement fields
// (sent/delivered/opened/clicked/replied/unsubscribed_recipients) are DISTINCT
// recipients, NOT sums across follow-ups: `delivered` is the recipients who
// received at least one non-bounced email (NOT `sent - bounced`). `bounced` and
// `bounce_rate` are message-based. The rates are floats in the 0.0-1.0 range (0
// when the denominator is zero), NOT percentages; open_rate/click_rate/reply_rate
// divide by distinct delivered recipients and `unsubscribed_recipients_rate`
// divides unsubscribed recipients by `recipients_count`. Leaves are strict (no
// `.loose()`) so a jbuilder field rename surfaces in vitest; the envelope stays
// loose via buildResponseSchema. `follow_ups` are MESSAGE-based per step (ordered
// by step ASC, variant ASC; `variant` is null for a non-variant default follow-up
// and "A"/"B" for A/B tests), so per-step counts do NOT sum to the recipient-based
// top-level totals.
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
  // stats/show.jbuilder renders `@sequence.name` raw; campaigns.name is nullable
  // with no model presence validation, so a dashboard-created unnamed sequence
  // reports null here — admit it rather than fail the whole stats response.
  name: nullableString(),
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

// ─── Sequence CRUD (HUN-20840 / HUN-20841) ──────────────────────────────────
//
// Full sequence shape from app/app/views/api/sequences/_sequence.jbuilder,
// rendered inside `{ data: ... }` by api/sequences/show.jbuilder for
// GET /sequences/:id, POST /sequences (201), and PUT /sequences/:id
// (Api::SequencesController#show/#create/#update). Unlike the index item
// shape above, the detail shape adds `status` — the derived lifecycle label
// from app/app/models/campaign/status.rb#status (one of draft, planned,
// active, paused, completed, preparing, error, archived; typed as a plain
// string, not an enum, so a future lifecycle state doesn't invalidate
// responses) — plus the `schedule` and `settings` blocks, sender
// `email_account_ids`, and a `follow_ups` step summary. Leaves declare every
// jbuilder key (no `.loose()`) so a renamed key surfaces in vitest; the
// envelope stays loose via buildResponseSchema.
const sequenceScheduleSchema = z.object({
  // Date-only YYYY-MM-DD (the same format create/update accept) or null when
  // no start is scheduled.
  start_at: nullableString(),
  // "HH:MM" strings formatted from the seconds-since-midnight columns; null
  // when the sequence inherits the owner's default sending window.
  time_start: nullableString(),
  time_end: nullableString(),
  // Days of week as integers 0 (Sunday) .. 6 (Saturday). The backing column
  // is a nullable integer[] (db/structure.sql), so admit null.
  days: z.union([z.array(z.number().int()), z.null()]),
})

const sequenceSettingsSchema = z.object({
  tracked: z.boolean(),
  tracked_links: z.boolean(),
  add_unsubscribe_link: z.boolean(),
  ai_assistant_enabled: z.boolean(),
  bcc_recipient: nullableString(),
})

const sequenceDetailSchema = z.object({
  id: z.number().int().positive(),
  // _sequence.jbuilder renders `sequence.name` raw; campaigns.name is nullable
  // with no model presence validation (a dashboard sequence saved without a name
  // persists NULL), so admit null instead of failing Get-Sequence for that row.
  name: nullableString(),
  status: z.string(),
  // _sequence.jbuilder coerces started/paused with `!!` (always boolean) but
  // emits recipients_count RAW from the nullable column — admit null so a
  // legacy row doesn't invalidate the whole detail response.
  recipients_count: z.union([z.number().int().nonnegative(), z.null()]),
  started: z.boolean(),
  paused: z.boolean(),
  archived: z.boolean(),
  schedule: sequenceScheduleSchema,
  settings: sequenceSettingsSchema,
  email_account_ids: z.array(z.number().int()),
  follow_ups: z.object({
    unique_steps_count: z.number().int().nonnegative(),
    steps: z.array(z.number().int().nonnegative()),
  }),
  owner: z.union([z.object({ id: z.number().int().positive(), email: z.string() }).loose(), z.null()]),
  created_at: z.string(),
  updated_at: z.string(),
})

// Shared by Get-Sequence, Create-Sequence, and Update-Sequence — all three
// render the same api/sequences/show.jbuilder template.
const sequenceDetailOutputSchema = buildResponseSchema(sequenceDetailSchema)

// Delete-Sequence has two success shapes: the awaiting_confirmation stub
// (`data: { id, status }`) emitted by the confirmation gate below, and the
// synthesized 204 ack envelope from callHunterApi once the DELETE goes
// through (Api::SequencesController#destroy responds `head :no_content`).
// buildResponseSchema declares the flat ack fields; the loose data leaf
// covers the stub.
const deleteSequenceOutputSchema = buildResponseSchema(
  z
    .object({
      id: z.number().int().positive().optional(),
      status: z.string().optional(),
    })
    .loose(),
)

// Single-step shape from app/app/views/api/campaigns/follow_ups/show.jbuilder
// (GET /sequences/:sequence_id/follow-ups/:id routes to
// Api::Campaigns::FollowUpsController#show). Same field set as the list items
// in followUpSchema above, but `subject` is the RAW stored subject rendered
// via `.to_s` — a step that inherits the previous step's subject shows the
// inheritance placeholder instead of the resolved text (the list's
// display_subject resolves it) — so it is always a string, never null.
// `message_format` admits null for legacy rows (see followUpSchema).
const followUpDetailSchema = z.object({
  id: z.number().int().positive(),
  step: z.number().int().nonnegative(),
  wait_days: z.number().int().nonnegative(),
  message_format: z.union([z.enum(["text", "html"]), z.null()]),
  messages_sent: z.number().int().nonnegative(),
  subject: z.string(),
  body: z.string(),
  variant: nullableString(),
})

const getSequenceFollowUpOutputSchema = buildResponseSchema(followUpDetailSchema)

// Created-step shape from app/app/views/api/campaigns/follow_ups/create.jbuilder
// (POST /sequences/:sequence_id/follow-ups → Api::Campaigns::FollowUpsController
// #create, 201). The payload nests under `follow_up` and differs from the show
// shape: no `messages_sent`/`variant`, and `subject`/`body` are the raw
// nullable columns (a blank subject on a follow-up step is stored as the
// inheritance placeholder by the model's before_save, but null can still
// surface). The jbuilder additionally emits the parent's internal numeric id
// under a legacy key that is intentionally NOT declared here — hence
// `.loose()` at both levels so schema-validating clients aren't broken by it.
// `meta.params` echoes the request's sequence_id/step/wait_days back as raw
// request params (strings or null, not casts).
const createSequenceFollowUpDataSchema = z
  .object({
    follow_up: z
      .object({
        id: z.number().int().positive(),
        step: z.number().int().nonnegative(),
        wait_days: z.number().int().nonnegative(),
        subject: nullableString(),
        body: nullableString(),
        message_format: z.union([z.enum(["text", "html"]), z.null()]),
      })
      .loose(),
  })
  .loose()

const createSequenceFollowUpMetaSchema = z
  .object({
    params: z
      .object({
        sequence_id: z.union([z.string(), z.number(), z.null()]).optional(),
        step: z.union([z.string(), z.number(), z.null()]).optional(),
        wait_days: z.union([z.string(), z.number(), z.null()]).optional(),
      })
      .loose()
      .optional(),
  })
  .loose()

const createSequenceFollowUpOutputSchema = buildResponseSchema(
  createSequenceFollowUpDataSchema,
  createSequenceFollowUpMetaSchema,
)

// Shared writable fields for Create-Sequence / Update-Sequence, mirroring the
// permitted params in Api::SequencesController#build_sequence_params plus the
// request-shape validations in
// app/app/controllers/concerns/api/sequences/validations.rb.
// `ai_assistant_enabled` is deliberately NOT exposed: enabling it requires AI
// settings this API cannot create (422 ai_assistant_requires_settings).
// Arrays require at least one entry because the Rails form encoding drops an
// empty array entirely, which Rails would read as "leave unchanged" — a
// silent no-op instead of the clear the caller intended.
const sequenceWriteFields = {
  email_account_ids: z
    .array(z.number().int().positive())
    .min(1)
    .optional()
    .describe(
      "IDs of the connected email accounts to send from (see List-Email-Accounts). They must belong to the sequence owner; unknown ids are rejected (unknown_email_account_ids)",
    ),
  schedule_days: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .optional()
    .describe("Days of the week the sequence may send, as integers 0 (Sunday) through 6 (Saturday)"),
  schedule_time_start: z
    .number()
    .int()
    .min(0)
    .max(86399)
    .optional()
    .describe(
      "Start of the daily sending window, in seconds since midnight (0-86399); must be before schedule_time_end",
    ),
  schedule_time_end: z
    .number()
    .int()
    .min(0)
    .max(86399)
    .optional()
    .describe(
      "End of the daily sending window, in seconds since midnight (0-86399); must be after schedule_time_start",
    ),
  start_at: z
    .string()
    .optional()
    .describe(
      "Scheduled start date, YYYY-MM-DD; cannot be in the past. Pass an empty string to clear a scheduled start",
    ),
  bcc_recipient: z
    .string()
    .optional()
    .describe("Email address BCC'd on every message the sequence sends. Pass an empty string to clear it"),
  tracked: z.boolean().optional().describe("Whether email opens are tracked"),
  tracked_links: z
    .boolean()
    .optional()
    .describe(
      "Whether link clicks are tracked. Premium plans only — enabling on other plans is rejected (tracked_links_requires_premium)",
    ),
  add_unsubscribe_link: z
    .boolean()
    .optional()
    .describe(
      "Whether an unsubscribe link is appended to outgoing emails (editable even after the sequence has started)",
    ),
}

interface SequenceWriteArgs {
  name?: string
  email_account_ids?: number[]
  schedule_days?: number[]
  schedule_time_start?: number
  schedule_time_end?: number
  start_at?: string
  bcc_recipient?: string
  tracked?: boolean
  tracked_links?: boolean
  add_unsubscribe_link?: boolean
}

// Rails-form-style body builder shared by Create-Sequence and Update-Sequence.
// Scalars become strings, arrays become `key[]=` entries (buildRailsFormBody),
// and absent fields are omitted entirely so Rails treats them as
// "leave unchanged" on update.
function buildSequenceWriteParams(args: SequenceWriteArgs): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {}
  if (args.name !== undefined) params.name = args.name
  if (args.email_account_ids !== undefined) params.email_account_ids = args.email_account_ids.map(String)
  if (args.schedule_days !== undefined) params.schedule_days = args.schedule_days.map(String)
  if (args.schedule_time_start !== undefined) params.schedule_time_start = String(args.schedule_time_start)
  if (args.schedule_time_end !== undefined) params.schedule_time_end = String(args.schedule_time_end)
  if (args.start_at !== undefined) params.start_at = args.start_at
  if (args.bcc_recipient !== undefined) params.bcc_recipient = args.bcc_recipient
  if (args.tracked !== undefined) params.tracked = String(args.tracked)
  if (args.tracked_links !== undefined) params.tracked_links = String(args.tracked_links)
  if (args.add_unsubscribe_link !== undefined) params.add_unsubscribe_link = String(args.add_unsubscribe_link)
  return params
}

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
      return callHunterApi({ path: `/sequences/${sequence_id}/follow-ups`, apiKey, baseUrl, params })
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
      annotations: PRIVATE_WRITE_ANNOTATIONS,
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
      // stays false: archiving toggles state in the user's own account; only
      // Start-Sequence sends externally. HUN-20797.
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
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
        "Use this when the user wants to see how a sequence is performing. Reports recipient-based stats for a sequence plus a per-follow-up breakdown. The top-level engagement totals (`sent`, `delivered`, `opened`, `clicked`, `replied`, `unsubscribed_recipients`) count DISTINCT recipients — e.g. `replied` is the number of recipients who replied at least once, not the number of reply messages — and `delivered` is the recipients who received at least one non-bounced email (`recipients_count` is all recipients ever added to the sequence). `bounced` is message-based (a bounce is an SMTP-level event). The rate fields (`open_rate`, `click_rate`, `reply_rate`, `bounce_rate`, `unsubscribed_recipients_rate`) are floats in the 0.0-1.0 range — multiply by 100 to present them as percentages to the user — and are 0 when their denominator is 0; `open_rate`, `click_rate`, and `reply_rate` divide by distinct delivered recipients, while `bounce_rate` is message-based. The `follow_ups` array reports MESSAGE-based metrics per step (ordered by step, then variant; `variant` is null for the default follow-up or A/B for A/B-tested steps), so per-step counts do not sum to the recipient-based top-level totals. Returns a not-found error if the sequence does not exist or belongs to another team. Free to call.",
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

  // Filters and pagination from Api::SequencesController#index:
  // `params.permit(:started, :archived)` feeds a `.where(...)` on the team's
  // sequences (ordered id DESC), and Api::Concerns::Pagination validates
  // limit (1-100, default 20) / offset (0-10,000; 100,000 for premium).
  server.registerTool(
    TOOL_NAMES.listSequences,
    {
      description:
        "Use this when the user wants to list the sequences in their Hunter account with name, lifecycle booleans (started/archived/paused), recipient count, and owner, most recent first. Optionally filter by `started` and/or `archived` state and paginate with `limit`/`offset`. New sequences can be created with Create-Sequence and inspected in full with Get-Sequence. Free to call.",
      inputSchema: {
        started: z
          .boolean()
          .optional()
          .describe(
            "Filter by started state: true returns only sequences that have been started, false only drafts that were never started",
          ),
        archived: z
          .boolean()
          .optional()
          .describe("Filter by archived state: true returns only archived sequences, false only non-archived ones"),
        offset: z.number().int().nonnegative().optional().describe("Number of sequences to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of sequences to return (default 20, max 100)"),
      },
      outputSchema: listSequencesOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ started, archived, offset, limit }) => {
      const params: Record<string, string> = {}
      if (started !== undefined) params.started = String(started)
      if (archived !== undefined) params.archived = String(archived)
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: "/sequences", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.getSequence,
    {
      description:
        "Use this when the user wants to inspect one sequence's full configuration. Returns the lifecycle `status` (draft, planned, active, paused, completed, preparing, error, or archived) plus the raw `started`/`paused`/`archived` booleans, the `schedule` (start_at date, daily sending window as HH:MM strings, days of week as integers 0=Sunday..6=Saturday), the `settings` (open tracking, link tracking, unsubscribe link, AI assistant, BCC recipient), the sender `email_account_ids`, a `follow_ups` step summary (unique_steps_count and step numbers — use List-Sequence-Follow-Ups for the step contents), `recipients_count`, and the `owner`. Returns a not-found error if the sequence does not exist or belongs to another team. Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence to fetch"),
      },
      outputSchema: sequenceDetailOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ sequence_id }) => {
      // On 404 (sequence does not exist or belongs to another team)
      // callHunterApi returns the typed error envelope unchanged.
      return callHunterApi({ path: `/sequences/${sequence_id}`, apiKey, baseUrl })
    },
  )

  // POST /sequences (Api::SequencesController#create) persists a DRAFT
  // (started: false, paused: false) owned by the caller and auto-creates the
  // introduction step 0 with an empty subject/body (create_first_follow_up,
  // app/app/models/campaign.rb). Request-shape 422s come from the Validations
  // concern (name_required, unknown_email_account_ids, invalid_schedule_days,
  // invalid_schedule_window, start_at_in_the_past, ...). callHunterApi adds
  // the Idempotency-Key header automatically on every POST; this endpoint
  // enforces it server-side (Api::Concerns::Idempotency), so a duplicated
  // delivery replays the stored response instead of creating twice.
  server.registerTool(
    TOOL_NAMES.createSequence,
    {
      description:
        "Use this when the user wants to create a new outreach sequence. Only `name` is required; the sequence is created as a DRAFT that sends nothing until it is started. Lifecycle: draft → started (Start-Sequence) → paused/archived — the schedule and sender fields lock once started, so configure them while drafting. Optional fields: sender `email_account_ids` (connected email accounts — see List-Email-Accounts; unknown ids are rejected with unknown_email_account_ids), `schedule_days` (0=Sunday..6=Saturday), the daily sending window `schedule_time_start`/`schedule_time_end` (seconds since midnight, start before end), a `start_at` date (YYYY-MM-DD, not in the past), `bcc_recipient`, and tracking toggles (`tracked_links` requires a premium plan). The introduction email (step 0) is created automatically with an empty subject and body, and the v2 API has no endpoint to fill it in yet — its subject and body currently must be edited in the Hunter dashboard, so a sequence created purely through the API cannot be started until step 0 is authored there (Start-Sequence fails validation while step 0 is blank). Typical next steps: open the sequence in the Hunter dashboard to write the introduction email, author any follow-up steps with Create-Sequence-Follow-Up, add recipients with Add-Sequence-Recipients, then launch with Start-Sequence (a connected email account, subject, and message body are required to start). Free to call.",
      inputSchema: {
        name: z.string().min(1).describe("Name of the new sequence (required; must not be blank)"),
        ...sequenceWriteFields,
      },
      outputSchema: sequenceDetailOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async (args) => {
      const result = await callHunterApi({
        path: "/sequences",
        apiKey,
        baseUrl,
        method: "POST",
        params: buildSequenceWriteParams(args),
      })
      // On 422 (validation ids above) callHunterApi returns the typed error
      // envelope unchanged — skip the deep-link id extraction on errors.
      if (result.isError) return result
      return withDeepLinkFromId(result, (id) => `/sequences/${id}`)
    },
  )

  // PUT /sequences/:id (Api::SequencesController#update). Once the sequence
  // has started or been archived, the LOCKED_AFTER_START set
  // (app/app/controllers/concerns/api/sequences/validations.rb — schedule
  // window/days, start_at, email_account_ids, bcc_recipient, tracked,
  // tracked_links) is rejected with 422 sequence_locked; unchanged-value
  // snapshot replays are stripped and tolerated. HUN-18638.
  server.registerTool(
    TOOL_NAMES.updateSequence,
    {
      description:
        "Use this when the user wants to modify an existing sequence's name, schedule, senders, or settings; omitted fields are left unchanged. On a draft every field is editable. Once the sequence has STARTED or been ARCHIVED, the schedule and sender fields are locked: changing `schedule_time_start`, `schedule_time_end`, `schedule_days`, `start_at`, `email_account_ids`, `bcc_recipient`, `tracked`, or `tracked_links` is rejected with an invalid_input error (id sequence_locked) — only `name` and `add_unsubscribe_link` (a compliance lever) stay editable, and re-sending an unchanged value is tolerated. Other validation failures return field-specific errors (unknown_email_account_ids, invalid_schedule_days, invalid_schedule_window, start_at_in_the_past, tracked_links_requires_premium, ...). Returns the updated sequence. Returns a not-found error if the sequence does not exist or belongs to another team. Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence to update"),
        name: z.string().min(1).optional().describe("New name for the sequence"),
        ...sequenceWriteFields,
      },
      outputSchema: sequenceDetailOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ sequence_id, ...rest }) => {
      // On 422 (sequence_locked / validation ids above), 403 (not the owner
      // and not a team owner/admin), or 404 callHunterApi returns the typed
      // error envelope unchanged.
      const result = await callHunterApi({
        path: `/sequences/${sequence_id}`,
        apiKey,
        baseUrl,
        method: "PUT",
        params: buildSequenceWriteParams(rest),
      })
      return withDeepLink(result, `/sequences/${sequence_id}`)
    },
  )

  // DELETE /sequences/:id (Api::SequencesController#destroy) — drafts only:
  // a started or archived sequence 422s with sequence_not_destroyable.
  // Deletion is permanent (no soft-delete or undo via the API), so this tool
  // hard-gates on explicit user confirmation exactly like Start-Sequence: the
  // first call never touches the DELETE endpoint.
  server.registerTool(
    TOOL_NAMES.deleteSequence,
    {
      description:
        "Use this when the user wants to permanently delete a DRAFT sequence. Deletion is drafts-only: a started or archived sequence cannot be deleted (invalid_input error, id sequence_not_destroyable) — archive a finished sequence instead. Deletion is permanent and cannot be undone; it removes the sequence together with its steps and staged recipients, so always confirm with the user first: the first call returns a confirmation prompt (mentioning how many recipients would be removed) WITHOUT deleting anything, and only re-issuing with `confirmed: true` actually deletes the sequence. Returns a not-found error if the sequence does not exist or belongs to another team. Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence to delete"),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat that the draft sequence should be permanently deleted. The first invocation (without confirmed) returns an ask_user nextAction; the second invocation (with confirmed: true) actually deletes the sequence.",
          ),
      },
      outputSchema: deleteSequenceOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ sequence_id, confirmed }) => {
      if (!confirmed) {
        // Hard gate: short-circuit and emit ask_user with pendingToolCall.
        // No DELETE until the model re-issues with confirmed: true. Reuse the
        // Start-Sequence recipient-count fetch so the prompt states the blast
        // radius; on a slow/failed count, fall back to generic phrasing.
        const recipient_count = await fetchRecipientCount(sequence_id, apiKey, baseUrl)
        const affectedPhrase =
          recipient_count !== null
            ? `its ${recipient_count} staged recipient${recipient_count === 1 ? "" : "s"}`
            : "all of its staged recipients"
        const stub: McpTextResult = {
          content: [
            {
              type: "text" as const,
              text: `Awaiting user confirmation to delete sequence ${sequence_id}.`,
              annotations: { audience: ["user"] },
            },
          ],
          structuredContent: {
            data: { id: sequence_id, status: "awaiting_confirmation" },
          },
        }
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `Confirm: permanently delete sequence ${sequence_id}? This removes the draft, its steps, and ${affectedPhrase}. This cannot be undone.`,
            pendingToolCall: {
              tool: TOOL_NAMES.deleteSequence,
              args: { sequence_id, confirmed: true },
            },
          }),
        )
      }

      // On 422 (started/archived → sequence_not_destroyable), 403 (not the
      // owner and not a team owner/admin), or 404 callHunterApi returns the
      // typed error envelope unchanged. Success is `head :no_content`, which
      // callHunterApi synthesises into the ack envelope declared above.
      const result = await callHunterApi({
        path: `/sequences/${sequence_id}`,
        apiKey,
        baseUrl,
        method: "DELETE",
      })
      if (result.isError) return result
      return embedNextAction(
        result,
        buildNextAction({
          kind: "complete",
          summary: `Sequence ${sequence_id} deleted.`,
        }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.getSequenceFollowUp,
    {
      description:
        "Use this when the user wants to inspect a single step of a sequence by its follow-up ID (from List-Sequence-Follow-Ups). Returns the step number (0 is the introduction email), `wait_days`, `subject`, `body`, `message_format` (text or html), `messages_sent`, and `variant` (null, or A/B for A/B-tested steps). Unlike List-Sequence-Follow-Ups, `subject` is returned raw: a step that inherits the previous step's subject shows an inheritance placeholder instead of the resolved text. Returns a not-found error if the sequence or the step does not exist or belongs to another team. Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence the step belongs to"),
        follow_up_id: z
          .number()
          .int()
          .positive()
          .describe("ID of the follow-up step to fetch (from List-Sequence-Follow-Ups)"),
      },
      outputSchema: getSequenceFollowUpOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ sequence_id, follow_up_id }) => {
      // On 404 (sequence or step not found / other team) callHunterApi
      // returns the typed error envelope unchanged.
      return callHunterApi({ path: `/sequences/${sequence_id}/follow-ups/${follow_up_id}`, apiKey, baseUrl })
    },
  )

  // POST /sequences/:sequence_id/follow-ups
  // (Api::Campaigns::FollowUpsController#create). The step number is
  // auto-assigned under a per-sequence lock (max(step) + 1) when omitted; a
  // sequence holds at most 6 unique steps INCLUDING the introduction
  // (app/app/models/follow_up.rb, per-sequence step-limit validation).
  // `message_template_id` pre-fills subject/body/message_format from the
  // team's saved template for whichever of those params are blank
  // (apply_template_defaults) — a non-existent template id is silently
  // ignored, not an error. The model rejects creation on an actively-sending
  // or archived sequence and caps wait_days at 30. callHunterApi adds the
  // Idempotency-Key header automatically on every POST.
  server.registerTool(
    TOOL_NAMES.createSequenceFollowUp,
    {
      description:
        "Use this when the user wants to add an email step to a sequence. Author the sequence step-by-step in conversation: draft the `subject` and `body` with the user, set `wait_days` (days after the previous step, 0-30), create the step, then show the updated step list with List-Sequence-Follow-Ups. Also offer the team's saved templates (List-Message-Templates): passing `message_template_id` pre-fills whichever of `subject`, `body`, and `message_format` are left blank. The step number is assigned automatically after the current last step, so this tool always appends a new follow-up and can never target step 0 — the introduction email (step 0), created together with the sequence with an empty subject and body, has no v2 API endpoint to fill it in yet and currently must be authored in the Hunter dashboard before Start-Sequence will pass validation. Omitting `subject` makes the step inherit the previous step's subject so the emails thread together. A sequence holds at most 6 steps in total (the introduction plus up to 5 follow-ups); exceeding that, or adding to an actively sending sequence (pause it first) or an archived one, is rejected with an invalid_input error. Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence to add the step to"),
        subject: z
          .string()
          .optional()
          .describe(
            "Email subject. When omitted, the step inherits the previous step's subject so replies thread together (or takes the template's subject when message_template_id is set)",
          ),
        body: z
          .string()
          .optional()
          .describe(
            "Email body — plain text or HTML depending on message_format. Merge fields like {{first_name}} must carry fallback values. Required unless message_template_id supplies it",
          ),
        wait_days: z
          .number()
          .int()
          .min(0)
          .max(30)
          .optional()
          .describe("Days to wait after the previous step before this one sends (0-30, default 0)"),
        message_format: z
          .enum(["text", "html"])
          .optional()
          .describe("Body format; defaults to html (or the template's format when message_template_id is set)"),
        message_template_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "ID of a saved message template (see List-Message-Templates) whose subject, body, and format pre-fill whichever of those fields are left blank. A non-existent template id is silently ignored",
          ),
      },
      outputSchema: createSequenceFollowUpOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ sequence_id, subject, body, wait_days, message_format, message_template_id }) => {
      // Fail fast when neither a body nor a template that supplies one is given.
      // The Rails FollowUp create path (Api::Campaigns::FollowUpsController#create)
      // accepts a blank body — the body-presence check only runs at Start-Sequence
      // time (FollowUp#validate_subject_and_body_presence, on :update). Since the
      // v2 API exposes no update-follow-up endpoint, a body-less step created here
      // is unfixable except by delete + recreate, so reject it locally before the
      // round-trip. `message_template_id` is accepted even with a blank body
      // because apply_template_defaults fills body from the template server-side.
      if ((body === undefined || body.trim() === "") && message_template_id === undefined) {
        const message =
          "Provide `body` (a non-empty email body) or `message_template_id` — a step created without either has no body, cannot be started, and the v2 API has no update-follow-up tool to fix it (you would have to delete and recreate the step)."
        return {
          content: [{ type: "text" as const, text: message, annotations: { audience: ["user"] } }],
          structuredContent: { error: { code: "invalid_input" as const, retryable: false, field: "body", message } },
          isError: true,
        }
      }
      const params: Record<string, string> = {}
      if (subject !== undefined) params.subject = subject
      if (body !== undefined) params.body = body
      if (wait_days !== undefined) params.wait_days = String(wait_days)
      if (message_format !== undefined) params.message_format = message_format
      if (message_template_id !== undefined) params.message_template_id = String(message_template_id)
      // On 422 (step limit reached, actively-sending or archived sequence,
      // wait_days out of range, missing merge-field fallbacks) or 404
      // callHunterApi returns the typed error envelope unchanged.
      const result = await callHunterApi({
        path: `/sequences/${sequence_id}/follow-ups`,
        apiKey,
        baseUrl,
        method: "POST",
        params,
      })
      return withDeepLink(result, `/sequences/${sequence_id}`)
    },
  )

  // DELETE /sequences/:sequence_id/follow-ups/:id
  // (Api::Sequences::FollowUpsController#destroy). The controller guards
  // reject the introduction (step 0), A/B-test variants, and archived or
  // scheduled-to-start sequences with 422 validation_failed; the model's
  // before_destroy guards (app/app/models/follow_up.rb) additionally enforce
  // last-step-only deletion ("can't be removed; only the last one can"),
  // reject steps that already sent messages, and reject an actively sending
  // sequence. Success is `head :no_content`, so callHunterApi synthesises a
  // mutationAckSchema-shaped payload — the outputSchema MUST be
  // mutationAckSchema, not a buildResponseSchema envelope.
  server.registerTool(
    TOOL_NAMES.deleteSequenceFollowUp,
    {
      description:
        "Use this when the user wants to remove a step from a sequence. Only the LAST step can be deleted — to redo an earlier step, delete steps from the end back down to it, then re-create them. Deletion is rejected with an invalid_input error when the step is the introduction (step 0 can never be deleted), is not the last step, already has sent messages, is part of an A/B test (disable A/B testing first), or when the sequence is actively sending (pause it first), scheduled to start, or archived. On success the step is permanently removed and an acknowledgement is returned. Returns a not-found error if the sequence or the step does not exist or belongs to another team. Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence the step belongs to"),
        follow_up_id: z
          .number()
          .int()
          .positive()
          .describe("ID of the follow-up step to delete (from List-Sequence-Follow-Ups)"),
      },
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ sequence_id, follow_up_id }) => {
      // On 422 (guards above) or 404 callHunterApi returns the typed error
      // envelope unchanged.
      return callHunterApi({
        path: `/sequences/${sequence_id}/follow-ups/${follow_up_id}`,
        apiKey,
        baseUrl,
        method: "DELETE",
      })
    },
  )

  server.registerTool(
    TOOL_NAMES.listSequenceRecipients,
    {
      description:
        "Use this when the user wants to list the recipients of a sequence with per-recipient status. Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence"),
        offset: z.number().int().nonnegative().optional().describe("Number of recipients to skip"),
        limit: z.number().int().positive().max(100).optional().describe("Maximum number of recipients to return"),
      },
      outputSchema: listRecipientsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ sequence_id, offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({
        path: `/sequences/${sequence_id}/recipients`,
        apiKey,
        baseUrl,
        params,
      })
    },
  )

  // Add-Sequence-Recipients uses WRITE_ANNOTATIONS (openWorldHint: true): for an
  // ALREADY-STARTED sequence, adding a recipient enqueues message creation
  // (Campaigns::CreateMessagesForRecipientJob — app/models/campaign/audience.rb)
  // so it can schedule real outbound email to external recipients WITHOUT a
  // separate Start-Sequence call. That externally-visible send is open-world, so
  // this is NOT a private-only staging write. (HUN-20797; Codex review on #13429)
  server.registerTool(
    TOOL_NAMES.addSequenceRecipients,
    {
      description:
        "Use this when the user wants to add recipients to an existing sequence by email address or by lead ID. Up to 50 per call; batch larger sets across multiple calls. For a draft (not-yet-started) sequence this only stages recipients and does not send email — use Start-Sequence to begin sending. For an ALREADY-STARTED sequence, adding a recipient can immediately schedule a real outbound email to that recipient (no separate Start-Sequence call). Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence"),
        emails: z
          .array(z.string().email().max(254))
          .max(50)
          .optional()
          .describe("Email addresses to add as recipients (max 50)"),
        lead_ids: z
          .array(z.number().int().positive())
          .max(50)
          .optional()
          .describe("Lead IDs to add as recipients (max 50)"),
      },
      outputSchema: addRecipientsOutputSchema.shape,
      annotations: WRITE_ANNOTATIONS,
    },
    async ({ sequence_id, emails, lead_ids }) => {
      const params: Record<string, string | string[]> = {}
      if (emails) params.emails = emails
      if (lead_ids) params.lead_ids = lead_ids.map(String)
      const result = await callHunterApi({
        path: `/sequences/${sequence_id}/recipients`,
        apiKey,
        baseUrl,
        method: "POST",
        params,
      })
      return withDeepLink(result, `/sequences/${sequence_id}`)
    },
  )

  // Remove-Sequence-Recipients uses PRIVATE_DESTRUCTIVE_ANNOTATIONS
  // (destructiveHint: true, openWorldHint: false). The v2 DELETE handler calls
  // campaign.cancel_messages_to_recipients (app/models/campaign.rb) — this is
  // NOT blocked on started sequences (the started-guard lives in the unused
  // remove_recipients path, app/models/campaign/audience.rb). It cancels the
  // recipient's PENDING (not-yet-sent) outbound messages and their future
  // pending follow-ups; already-sent messages are untouched. destructive: true
  // captures the lost queued progress. openWorld stays FALSE because canceling
  // an unsent message creates NO externally-visible artifact: the recipient was
  // never sent the email and still isn't, so nothing reaches the outside world.
  // This is the mirror of Add-Sequence-Recipients (open-world — it makes an
  // email arrive) and the same external-visibility posture as Pause-Sequence.
  // (HUN-20797; Cursor Bugbot review on #13429)
  server.registerTool(
    TOOL_NAMES.removeSequenceRecipients,
    {
      description:
        "Use this when the user wants to remove recipients from a sequence by email address. Pending messages scheduled for the removed recipients are cancelled; messages already sent are not recalled. Free to call.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence"),
        emails: z
          .array(z.string().email().max(254))
          .min(1)
          .max(50)
          .describe("Email addresses to remove from the sequence"),
      },
      outputSchema: removeRecipientsOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ sequence_id, emails }) => {
      const result = await callHunterApi({
        path: `/sequences/${sequence_id}/recipients`,
        apiKey,
        baseUrl,
        method: "DELETE",
        params: { emails },
      })
      return withDeepLink(result, `/sequences/${sequence_id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.startSequence,
    {
      description:
        "Use this when the user wants to start an existing sequence, which begins sending real emails to its recipients. The sequence must have a subject, message body, and connected email account configured. Free to call. Starting a sequence sends real emails to recipients and requires an explicit user confirmation: the first call returns a confirmation prompt without sending, and only re-issuing with `confirmed: true` actually starts the sequence.",
      inputSchema: {
        sequence_id: z.number().int().positive().describe("ID of the sequence to start"),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat that real emails should be sent. The first invocation (without confirmed) returns an ask_user nextAction; the second invocation (with confirmed: true) actually starts the sequence.",
          ),
      },
      outputSchema: startSequenceOutputSchema.shape,
      annotations: EXTERNAL_SIDE_EFFECT_ANNOTATIONS,
    },
    async ({ sequence_id, confirmed }) => {
      if (!confirmed) {
        // Hard gate: short-circuit and emit ask_user with pendingToolCall.
        // No POST to /start until the model re-issues with confirmed: true.
        const recipient_count = await fetchRecipientCount(sequence_id, apiKey, baseUrl)
        const recipientPhrase =
          recipient_count !== null
            ? `${recipient_count} recipient${recipient_count === 1 ? "" : "s"}`
            : "all configured recipients"
        const stub: McpTextResult = {
          content: [
            {
              type: "text" as const,
              text: `Awaiting user confirmation to start sequence ${sequence_id}.`,
              annotations: { audience: ["user"] },
            },
          ],
          structuredContent: {
            data: { id: sequence_id, status: "awaiting_confirmation" },
          },
        }
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `Confirm: start sequence ${sequence_id}? This will send real emails to ${recipientPhrase}. This action cannot be undone.`,
            pendingToolCall: {
              tool: TOOL_NAMES.startSequence,
              args: { sequence_id, confirmed: true },
            },
          }),
        )
      }

      const result = await callHunterApi({
        path: `/sequences/${sequence_id}/start`,
        apiKey,
        baseUrl,
        method: "POST",
      })
      if (result.isError) return result

      // Hunter Rails endpoint returns HTTP 200 with data.message:
      // "Sequence already started." when the sequence is already running.
      // Surface as isError so the model doesn't relay a no-op as success.
      const response = parseHunterApiResponse<StartSequenceResponse>(result)
      if (response?.data?.message === ALREADY_STARTED_MESSAGE) {
        return { ...result, isError: true }
      }

      return embedNextAction(
        withDeepLink(result, `/sequences/${sequence_id}`),
        buildNextAction({
          kind: "complete",
          summary: `Sequence ${sequence_id} started.`,
        }),
      )
    },
  )
}
