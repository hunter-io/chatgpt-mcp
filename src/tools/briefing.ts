import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { withCodexFullServerHint } from "../codex-hint"
import {
  type McpTextResult,
  type NextAction,
  PRIVATE_READ_ANNOTATIONS,
  READ_ONLY_PUBLIC_ANNOTATIONS,
  TOOL_NAMES,
  type ToolName,
  buildNextAction,
  callHunterApi,
  desc,
  embedNextAction,
  hunterLink,
  hunterResultText,
  withDeepLink,
} from "../helpers"
import { buildResponseSchema, nullableBoolean, nullableNumber, nullableString, nullish } from "../schemas/common"

// The Agent briefing endpoints of P-HUN-674 (HUN-24935): GET /v2/briefing,
// /v2/opportunities, /v2/opportunities/:id/results, /v2/signals and
// /v2/monitored-signals. All are free and read-only.
//
// Each handler keeps only the fields the output schemas declare: the endpoints
// leave out LinkedIn job, hiring and people-move data, and a field Rails adds
// later must not reach the model before someone checks it.
// remote-mcp/src/tools/briefing.ts is the main server's copy. This one has no Domain-Search, so the next steps
// differ, and it shows no person rows (HUN-23709).

// The tool behind each `next_call`, from its endpoint. The API text never picks
// the tool. Domain-Search, which every signal event names, is not in this app.
const NEXT_CALL_TOOLS: ReadonlyArray<readonly [RegExp, ToolName]> = [
  [/^GET \/v2\/signals$/, TOOL_NAMES.listSignals],
  [/^GET \/v2\/opportunities$/, TOOL_NAMES.listOpportunities],
  [/^GET \/v2\/opportunities\/\d+\/results$/, TOOL_NAMES.getOpportunityResults],
  [/^GET \/v2\/account$/, TOOL_NAMES.account],
]

function nextCallTool(endpoint: string): ToolName | null {
  return NEXT_CALL_TOOLS.find(([pattern]) => pattern.test(endpoint))?.[1] ?? null
}

const SIGNAL_EVENT_TYPES = ["funding_round", "technology_added", "technology_removed", "new_contact"] as const

const nextCallSchema = z.object({
  endpoint: z.string(),
  // The params Rails builds today. A param it adds later is dropped until it is declared here.
  params: z.object({
    source: z.string().optional(),
    since: z.string().optional(),
    limit: z.number().int().optional(),
    domain: z.string().optional(),
  }),
  mcp_tool: nullableString(),
  charges_credits: z.boolean(),
})

type NextCall = z.infer<typeof nextCallSchema>

function localNextCall(nextCall: NextCall): NextCall
function localNextCall(nextCall: NextCall | null): NextCall | null
function localNextCall(nextCall: NextCall | null): NextCall | null {
  return nextCall && { ...nextCall, mcp_tool: nextCallTool(nextCall.endpoint) }
}

// ─── Output schemas ─────────────────────────────────────────────────────────

const briefingItemSchema = z.object({
  type: z.string(),
  status: z.enum(["ok", "unavailable", "no_access"]),
  reason: nullableString(),
  count: z.union([z.number().int().nonnegative(), z.null()]),
  count_exact: nullableBoolean(),
  next_call: z.union([nextCallSchema, z.null()]),
  next_since: nullableString(),
})

const usageBucketSchema = z.object({
  used: z.number(),
  available: z.number(),
  remaining: z.number(),
  over_quota: z.number().optional(),
})

const briefingDataSchema = z.object({
  needs_attention: z.object({ items: z.array(briefingItemSchema) }),
  new_this_week: z.object({ items: z.array(briefingItemSchema) }),
  account: z.object({
    status: z.enum(["ok", "unavailable"]),
    plan_name: nullableString(),
    plan_level: z.union([z.number().int(), z.null()]),
    reset_date: nullableString(),
    requests: z.union([
      z.object({
        credits: usageBucketSchema.optional(),
        searches: usageBucketSchema.optional(),
        verifications: usageBucketSchema.optional(),
      }),
      z.null(),
    ]),
    next_call: z.union([nextCallSchema, z.null()]),
  }),
})

