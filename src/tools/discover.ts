import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  PRIVATE_WRITE_ANNOTATIONS,
  READ_ONLY_PUBLIC_ANNOTATIONS,
  TOOL_NAMES,
  withDeepLink,
  withDeepLinkFromId,
} from "../helpers"
import {
  buildResponseSchema,
  jsonArgs,
  mutationAckSchema,
  nullableString,
  paginationMetaSchema,
} from "../schemas/common"

// ─── Find-People (HUN-20855) ────────────────────────────────────────────────
//
// Per-company shape from app/app/views/api/discover/people/index.json.jbuilder:
// `json.data @domains do |domain| ...` — `data` is an ARRAY of company rows
// (same companies as Find-Companies, surfaced from a people-extraction angle).
// Each row carries `domain` (domain.value), `organization` (domain.company_name
// — null for a found-but-nameless company, same null-tolerance class as the
// Find-Companies widget schema), and the `emails_count` breakdown
// (personal/generic/total integer counters from the domains ES index).
const findPeopleCompanySchema = z
  .object({
    domain: z.string().optional(),
    organization: nullableString().optional(),
    emails_count: z
      .object({
        personal: z.number().int().nonnegative().optional(),
        generic: z.number().int().nonnegative().optional(),
        total: z.number().int().nonnegative().optional(),
      })
      .loose()
      .optional(),
  })
  .loose()

// meta from the same jbuilder: `results` (companies matching the resolved
// filters — already declared by paginationMetaSchema), `limit`/`offset` echoes,
// `total_emails` (sum aggregations across ALL matching companies, not just the
// current page — computed in app/app/controllers/api/discover/people_controller.rb
// via ES sum aggs on personal_emails/generic_emails), plus `params`/`filters`
// echo objects describing what the server understood from the request.
const findPeopleMetaSchema = paginationMetaSchema.extend({
  total_emails: z
    .object({
      personal: z.number().int().nonnegative(),
      generic: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    })
    .loose()
    .optional(),
  params: jsonArgs.optional(),
  filters: jsonArgs.optional(),
})

const findPeopleOutputSchema = buildResponseSchema(z.array(findPeopleCompanySchema), findPeopleMetaSchema)

// ─── Saved searches (HUN-20856) ─────────────────────────────────────────────
//
// Saved-search shape from app/app/views/api/discover/views/_view.jbuilder:
// { id, name, filters, created_at, updated_at }. `filters` is the stored
// Discover filter payload rendered verbatim from a `jsonb NOT NULL DEFAULT '{}'`
// column (db/structure.sql), so it is always an object — never null. Leaf
// declares every jbuilder key (no `.loose()`) so a jbuilder rename surfaces in
// vitest; the envelope stays loose via buildResponseSchema.
const savedSearchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  filters: jsonArgs,
  created_at: z.string(),
  updated_at: z.string(),
})

// index.jbuilder (app/app/views/api/discover/views/index.jbuilder) emits
// `json.data do json.views @views ... end`, so `data` is `{ views: [...] }`.
// `meta` carries `total` (all saved Discover searches for the user, not the
// page count) and a `params: { limit, offset }` echo.
const listSavedSearchesOutputSchema = buildResponseSchema(
  z.object({ views: z.array(savedSearchSchema) }).loose(),
  z
    .object({
      total: z.number().int().nonnegative(),
      params: z.object({ limit: z.number().int(), offset: z.number().int() }).loose(),
    })
    .loose(),
)

// show.jbuilder and create.jbuilder both render `json.data { partial! _view }`.
const savedSearchOutputSchema = buildResponseSchema(savedSearchSchema)

// Find-People sends only scalar-array filters (`organization[domain][]`), which
// form-encoding handles cleanly. Nested-object filter payloads that must
// round-trip verbatim (Create-Saved-Search) travel as a JSON body instead — see
// the createSavedSearch handler for why form-encoding can't preserve their shape.
interface RailsFormParams {
  [key: string]: string | string[] | RailsFormParams
}

