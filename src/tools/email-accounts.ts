import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { callHunterApi, PRIVATE_READ_ANNOTATIONS, TOOL_NAMES } from "../helpers"
import { buildResponseSchema, nullableBoolean, nullableString, paginationMetaSchema } from "../schemas/common"

// Per-item shape from app/app/views/api/email_accounts/_email_account.jbuilder.
// Leaf is strict (no `.loose()`) so a jbuilder typo surfaces in vitest; the
// envelope is loose via buildResponseSchema. `sending_status` is one of
// active | paused | warming (the model derives it: active by default, paused
// when disconnected, warming during ramp-up or warmup). first_name/last_name
// come from `email_account.user&.first_name` so they can be null, and `email`
// is the nullable `send_email_as` column emitted raw, so it can be null too —
// admit null to avoid an SDK output-validation rejection (HUN-20344 bug class).
const emailAccountSchema = z.object({
  id: z.number().int(),
  email: nullableString(),
  first_name: nullableString(),
  last_name: nullableString(),
  sending_status: z.enum(["active", "paused", "warming"]),
  daily_limit: z.number().int(),
  provider: z.string(),
})

// index.jbuilder emits `json.data @email_accounts do |email_account| ...`, so
// `data` is an ARRAY of email accounts (not a `{ email_accounts: [...] }`
// object). `meta` carries `{ total, limit, offset }`.
const listEmailAccountsOutputSchema = buildResponseSchema(z.array(emailAccountSchema), paginationMetaSchema)

// ─── Email account inspection (HUN-20864 / HUN-20865) ───────────────────────
//
// Full config shape from app/app/views/api/email_accounts/show.jbuilder
// (Api::EmailAccountsController#show): the `_email_account` partial fields
// above plus sender_name (`display_name`, a nullable column), default_account,
// signature (the sanitized signature HTML, or null when none is stored — the
// controller mirrors the dashboard serializer: managed-mailbox signature
// first, then the locally-stored provider signature run through HtmlCleaner),
// profile_picture_url (a Gravatar URL, null when the owner user is gone),
// custom_tracking_domain (the team's verified + SSL-ready custom domain value,
// null otherwise — the shared Hunter fallback domains are never surfaced), the
// sending_schedule, and the warmup summary. The jbuilder emits NO credentials:
// OAuth/SMTP tokens never leave the controller, and this leaf is a plain
// z.object (Zod default strip) so any secret-ish field a future revision might
// add is dropped at parse time and never reaches the model — a deliberate
// schema bump would be needed to surface it (asserted in vitest).
//
// sending_schedule is the REQUESTER's default send windows, not the account
// owner's (Outreach::Settings.new(Current.user) in the controller): a sequence
// created via this API is owned by the requester, so these are the windows it
// would actually run on.
const sendingScheduleSchema = z.object({
  // The requester's default schedule days (integer[] column). Backfilled by a
  // before_validation (Mon-Fri) but nullable at the column level
  // (db/structure.sql), so admit null for legacy rows.
  days: z.union([z.array(z.number().int()), z.null()]),
  // "HH:MM" strings formatted from the seconds-since-midnight columns
  // (format_schedule_time), null when unset.
  start_time: nullableString(),
  end_time: nullableString(),
  // Falls back to "UTC" in Outreach::Settings#time_zone, so always a string.
  time_zone: z.string(),
})

const warmupSchema = z.object({
  enabled: z.boolean(),
  // EmailAccount::Warmup::Mailbox status enum (pending_oauth | in_progress |
  // paused | finished; the has_one excludes finished), or null when the
  // account has no live warmup mailbox. Typed as a plain string, not an enum,
  // so a future status doesn't invalidate the whole response.
  status: nullableString(),
  // ISO 8601 date, or null when the mailbox has no end date (or none exists).
  end_date: nullableString(),
})

const emailAccountDetailSchema = z.object({
  id: z.number().int(),
  email: nullableString(),
  first_name: nullableString(),
  last_name: nullableString(),
  sending_status: z.enum(["active", "paused", "warming"]),
  daily_limit: z.number().int(),
  provider: z.string(),
  sender_name: nullableString(),
  // `default_account` is a NULLABLE boolean column (db/structure.sql: no NOT
  // NULL, no default) emitted raw by show.jbuilder. Legacy rows predating the
  // default-sender backfill render as `default_account: null` — the dashboard
  // itself coalesces this with `?? false` (email_account_sidepanel.tsx). A
  // strict `z.boolean()` would reject the WHOLE response for those rows at SDK
  // output validation, so admit null (HUN-20344 bug class).
  default_account: nullableBoolean(),
  signature: nullableString(),
  profile_picture_url: nullableString(),
  custom_tracking_domain: nullableString(),
  sending_schedule: sendingScheduleSchema,
  warmup: warmupSchema,
})

const getEmailAccountOutputSchema = buildResponseSchema(emailAccountDetailSchema)