const briefingMetaSchema = z.object({ since: z.string(), next_since: z.string() })

const opportunitySchema = z.object({
  id: z.number().int(),
  type: z.string(),
  source: z.string(),
  description: z.string(),
  results_count: z.number().int(),
  score: z.number(),
  seen_at: nullableString(),
  created_at: z.string(),
  next_call: nextCallSchema,
})

const listMetaSchema = z.object({
  results: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})

// Only company rows reach the model here. A people opportunity's rows are
// parsed as this union and then dropped, so the declared shape stays the API's.
const opportunityPersonSchema = z.object({
  name: nullableString(),
  position: nullableString(),
  domain: z.string(),
})

const opportunityCompanySchema = z.object({
  domain: z.string(),
  // Optional: a Rails deploy older than this worker sends no company_name.
  company_name: nullish(z.string()),
  emails_count: z.object({
    personal: z.number().int(),
    generic: z.number().int(),
    total: z.number().int(),
  }),
})

const opportunityResultsMetaSchema = z.object({
  type: z.string(),
  results: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})

const signalEventSchema = z.object({
  id: nullableString(),
  source: z.string(),
  type: z.string(),
  occurred_at: z.string(),
  company: z.object({ domain: z.string(), name: nullableString() }),
  details: z.object({
    round_type: nullableString().optional(),
    amount_usd: nullableNumber().optional(),
    announced_on: nullableString().optional(),
    technology: z.object({ slug: z.string(), name: z.string() }).optional(),
  }),
  signal_id: z.union([z.number().int(), z.null()]),
  next_call: nextCallSchema,
})

const signalsMetaSchema = z.object({
  limit: z.number().int(),
  next_cursor: nullableString(),
  next_since: z.string(),
  window_start: z.string(),
  signals_included: z.array(z.number().int()).optional(),
  signals_skipped: z.array(z.number().int()).optional(),
})

// Rails' allow-list of Monitored Signal filters (Signals::Feed::MonitoredSignals).
const filterValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))])

const monitoredSignalSchema = z.object({
  id: z.number().int(),
  name: nullableString(),
  type: z.string(),
  status: z.string(),
  filters: z.object({
    countries: filterValueSchema.optional(),
    company_sizes: filterValueSchema.optional(),
    series: filterValueSchema.optional(),
    amount_raised_from: filterValueSchema.optional(),
    amount_raised_to: filterValueSchema.optional(),
    published_date: filterValueSchema.optional(),
    published_date_from: filterValueSchema.optional(),
    published_date_to: filterValueSchema.optional(),
    domain: filterValueSchema.optional(),
    updates: filterValueSchema.optional(),
  }),
  event_types: z.array(z.string()),
  created_at: z.string(),
})

const monitoredSignalsMetaSchema = z.object({
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})

const briefingOutputSchema = buildResponseSchema(briefingDataSchema, briefingMetaSchema)
const opportunitiesOutputSchema = buildResponseSchema(z.array(opportunitySchema), listMetaSchema)
const opportunityResultsOutputSchema = buildResponseSchema(
  z.array(opportunityCompanySchema),
  opportunityResultsMetaSchema,
)
const signalsOutputSchema = buildResponseSchema(z.array(signalEventSchema), signalsMetaSchema)
const monitoredSignalsOutputSchema = buildResponseSchema(z.array(monitoredSignalSchema), monitoredSignalsMetaSchema)

// ─── Inputs ─────────────────────────────────────────────────────────────────

// Any sub-second precision, so the `next_since` values Rails emits pass as they are.
const dateTimeSchema = z.iso.datetime({ offset: true })

const limitSchema = (what: string) =>
  z.number().int().min(1).max(100).optional().describe(`Maximum number of ${what} to return (default 20, max 100)`)

const offsetSchema = (what: string) =>
  z.number().int().nonnegative().optional().describe(`Number of ${what} to skip (default 0)`)

function pageParams(limit: number | undefined, offset: number | undefined): Record<string, string> {
  return {
    ...(limit !== undefined && { limit: String(limit) }),
    ...(offset !== undefined && { offset: String(offset) }),
  }
}