export function registerDiscoverTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.findPeople,
    {
      description:
        "Use this when the user wants to extract people from companies — the natural next step right after a Find-Companies result ('now get me the people at these companies'). For each matching company it reports how many email addresses Hunter's public index holds: `emails_count.personal` counts addresses tied to a named person (the people you can actually extract), `emails_count.generic` counts role-based addresses such as info@ or sales@, and `emails_count.total` combines both. `meta.total_emails` aggregates the same three counters across ALL companies matching the search — not just the current page — so use it to size a prospecting batch upfront. This tool returns counts only, from Hunter's public index: to reveal the actual email addresses, names, and positions at a company, call Domain-Search with that company's domain (uses credits). Provide either `query` (natural-language criteria, translated to filters exactly like Find-Companies) or `domains` (exact company domains, e.g. lifted from a Find-Companies result); when both are given, `query` takes precedence and `domains` is not sent. Free to call.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .max(500)
          .optional()
          .describe(
            "Natural-language company search criteria, translated to Discover filters exactly like Find-Companies. Example: 'fintech startups in France with 11-50 employees'",
          ),
        domains: z
          .array(z.string().min(1).max(255))
          .min(1)
          .max(100)
          .optional()
          .describe(
            "Exact company domains to extract people counts for (e.g. from a Find-Companies result). Ignored when `query` is provided.",
          ),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of companies to return (default 100, max 100)"),
        offset: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Number of companies to skip (paging past the first 100 results requires Discover paging access)"),
      },
      outputSchema: findPeopleOutputSchema.shape,
      annotations: READ_ONLY_PUBLIC_ANNOTATIONS,
    },
    async ({ query, domains, limit, offset }) => {
      // Local gate: with neither `query` nor `domains` the Rails action skips
      // `extract_people` entirely (app/app/controllers/api/discover/people_controller.rb)
      // and there is nothing meaningful to return — fail fast with a typed
      // envelope instead of burning a round-trip.
      if (!query && (!domains || domains.length === 0)) {
        const message = "Provide either `query` or `domains` — at least one is required to find people."
        return {
          content: [{ type: "text" as const, text: message, annotations: { audience: ["user"] } }],
          structuredContent: { error: { code: "invalid_input" as const, retryable: false, message } },
          isError: true,
        }
      }
      // Mirror Find-Companies: `query` (and paging) travel as URL parameters on
      // the POST — /discover/people reads them from the query string — while
      // the structured `organization[domain][]` filter goes in the form body.
      const search = new URLSearchParams()
      if (query) search.set("query", query)
      if (limit !== undefined) search.set("limit", String(limit))
      if (offset !== undefined) search.set("offset", String(offset))
      const qs = search.toString()
      const params: RailsFormParams = {}
      // Rails ignores structured filters when `query` is present
      // (Api::Discover::Params#api_input_params), so don't send them.
      if (!query && domains && domains.length > 0) params.organization = { domain: domains }
      return callHunterApi({
        path: qs ? `/discover/people?${qs}` : "/discover/people",
        apiKey,
        baseUrl,
        method: "POST",
        params,
      })
    },
  )

  server.registerTool(
    TOOL_NAMES.listSavedSearches,
    {
      description:
        "Use this when the user wants to see the Discover searches they saved earlier — a good opening move at the start of a prospecting conversation ('want to rerun one of your saved searches?'). Each saved search carries its `id`, `name`, the stored `filters` payload, and timestamps, ordered newest first. To rerun one, read its `filters` and `name` and describe them to the user as a natural-language `query` for Find-Companies or Find-People — that reformulation is approximate, since these tools take only a `query` (or exact `domains`) and cannot re-apply the stored structured filters (locations, industries, funding, technologies, include/exclude lists) verbatim. Supports `limit` and `offset` pagination (`meta.total` is the full count). Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of saved searches to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of saved searches to return (default 25, max 100)"),
      },
      outputSchema: listSavedSearchesOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      const result = await callHunterApi({ path: "/discover/views", apiKey, baseUrl, params })
      return withDeepLink(result, "/discover")
    },
  )

  server.registerTool(
    TOOL_NAMES.getSavedSearch,
    {
      description:
        "Use this when the user wants the details of one saved Discover search, identified by ID — typically to rerun it. Read the stored `filters` payload and describe it back to the user as a natural-language `query` for Find-Companies or Find-People; this is an approximate rerun, because those tools accept only a `query` (or exact `domains`) and cannot re-apply the stored structured filters (locations, industries, funding, technologies, include/exclude lists) verbatim. Present the reformulated query and let the user confirm or refine before running it. Returns a not-found error if the saved search does not exist or belongs to another user. Free to call.",
      inputSchema: {
        saved_search_id: z.number().int().positive().describe("ID of the saved search to fetch"),
      },
      outputSchema: savedSearchOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ saved_search_id }) => {
      // On 404 (saved search does not exist or belongs to another user)
      // callHunterApi returns the typed error envelope unchanged; we pass it
      // through so the model gets `structuredContent.error`.
      const result = await callHunterApi({ path: `/discover/views/${saved_search_id}`, apiKey, baseUrl })
      return withDeepLink(result, `/discover?view_id=${saved_search_id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.createSavedSearch,
    {
      description:
        "Use this when the user wants to save the current Discover filter set under a name so the search can be rerun later. Stores the `filters` payload verbatim and returns the created saved search; it also appears on the hunter.io Discover page. Names must be unique among the user's saved Discover searches — a duplicate name returns a validation error. There is no update endpoint: to change a saved search, delete it with Delete-Saved-Search and recreate it. Free to call.",
      inputSchema: {
        name: z
          .string()
          .min(1)
          .max(255)
          .describe("Name for the saved search (must be unique among your saved Discover searches)"),
        filters: jsonArgs
          .optional()
          .describe(
            "Discover filter payload to store verbatim — the same shape returned in `filters` by Get-Saved-Search or List-Saved-Searches. Values should be strings, numbers, booleans, or arrays of those. Omit to save an empty filter set.",
          ),
      },
      outputSchema: savedSearchOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ name, filters }) => {
      // Rails permits `params.permit(:name, filters: {})`
      // (app/app/controllers/api/discover/views_controller.rb) and stores the
      // filters hash VERBATIM as jsonb on the View record. `filters` can carry a
      // nested array of objects (e.g. `headquarters_location.include =
      // [{ country }, { country, state }]`) whose shape must round-trip exactly —
      // Get-/List-Saved-Search reads back the same jsonb. Form-encoding cannot
      // preserve that array: numeric brackets (`include[0][country]`) parse into
      // a Hash keyed "0","1" (not an Array), and empty brackets (`include[][..]`)
      // MERGE disjoint-key objects like `[{continent},{country}]` into one hash.
      // Send a JSON body so Rails parses `filters` straight into `params` and
      // stores the array-of-objects unchanged.
      const jsonBody: { name: string; filters?: Record<string, unknown> } = { name }
      if (filters !== undefined) jsonBody.filters = filters
      const result = await callHunterApi({ path: "/discover/views", apiKey, baseUrl, method: "POST", jsonBody })
      // Skip the deep-link id extraction on the error envelope — there is no
      // `data.id` to read and the fallback text parse would just warn.
      if (result.isError) return result
      return withDeepLinkFromId(result, (id) => `/discover?view_id=${id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteSavedSearch,
    {
      description:
        "Use this when the user wants to permanently delete a saved Discover search, identified by ID. Deletion cannot be undone through the API. Because saved searches have no update endpoint, delete-and-recreate is also how to change one: delete it, then call Create-Saved-Search with the new name or filters. Returns a not-found error if the saved search does not exist or belongs to another user. Free to call.",
      inputSchema: {
        saved_search_id: z.number().int().positive().describe("ID of the saved search to delete"),
      },
      // 204 No Content — callHunterApi synthesises the mutationAckSchema-shaped
      // structuredContent envelope.
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ saved_search_id }) => {
      return callHunterApi({ path: `/discover/views/${saved_search_id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )
}