// Per-item shape from app/app/views/api/email_accounts/sequences/index.jbuilder
// (Api::EmailAccounts::SequencesController#index): id, name, status,
// recipients_allocated (recipients assigned to THIS account within the
// sequence, canceled ones excluded), and emails_scheduled (emails still
// waiting to be sent FROM this account). `status` is the lightweight
// column-only label (draft | planned | active | paused | archived — the
// finer-grained states like preparing/completed/error collapse into "active";
// Get-Sequence exposes the full status). Typed as a plain string, not an
// enum, so a future lifecycle state doesn't invalidate responses. Leaf is
// strict (no `.loose()`) so a jbuilder typo surfaces in vitest; the envelope
// stays loose via buildResponseSchema.
const emailAccountSequenceSchema = z.object({
  id: z.number().int().positive(),
  // `campaigns.name` is nullable with no model presence validation, so an
  // unnamed dashboard sequence renders `name: null` here too (index.jbuilder
  // emits it raw) — admit null, matching the Get-Sequence schemas.
  name: nullableString(),
  status: z.string(),
  recipients_allocated: z.number().int().nonnegative(),
  emails_scheduled: z.number().int().nonnegative(),
})

// index.jbuilder emits `json.data @sequences do |sequence| ...`, so `data` is
// an ARRAY (not a `{ sequences: [...] }` object). `meta` carries
// `{ total, limit, offset }` — declare those explicitly.
const listEmailAccountSequencesOutputSchema = buildResponseSchema(
  z.array(emailAccountSequenceSchema),
  z
    .object({
      total: z.number().int().nonnegative(),
      limit: z.number().int(),
      offset: z.number().int(),
    })
    .loose(),
)

export function registerEmailAccountTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listEmailAccounts,
    {
      description:
        "Use this when the user wants to see the email accounts (sending inboxes) connected to their Hunter account, typically as the first step before creating or starting a sequence. Surface each account's `sending_status` clearly: `active` means it is ready to send, `paused` means it is disconnected and will not send until reconnected, and `warming` means it is in ramp-up or warmup and currently sends a reduced volume. Each entry also includes the sender's email, name, daily sending limit, and provider (such as gmail or outlook). Supports `limit` and `offset` pagination. Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of email accounts to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of email accounts to return (default 20, max 100)"),
      },
      outputSchema: listEmailAccountsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: "/email-accounts", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.getEmailAccount,
    {
      description:
        "Use this when the user wants to see how a specific sending email account is set up — e.g. \"how is alice@acme.com configured?\" — as a pre-check before suggesting changes to its settings. On top of the List-Email-Accounts fields (email, first/last name, `sending_status`, `daily_limit`, `provider`), it reports the `sender_name` shown on outgoing emails, whether it is the `default_account`, the email `signature` (sanitized HTML, null when none is stored), the owner's `profile_picture_url`, the team's `custom_tracking_domain` (null unless a verified custom tracking domain is configured), the default `sending_schedule` (days of week, HH:MM start/end times, and time zone) a new sequence sending from this account would run on, and the `warmup` state (`enabled`, `status`, `end_date`). Email account settings can NOT be changed through this API — inspection is read-only and settings writes are not yet available — so suggest changes for the user to apply in the hunter.io dashboard rather than offering to apply them. Returns a not-found error if the email account does not exist or is not one the user can manage. Free to call.",
      inputSchema: {
        email_account_id: z.number().int().positive().describe("ID of the email account to inspect"),
      },
      outputSchema: getEmailAccountOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ email_account_id }) => {
      // On 404 (account does not exist, or sits outside the plan-aware
      // editable set — cross-team accounts 404 rather than leak existence)
      // callHunterApi returns the typed error envelope unchanged.
      return callHunterApi({ path: `/email-accounts/${email_account_id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.listEmailAccountSequences,
    {
      description:
        'Use this when the user wants to know what is using a given email account — e.g. "which sequences send from alice@acme.com?" — as a dependency check before pausing, reconfiguring, or disconnecting an account. Pairs with List-Email-Accounts (find the account and its id) and Get-Email-Account (inspect its configuration). Each entry reports the sequence `id`, `name`, `status` (draft, planned, active, paused, or archived), `recipients_allocated` (recipients assigned to this account within the sequence, canceled recipients excluded), and `emails_scheduled` (emails still waiting to be sent from this account), most recent first. Archived sequences are excluded by default; pass `include_archived: true` to include them. Supports `limit` and `offset` pagination. Returns a not-found error if the email account does not exist or is not one the user can manage. Free to call.',
      inputSchema: {
        email_account_id: z
          .number()
          .int()
          .positive()
          .describe("ID of the email account whose sequences should be listed"),
        include_archived: z
          .boolean()
          .optional()
          .describe("Set to true to include archived sequences (excluded by default)"),
        offset: z.number().int().nonnegative().optional().describe("Number of sequences to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of sequences to return (default 20, max 100)"),
      },
      outputSchema: listEmailAccountSequencesOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ email_account_id, include_archived, offset, limit }) => {
      const params: Record<string, string> = {}
      if (include_archived !== undefined) params.include_archived = String(include_archived)
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: `/email-accounts/${email_account_id}/sequences`, apiKey, baseUrl, params })
    },
  )
}