// ─── Result helpers ─────────────────────────────────────────────────────────

// Keeps only the declared fields of `data` and `meta`.
function keepDeclaredFields<D extends z.ZodType, M extends z.ZodType>(
  result: McpTextResult,
  dataSchema: D,
  metaSchema: M,
): { ok: true; result: McpTextResult; data: z.infer<D>; meta: z.infer<M> } | { ok: false; result: McpTextResult } {
  if (result.isError) return { ok: false, result }
  const parsed = z.object({ data: dataSchema, meta: metaSchema }).safeParse(result.structuredContent)
  if (!parsed.success) {
    console.warn(
      "briefing tools: unexpected Hunter response shape",
      parsed.error.issues.map((issue) => issue.path.join(".")),
    )
    const message = "Hunter returned a response in an unexpected shape. Try again later."
    return {
      ok: false,
      result: {
        content: [{ type: "text" as const, text: message, annotations: { audience: ["user"] } }],
        structuredContent: { error: { code: "upstream_error" as const, retryable: false, message } },
        isError: true,
      },
    }
  }
  // Zod cannot infer the shape of an object built from generic schemas.
  const body = parsed.data as { data: z.infer<D>; meta: z.infer<M> }
  return { ok: true, result, data: body.data, meta: body.meta }
}

function withBody(result: McpTextResult, structuredContent: Record<string, unknown>): McpTextResult {
  return {
    ...result,
    content: [
      { type: "text" as const, text: hunterResultText(structuredContent), annotations: { audience: ["user"] } },
    ],
    structuredContent,
  }
}

function finish(result: McpTextResult, path: string, tool: ToolName, nextAction: NextAction): McpTextResult {
  return embedNextAction(withDeepLink(result, path, tool.toLowerCase()), buildNextAction(nextAction))
}

// ─── Next steps ─────────────────────────────────────────────────────────────

const BRIEFING_REASONS: Partial<Record<ToolName, string>> = {
  [TOOL_NAMES.listSignals]:
    "Free. Reads the events behind this briefing item. Then tell the user every count in the briefing; count_exact false means at least that many.",
  [TOOL_NAMES.listOpportunities]:
    "Free. Lists this week's opportunities that this briefing counted. Then tell the user every count in the briefing.",
}

const NOTHING_NEW =
  "Nothing new to read since meta.since. Tell the user, with the plan and credits in data.account. An item with status unavailable could not be read now: call this tool again later. An item with status no_access is not in the plan or is turned off by a team setting (see its reason)."

function briefingNextAction(data: z.infer<typeof briefingDataSchema>): NextAction {
  const items = [...data.needs_attention.items, ...data.new_this_week.items].filter((item) => item.status === "ok")
  // A count of 0 that is not exact means that the first page held no event but more pages follow.
  // A real count comes first.
  const ordered = [
    ...items.filter((item) => (item.count ?? 0) > 0),
    ...items.filter((item) => !item.count && item.count_exact === false),
  ]
  for (const item of ordered) {
    const tool = item.next_call?.mcp_tool as ToolName | null | undefined
    const reason = tool && BRIEFING_REASONS[tool]
    if (tool && reason) return { kind: "call_tool", tool, reason, suggestedArgs: item.next_call!.params }
  }
  return { kind: "complete", summary: NOTHING_NEW }
}

const PEOPLE_IN_HUNTER =
  "This app does not show the people of an opportunity. Give the user the number of people and the viewInHunter link, where they see them in Hunter."

// ─── Tools ──────────────────────────────────────────────────────────────────

export function registerBriefingTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.getBriefing,
    {
      title: "Get Briefing",
      description: desc`Get a short summary of what is new in the user's Hunter account. It answers open questions such as "What should I do in Hunter today?" or "What is new in Hunter?". It returns the number of new lead signal events (funding rounds, technology changes and new contacts at companies in the team's lists), the number of new events from the team's Monitored Signals, the number of this week's opportunities (groups of people or companies like the ones the team saved), and the plan and remaining credits. Each item has a status: ok, unavailable (it could not be read now; try again later), or no_access (the plan does not include it, or a team setting turned it off; reason gives the error id). When count_exact is false, count is a lower bound. Each item's next_call names the tool (mcp_tool) and the arguments (params) that read its details, such as ${TOOL_NAMES.listSignals} or ${TOOL_NAMES.listOpportunities}. By default it counts the last 7 days; since counts only what happened after it, at most 30 days back. To check again later, pass meta.next_since as since. Free (no credits), and it marks nothing as seen.`,
      inputSchema: {
        since: dateTimeSchema
          .optional()
          .describe(
            "ISO 8601 date-time, not in the future, such as 2026-11-01T00:00:00Z. Count only what happened after it. Default: 7 days ago. A value older than 30 days reads as 30 days ago.",
          ),
        leads_since: dateTimeSchema
          .optional()
          .describe("Like since, for the lead signals item only: pass that item's last next_since."),
        monitored_since: dateTimeSchema
          .optional()
          .describe("Like since, for the Monitored Signals item only: pass that item's last next_since."),
      },
      outputSchema: briefingOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ since, leads_since, monitored_since }) => {
      const params: Record<string, string> = {}
      if (since) params.since = since
      if (leads_since) params.leads_since = leads_since
      if (monitored_since) params.monitored_since = monitored_since
      const parsed = keepDeclaredFields(
        await callHunterApi({ path: "/briefing", apiKey, baseUrl, params }),
        briefingDataSchema,
        briefingMetaSchema,
      )
      if (!parsed.ok) return parsed.result
      const item = (entry: z.infer<typeof briefingItemSchema>) => ({
        ...entry,
        next_call: localNextCall(entry.next_call),
      })
      const data = {
        needs_attention: { items: parsed.data.needs_attention.items.map(item) },
        new_this_week: { items: parsed.data.new_this_week.items.map(item) },
        account: { ...parsed.data.account, next_call: localNextCall(parsed.data.account.next_call) },
      }
      return finish(
        withBody(parsed.result, { data, meta: parsed.meta }),
        "/dashboard",
        TOOL_NAMES.getBriefing,
        briefingNextAction(data),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.listOpportunities,
    {
      title: "List Opportunities",
      description: desc`List this week's opportunities: groups of people or companies that look like the ones the team saved, which Hunter shows as "New leads for you" on the dashboard. Each opportunity gives its type (people or companies), the source it is based on (the team's saved leads, the people who replied to its sequences, its saved companies, or recently funded companies like them), a description, results_count, and a score (higher is a closer match). The best come first: people before companies, then by score. ${TOOL_NAMES.getOpportunityResults} lists the companies of a companies opportunity; the people of a people opportunity are shown in Hunter. For about a day after the weekly refresh, the list can hold opportunities from both weeks. Supports limit and offset. Free (no credits), and it marks nothing as seen.`,
      inputSchema: {
        limit: limitSchema("opportunities"),
        offset: offsetSchema("opportunities"),
      },
      outputSchema: opportunitiesOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ limit, offset }) => {
      const parsed = keepDeclaredFields(
        await callHunterApi({ path: "/opportunities", apiKey, baseUrl, params: pageParams(limit, offset) }),
        z.array(opportunitySchema),
        listMetaSchema,
      )
      if (!parsed.ok) return parsed.result
      const data = parsed.data.map((opportunity) => ({
        ...opportunity,
        next_call: localNextCall(opportunity.next_call),
      }))
      const companies = data.find((opportunity) => opportunity.type === "companies")
      let next: NextAction
      if (companies) {
        next = {
          kind: "call_tool",
          tool: TOOL_NAMES.getOpportunityResults,
          reason:
            "Free. Shows the companies of the best companies opportunity. Show the user the list; people opportunities are shown in Hunter.",
          suggestedArgs: { opportunity_id: companies.id },
        }
      } else if (data.length > 0) {
        next = {
          kind: "complete",
          summary: `Show the user the opportunities. ${PEOPLE_IN_HUNTER}`,
        }
      } else {
        next = {
          kind: "complete",
          summary:
            "No opportunities this week. Hunter makes them once a week from the people and companies the team saved.",
        }
      }
      return finish(
        withBody(parsed.result, { data, meta: parsed.meta }),
        "/dashboard",
        TOOL_NAMES.listOpportunities,
        next,
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.getOpportunityResults,
    {
      title: "Get Opportunity Results",
      description: desc`List the companies of one opportunity from ${TOOL_NAMES.listOpportunities}, the closest match first, with each company's domain and the number of email addresses Hunter has for it (personal, generic, total). For an opportunity of people, it returns no rows: meta.results gives the number of people, and viewInHunter links to Hunter, where the user sees them. Supports limit and offset. Free (no credits), and it marks nothing as seen.`,
      inputSchema: {
        opportunity_id: z
          .number()
          .int()
          .positive()
          .describe(`The id of an opportunity from ${TOOL_NAMES.listOpportunities}`),
        limit: limitSchema("companies"),
        offset: offsetSchema("companies"),
      },
      outputSchema: opportunityResultsOutputSchema.shape,
      annotations: READ_ONLY_PUBLIC_ANNOTATIONS,
    },
    async ({ opportunity_id, limit, offset }) => {
      const parsed = keepDeclaredFields(
        await callHunterApi({
          path: `/opportunities/${opportunity_id}/results`,
          apiKey,
          baseUrl,
          params: pageParams(limit, offset),
        }),
        z.array(z.union([opportunityCompanySchema, opportunityPersonSchema])),
        opportunityResultsMetaSchema,
      )
      if (!parsed.ok) return parsed.result
      const people = parsed.meta.type === "people"
      const data = people
        ? []
        : parsed.data.filter((row): row is z.infer<typeof opportunityCompanySchema> => "emails_count" in row)
      let next: NextAction
      if (people && parsed.meta.results > 0) {
        next = { kind: "complete", summary: PEOPLE_IN_HUNTER }
      } else if (data.length > 0) {
        next = { kind: "ask_user", question: "Should I save any of these companies to a company list?" }
      } else {
        next = {
          kind: "complete",
          summary: "No people or companies are left in this opportunity. The team may have saved them already.",
        }
      }
      return withCodexFullServerHint(
        finish(
          withBody(parsed.result, { data, meta: parsed.meta }),
          "/dashboard",
          TOOL_NAMES.getOpportunityResults,
          next,
        ),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.listSignals,
    {
      title: "List Signals",
      description: desc`List signal events, newest first, from the last 30 days. With source=leads, the events are on companies in the team's lists: funding rounds, technologies added or removed, and new contacts. With source=monitored, the events come from the team's Monitored Signals: one signal with signal_id (from ${TOOL_NAMES.listMonitoredSignals}), or else the team's active signals together. Each event gives the company domain, the event type and date, and its details: round type, amount in USD and date for a funding round, the technology for a technology change. Events carry no email address. Filter with types and since. Pages by cursor: pass meta.next_cursor as cursor, with the same source, signal_id, since and types. A page can hold fewer events than limit and still have a next cursor. With source=monitored and no signal_id, meta.signals_skipped lists the active signals that the merged feed did not read; read each one with its signal_id. To check again later, pass meta.next_since as since. Free (no credits), and it marks nothing as seen.`,
      inputSchema: {
        source: z
          .enum(["leads", "monitored"])
          .describe(
            "leads: events on companies in the team's lists. monitored: events from the team's Monitored Signals.",
          ),
        signal_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            `With source=monitored only: the id of one Monitored Signal from ${TOOL_NAMES.listMonitoredSignals}, active or paused. Without it, the team's active signals are read together.`,
          ),
        since: dateTimeSchema
          .optional()
          .describe(
            "ISO 8601 date-time, not in the future. Return only events that occurred after it. A value older than 30 days reads as 30 days ago.",
          ),
        types: z
          .array(z.enum(SIGNAL_EVENT_TYPES))
          .min(1)
          .max(SIGNAL_EVENT_TYPES.length)
          .optional()
          .describe("Event types to return. Default: all."),
        limit: limitSchema("events"),
        cursor: z
          .string()
          .min(1)
          .max(2048)
          .optional()
          .describe(
            "meta.next_cursor of the previous page. Valid only with the same source, signal_id, since and types.",
          ),
      },
      outputSchema: signalsOutputSchema.shape,
      annotations: READ_ONLY_PUBLIC_ANNOTATIONS,
    },
    async ({ source, signal_id, since, types, limit, cursor }) => {
      // Rails reads an array only from bracket keys, which GET params cannot carry.
      const search = new URLSearchParams({ source })
      if (signal_id !== undefined) search.set("signal_id", String(signal_id))
      if (since) search.set("since", since)
      for (const type of new Set(types)) search.append("types[]", type)
      if (limit !== undefined) search.set("limit", String(limit))
      if (cursor) search.set("cursor", cursor)
      const parsed = keepDeclaredFields(
        await callHunterApi({ path: `/signals?${search}`, apiKey, baseUrl }),
        z.array(signalEventSchema),
        signalsMetaSchema,
      )
      if (!parsed.ok) return parsed.result
      const data = parsed.data.map((event) => ({ ...event, next_call: localNextCall(event.next_call) }))
      const nextCursor = parsed.meta.next_cursor
      let next: NextAction
      if (data.length > 0) {
        next = {
          kind: "complete",
          summary: nextCursor
            ? "Show the user the events: company domain, event type, date and details. More events follow: call this tool again with meta.next_cursor as cursor and the same source, signal_id, since and types."
            : "Show the user the events: company domain, event type, date and details.",
        }
      } else if (nextCursor) {
        next = {
          kind: "call_tool",
          tool: TOOL_NAMES.listSignals,
          reason: "Free. This page held no events, but more pages follow.",
          suggestedArgs: {
            source,
            ...(signal_id !== undefined && { signal_id }),
            ...(since && { since }),
            ...(types && { types }),
            ...(limit !== undefined && { limit }),
            cursor: nextCursor,
          },
        }
      } else {
        next = {
          kind: "complete",
          summary: "No events after meta.window_start. To check again later, pass meta.next_since as since.",
        }
      }
      return withCodexFullServerHint(
        finish(
          withBody(parsed.result, { data, meta: parsed.meta }),
          signalsPath(source, signal_id),
          TOOL_NAMES.listSignals,
          next,
        ),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.listMonitoredSignals,
    {
      title: "List Monitored Signals",
      description: desc`List the team's Monitored Signals, newest first: funding signals, which follow the funding rounds that match their filters (country, company size, series, amount and date window), and company follows, which follow the events of one company. Each signal gives its id, name, type (funding_rounds or company_follow), status (active or paused), filters, and the event types its feed can return. Read a signal's events with ${TOOL_NAMES.listSignals}, source=monitored and its id as signal_id; a paused signal can be read only that way. Supports limit and offset. Free (no credits).`,
      inputSchema: {
        limit: limitSchema("Monitored Signals"),
        offset: offsetSchema("Monitored Signals"),
      },
      outputSchema: monitoredSignalsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ limit, offset }) => {
      const parsed = keepDeclaredFields(
        await callHunterApi({ path: "/monitored-signals", apiKey, baseUrl, params: pageParams(limit, offset) }),
        z.array(monitoredSignalSchema),
        monitoredSignalsMetaSchema,
      )
      if (!parsed.ok) return parsed.result
      return finish(
        withBody(parsed.result, { data: parsed.data, meta: parsed.meta }),
        "/signals",
        TOOL_NAMES.listMonitoredSignals,
        parsed.data.length > 0
          ? {
              kind: "call_tool",
              tool: TOOL_NAMES.listSignals,
              reason:
                "Free. Reads the events of the team's active Monitored Signals. Pass signal_id to read one signal, active or paused.",
              suggestedArgs: { source: "monitored" },
            }
          : {
              kind: "complete",
              summary: `The team has no Monitored Signals that this tool can read. The user creates them in Hunter: ${hunterLink("/signals", TOOL_NAMES.listMonitoredSignals.toLowerCase())}`,
            },
      )
    },
  )
}

function signalsPath(source: "leads" | "monitored", signalId: number | undefined): string {
  if (source === "leads") return "/dashboard"
  return signalId === undefined ? "/signals" : `/signals/${signalId}`
}
