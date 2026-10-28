import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  buildNextAction,
  callHunterApi,
  desc,
  embedNextAction,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  PRIVATE_WRITE_ANNOTATIONS,
  READ_ONLY_PUBLIC_ANNOTATIONS,
  TEAM_SHARED_DESTRUCTIVE_ANNOTATIONS,
  TEAM_SHARED_WRITE_ANNOTATIONS,
  TOOL_NAMES,
} from "../helpers"
import {
  buildResponseSchema,
  jsonArgs,
  mutationAckSchema,
  nullableNumber,
  nullableString,
  paginationMetaSchema,
} from "../schemas/common"

// Company-list leaf shape from app/app/views/api/company_lists/_company_list.jbuilder:
//   id, name, type ("static" | "dynamic"), filters (only when dynamic),
//   company_list_folder_id (nullable), created_at.
// `type` is derived from `company_list.dynamic? ? "dynamic" : "static"`.
// `filters` is emitted ONLY for dynamic lists (a Rails `if company_list.dynamic?`
// guard), so it is optional here — and a free-form sanitized hash, so we keep it
// `.loose()`. Leaf is otherwise strict so a jbuilder rename surfaces in vitest;
// the envelope stays loose via buildResponseSchema.
const companyListSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  type: z.enum(["static", "dynamic"]),
  filters: z.object({}).loose().optional(),
  company_list_folder_id: nullableNumber(),
  created_at: z.string(),
})

// index.jbuilder wraps the array in `json.data do json.company_lists @company_lists`,
// so `data` is a `{ company_lists: [...] }` object. `meta` carries
// `{ total, params: { limit, offset } }` — `total` matches paginationMetaSchema,
// and the loose envelope absorbs the nested `params` echo.
const listCompanyListsDataSchema = z.object({ company_lists: z.array(companyListSchema) })
const listCompanyListsOutputSchema = buildResponseSchema(listCompanyListsDataSchema, paginationMetaSchema)

// show.jbuilder / create.jbuilder render the company-list partial plus a
// `companies_count` field appended at the `data` level. Extend the leaf with the
// extra count for the single-item envelope.
const companyListWithCountSchema = companyListSchema.extend({
  companies_count: z.number().int().nonnegative(),
})
const singleCompanyListOutputSchema = buildResponseSchema(companyListWithCountSchema)

// Update + Delete render no body (204 No Content; Delete returns 202 Accepted for
// a static list that still has companies, where the destroy runs in an async job).
// callHunterApi synthesises a mutationAckSchema-shaped payload for both empty-body
// statuses, so the outputSchema MUST be mutationAckSchema — a buildResponseSchema
// envelope would reject the synthesised ack at the SDK validator (HUN-19943 P1).

// ─── Company-list folders (Group 08) ────────────────────────────────────────
//
// Folder leaf shape from app/app/views/api/company_lists/folders/_folder.jbuilder:
//   id, name, color (hex string, no leading '#'), company_lists_count, created_at.
// Leaf is strict so a jbuilder rename surfaces in vitest; the envelope stays
// loose via buildResponseSchema.
//
// `color` is a CLOSED enum on Create/Update: the model validates
// `inclusion: { in: VALID_COLORS }` (app/app/models/lead/company_list/folder.rb)
// and the folder UI hands the user exactly these 14 swatches. Enumerate the set
// on the input so an invalid color is rejected before the network call (agent
// parity with the swatch picker), instead of fail-and-retry on a 422.
const FOLDER_COLORS = [
  "374151",
  "3489F9",
  "10B981",
  "F5BA0B",
  "EF4444",
  "7C3AED",
  "F97316",
  "E5E7EB",
  "B4D9F7",
  "BAE6B0",
  "FDE68A",
  "FBD0D0",
  "D4C4F8",
  "FFD79B",
] as const
// Human-readable list for tool descriptions (parity with the UI's swatch set).
const FOLDER_COLORS_LIST = FOLDER_COLORS.join(", ")

// Leaf-output `color` stays `z.string()`: the API can return any value in the
// set, and over-constraining the response buys nothing (the enum guard belongs
// on the input, not the response leaf).
const folderSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  color: z.string(),
  company_lists_count: z.number().int().nonnegative(),
  created_at: z.string(),
})

// index.jbuilder wraps the array in `json.data do json.folders @folders`, so
// `data` is a `{ folders: [...] }` object. `meta` carries `{ total, params: {
// limit, offset } }` — `total` matches paginationMetaSchema and the loose
// envelope absorbs the nested `params` echo.
const listFoldersDataSchema = z.object({ folders: z.array(folderSchema) })
const listFoldersOutputSchema = buildResponseSchema(listFoldersDataSchema, paginationMetaSchema)

// create.jbuilder renders the folder partial directly at the `data` level
// (201 with body), so the single-item envelope wraps the folder leaf.
const singleFolderOutputSchema = buildResponseSchema(folderSchema)

// ─── Company-list favorite / unfavorite (Group 09) ──────────────────────────
//
// favorites_controller.rb renders an INLINE body on both verbs (NOT an empty
// 204 ack): `create` → `{ data: { id, favorited: true } }` status 201; `destroy`
// → `{ data: { id, favorited: false } }` status 200. So both tools use a
// buildResponseSchema envelope around the `{ id, favorited }` leaf — never
// mutationAckSchema. Leaf declares every key (not `.loose()`) so a renamed
// jbuilder field surfaces in vitest as a missing-key parse error; NOT `.strict()`
// (an output leaf strips unknowns rather than rejecting an API-added field — HUN-19943).
const favoriteToggleSchema = z.object({
  id: z.number().int().positive(),
  favorited: z.boolean(),
})
const favoriteToggleOutputSchema = buildResponseSchema(favoriteToggleSchema)

// ─── Company-list membership (Group 10) ─────────────────────────────────────
//
// companies_controller.rb#create renders the added company via
// app/app/views/api/company_lists/companies/{create,_company}.jbuilder:
//   `json.data { json.partial! "company"; json.already_in_list }` →
//   { id, domain, created_at, already_in_list }.
// Leaf declares every key (not `.loose()`) so a renamed jbuilder field surfaces
// in vitest as a missing-key parse error; the envelope stays loose via
// buildResponseSchema. NOT `.strict()` (strips unknowns rather than rejecting an
// API-added field — HUN-19943).
const companyMembershipSchema = z.object({
  id: z.number().int().positive(),
  domain: z.string(),
  created_at: z.string(),
  // true when the company was already in the list (200, nothing changed), false when added (201).
  // Optional so a 201 body from a Rails build that predates the field still parses (HUN-24597).
  already_in_list: z.boolean().optional(),
})
const companyMembershipOutputSchema = buildResponseSchema(companyMembershipSchema)

// companies_controller.rb#destroy responds `head :no_content` (204 empty body),
// so callHunterApi synthesises a mutationAckSchema-shaped payload — the
// outputSchema MUST be mutationAckSchema, not a buildResponseSchema envelope.

// Update + Delete render no body (204 No Content). callHunterApi synthesises a
// mutationAckSchema-shaped payload, so the outputSchema MUST be mutationAckSchema.

// ─── Find-Similar-Companies (HUN-24491) ─────────────────────────────────────
//
// Wraps GET /v2/lookalikes. Leaf shape from
// app/app/views/api/lookalikes/index.json.jbuilder. Output `size` stays a string:
// the enum guard belongs on the input, not the response leaf.
const LOOKALIKE_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10001+"] as const

// Velen treats any non-empty country as a ranking preference, so a near-miss
// such as "UK" (for GB) would silently skew results instead of failing.
// ISO 3166-1 alpha-2 officially assigned codes.
const ISO_COUNTRY_CODES = new Set(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  ),
)

const lookalikeSchema = z.object({
  domain: z.string(),
  company_name: nullableString(),
  country: nullableString(),
  industry: nullableString(),
  size: nullableString(),
  similarity_score: z.number(),
})
const findSimilarCompaniesOutputSchema = buildResponseSchema(
  z.array(lookalikeSchema),
  paginationMetaSchema.extend({ params: jsonArgs.optional() }),
)

// Flat values only: Rails rejects a nested object, and String() turned one in a list into "[object Object]" (HUN-24582).
const filterScalarSchema = z.union([z.string(), z.number(), z.boolean()]).nullable()
const filtersInputSchema = z.record(z.string(), z.union([filterScalarSchema, z.array(filterScalarSchema)]))

// Sent as the nested `filters[...]` form params the controller's sanitize_filters expects; nulls are dropped.
type FormValue = string | string[] | { [key: string]: FormValue }
function toFormParams(value: z.infer<typeof filtersInputSchema>): Record<string, FormValue> {
  const out: Record<string, FormValue> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (raw == null) continue
    out[key] = Array.isArray(raw) ? raw.filter((item) => item != null).map(String) : String(raw)
  }
  return out
}

export function registerCompanyListTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.findSimilarCompanies,
    {
      description: desc`Use this when the user wants companies similar to a company list or to one company, ranked by \`similarity_score\` (0-100, higher is closer). Seed with exactly one of \`company_list_id\` (a static company list; ${TOOL_NAMES.listCompanyLists} shows each list's \`type\`) or \`domain\` (one company). \`industry\` and \`size\` are hard filters. \`industry\` must match a LinkedIn industry name exactly (case-insensitive), so reuse the \`industry\` values from earlier results. \`country\` is a ranking preference, not a filter: same-country companies rank higher, but other countries and companies with no known country can still appear, so check each result's \`country\` before telling the user that all results are in one country. There is no paging. An empty \`data\` array means the domain is not in Hunter's index, the list has no companies, nothing similar was found, or the \`industry\`/\`size\` filters removed every result; say which is likely instead of telling the user that nothing similar exists. A dynamic list returns an invalid_input error (field unsupported_list_type): suggest a static company list or a \`domain\` seed instead. This feature is not available on free plans. An unauthorized error whose message says Lookalikes is not enabled on the plan means it is not available on the user's current Hunter plan: tell the user that and do not ask the user to reconnect. Any other unauthorized error means the Hunter account is not connected. To save results, call ${TOOL_NAMES.saveCompany} for each company the user picks to get its company id. For one or two companies, then call ${TOOL_NAMES.addCompanyToList}; for more, add all the ids in one ${TOOL_NAMES.bulkCopyCompanies} call. A company that is already in the target list counts as saved (${TOOL_NAMES.addCompanyToList} returns \`already_in_list: true\`); continue with the next one. Free to call.`,

      inputSchema: {
        company_list_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("ID of a static company list to seed from. Provide this or `domain`, not both."),
        // Rails strips URLs down to the hostname and validates it (IDNs included),
        // so this only bounds the raw string.
        domain: z
          .string()
          .trim()
          .min(1)
          .max(2048)
          .optional()
          .describe(
            "Domain or website URL of one company to seed from, e.g. stripe.com. Provide this or `company_list_id`, not both.",
          ),
        country: z
          .string()
          .refine((value) => ISO_COUNTRY_CODES.has(value.toUpperCase()), {
            message: "must be an ISO 3166-1 alpha-2 country code (GB, not UK)",
          })
          .optional()
          .describe("ISO 3166 alpha-2 country code, e.g. FR. Ranks same-country companies higher; it does not filter."),
        industry: z
          .array(z.string().min(1).max(200))
          .min(1)
          .max(20)
          .optional()
          .describe("Keep only these industries (exact LinkedIn industry names, case-insensitive)"),
        size: z
          .array(z.enum(LOOKALIKE_SIZES))
          .min(1)
          .max(LOOKALIKE_SIZES.length)
          .optional()
          .describe("Keep only these employee-count buckets"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of companies to return (default 20, max 100)"),
      },
      outputSchema: findSimilarCompaniesOutputSchema.shape,
      annotations: READ_ONLY_PUBLIC_ANNOTATIONS,
    },
    async ({ company_list_id, domain, country, industry, size, limit }) => {
      if ((company_list_id === undefined) === (domain === undefined)) {
        const message = "Provide exactly one of `company_list_id` or `domain` to seed the search."
        return {
          content: [{ type: "text" as const, text: message, annotations: { audience: ["user"] } }],
          structuredContent: { error: { code: "invalid_input" as const, retryable: false, message } },
          isError: true,
        }
      }
      // Rails reads array filters only from bracket keys, and GET params cannot
      // carry arrays, so the query string is built here.
      const search = new URLSearchParams()
      if (company_list_id !== undefined) search.set("company_list_id", String(company_list_id))
      if (domain !== undefined) search.set("domain", domain)
      if (country !== undefined) search.set("country", country.toUpperCase())
      for (const value of industry ?? []) search.append("industry[]", value)
      for (const value of new Set(size)) search.append("size[]", value)
      if (limit !== undefined) search.set("limit", String(limit))
      const result = await callHunterApi({ path: `/lookalikes?${search}`, apiKey, baseUrl })
      const data = (result.structuredContent as { data?: unknown } | undefined)?.data
      if (!Array.isArray(data) || data.length === 0) return result
      return embedNextAction(
        result,
        buildNextAction({
          kind: "ask_user",
          question: "I found similar companies. Should I save any of them to a company list?",
        }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.listCompanyLists,
    {
      description:
        "Use this when the user wants to see the company lists in their Hunter account. Lists are ordered with the most recently created first. Each list reports its `type` — `static` (a fixed set of companies the user adds manually) or `dynamic` (companies matched automatically by saved `filters`, which are included for dynamic lists) — along with its `name`, `company_list_folder_id` (the folder it lives in, or null), and `created_at`. Surface the `type` for each list, and for dynamic lists mention the `filters` for context. Supports `limit` and `offset` pagination. Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of company lists to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of company lists to return (default 20, max 100)"),
      },
      outputSchema: listCompanyListsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      // The Rails controller does `.limit(params[:limit].to_i)` with NO default,
      // so an omitted limit becomes limit(0) → an empty page. Always send an
      // explicit limit (default 20) + offset (default 0) so the no-arg call
      // returns the first page as described. See PR #12958 Codex review.
      const params: Record<string, string> = { offset: String(offset ?? 0), limit: String(limit ?? 20) }
      return callHunterApi({ path: "/company-lists", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.getCompanyList,
    {
      description:
        "Use this when the user wants the details of a single company list, identified by ID: its `name`, `type` (static or dynamic), `filters` (for dynamic lists), `company_list_folder_id`, `created_at`, and `companies_count` (the number of companies currently in the list). Returns a not-found error if the list does not exist or belongs to another team. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the company list to retrieve"),
      },
      outputSchema: singleCompanyListOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ id }) => {
      // On 404 (list does not exist or belongs to another team) callHunterApi
      // returns the typed error envelope unchanged; we pass it through so the
      // model gets `structuredContent.error`.
      return callHunterApi({ path: `/company-lists/${id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.createCompanyList,
    {
      description:
        "Use this when the user wants to create a new company list. Provide a `name`. By default the list is `static` (the user adds companies to it themselves). To create a `dynamic` list that automatically collects companies matching saved criteria, set `type` to `dynamic` and supply `filters` (a set of key/value criteria). Optionally place the list inside a folder with `company_list_folder_id`. Returns an invalid_input error (id validation_failed) if the name is missing, is already used by another list in the user's team, or a dynamic list is created without valid filters. Free to call.",
      inputSchema: {
        name: z.string().min(1).describe("Name of the new company list"),
        type: z
          .enum(["static", "dynamic"])
          .optional()
          .describe("List type: 'static' (manual, the default) or 'dynamic' (auto-matched by filters)"),
        filters: filtersInputSchema
          .optional()
          .describe(
            "Saved matching criteria for a dynamic list, keyed by Leads > Companies filter name. Each value is a string, number or boolean, or a list of them, never an object: there is no include/exclude form. Required when type is 'dynamic'.",
          ),
        company_list_folder_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("ID of the folder to place the list in (optional)"),
      },
      outputSchema: singleCompanyListOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ name, type, filters, company_list_folder_id }) => {
      const params: Record<string, FormValue> = { name }
      if (type !== undefined) params.type = type
      if (filters !== undefined) params.filters = toFormParams(filters)
      if (company_list_folder_id !== undefined) params.company_list_folder_id = String(company_list_folder_id)
      // On 422 (validation_failed: duplicate name, missing name, dynamic list
      // without valid filters) callHunterApi returns the typed error envelope
      // unchanged; we pass it through so the model gets `structuredContent.error`.
      return callHunterApi({ path: "/company-lists", apiKey, baseUrl, method: "POST", params })
    },
  )

  server.registerTool(
    TOOL_NAMES.updateCompanyList,
    {
      description:
        "Use this when the user wants to update a company list, identified by ID. You can rename it (`name`), move it to a different folder (`company_list_folder_id`), and — for a dynamic list — change its `filters`. Renaming overwrites the previous name, which cannot be recovered from the API; if the user declines the rename, offer to create a new company list with the desired name instead. Succeeds with no content on success. Returns a not-found error if the list does not exist or belongs to another team, or an invalid_input error (id validation_failed) if the new name is empty or the filters are invalid. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the company list to update"),
        name: z.string().min(1).optional().describe("New name for the company list"),
        filters: filtersInputSchema
          .optional()
          .describe(
            "Updated matching criteria, in the same shape as on create: each value is a string, number or boolean, or a list of them, never an object (applies only to dynamic lists; ignored for static lists)",
          ),
        company_list_folder_id: z
          .union([z.number().int().positive(), z.null()])
          .optional()
          .describe(
            "Folder to move the list into: a positive folder ID, or null to remove it from its folder (move to Unfiled). Omit to leave the current folder unchanged.",
          ),
      },
      // Update renders 204 No Content, so callHunterApi synthesises a
      // mutationAckSchema-shaped payload.
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id, name, filters, company_list_folder_id }) => {
      const params: Record<string, FormValue> = {}
      if (name !== undefined) params.name = name
      if (filters !== undefined) params.filters = toFormParams(filters)
      // null clears the folder assignment (move to Unfiled): Rails coerces a blank
      // company_list_folder_id to nil on the optional folder association. undefined
      // leaves the current folder unchanged.
      if (company_list_folder_id === null) params.company_list_folder_id = ""
      else if (company_list_folder_id !== undefined) params.company_list_folder_id = String(company_list_folder_id)
      // On 404 (not found / other team) or 422 (validation_failed) callHunterApi
      // returns the typed error envelope unchanged; we pass it through so the
      // model gets `structuredContent.error`.
      return callHunterApi({ path: `/company-lists/${id}`, apiKey, baseUrl, method: "PUT", params })
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteCompanyList,
    {
      description:
        "Use this when the user wants to delete a company list by ID. Empty lists and dynamic lists are deleted immediately (status 204). A static list that still contains companies is deleted asynchronously: a background job removes its companies and the call returns status 202 (accepted) right away. Deleting a list cannot be undone from the API. Returns a not-found error if the list does not exist or belongs to another team. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the company list to delete"),
      },
      // 204 (sync) and 202 (async static-list destroy job) both yield a
      // mutationAckSchema-shaped payload synthesised by callHunterApi.
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id }) => {
      // On 404 (not found / other team) callHunterApi returns the typed error
      // envelope unchanged; we pass it through so the model gets
      // `structuredContent.error`.
      return callHunterApi({ path: `/company-lists/${id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    TOOL_NAMES.listCompanyListFolders,
    {
      description:
        "Use this when the user wants to see the company-list folders in their Hunter account. Folders group company lists. Lists are ordered with the most recently created first. Each folder reports its `name`, `color` (a hex color string), `company_lists_count` (how many lists are filed in it), and `created_at`. Folders are visible to the whole team. Supports `limit` and `offset` pagination. Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of folders to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of folders to return (default 20, max 100)"),
      },
      outputSchema: listFoldersOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      // The folders endpoint applies a server-side default limit of 20 for the
      // DATA, but its jbuilder echoes the RAW params[:limit] in meta.params.limit
      // (0 when omitted) — so an agent paginating via meta.params.limit gets a
      // wrong value. Send explicit defaults so the echoed meta matches the page
      // actually returned (matches List-Company-Lists). PR #12958 Codex review.
      const params: Record<string, string> = { offset: String(offset ?? 0), limit: String(limit ?? 20) }
      return callHunterApi({ path: "/company-lists/folders", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.createCompanyListFolder,
    {
      description: `Use this when the user wants to create a new company-list folder. Provide a \`name\` and a \`color\`. \`color\` must be one of the allowed Hunter folder colors (hex without a leading '#'): ${FOLDER_COLORS_LIST}. Returns an invalid_input error (id validation_failed) if the name is missing or already used by another folder in the user's team, or if the color is missing or not one of the allowed values. Free to call.`,
      inputSchema: {
        name: z.string().min(1).describe("Name of the new folder"),
        color: z
          .enum(FOLDER_COLORS)
          .describe(
            `Folder color. One of the allowed Hunter folder colors (hex without a leading '#'): ${FOLDER_COLORS_LIST}.`,
          ),
      },
      outputSchema: singleFolderOutputSchema.shape,
      annotations: TEAM_SHARED_WRITE_ANNOTATIONS,
    },
    async ({ name, color }) => {
      // On 422 (validation_failed: missing/duplicate name, missing/invalid color)
      // callHunterApi returns the typed error envelope unchanged; we pass it
      // through so the model gets `structuredContent.error`.
      return callHunterApi({ path: "/company-lists/folders", apiKey, baseUrl, method: "POST", params: { name, color } })
    },
  )

  server.registerTool(
    TOOL_NAMES.updateCompanyListFolder,
    {
      description: `Use this when the user wants to update a company-list folder, identified by ID. You can rename it (\`name\`) and change its \`color\`. \`color\` must be one of the allowed Hunter folder colors (hex without a leading '#'): ${FOLDER_COLORS_LIST}. Renaming overwrites the previous name, which cannot be recovered from the API; if the user declines the rename, offer to create a new folder with the desired name instead. Succeeds with no content on success. Only the folder's owner, a team admin, or the team owner may update it. Returns a not-found error if the folder does not exist, a forbidden error if the user is not allowed to update it, or an invalid_input error (id validation_failed) if the new name is duplicated or the color is not one of the allowed values. Free to call.`,
      inputSchema: {
        id: z.number().int().positive().describe("ID of the folder to update"),
        name: z.string().min(1).optional().describe("New name for the folder"),
        color: z
          .enum(FOLDER_COLORS)
          .optional()
          .describe(
            `New folder color. One of the allowed Hunter folder colors (hex without a leading '#'): ${FOLDER_COLORS_LIST}.`,
          ),
      },
      // Update renders 204 No Content, so callHunterApi synthesises a
      // mutationAckSchema-shaped payload.
      outputSchema: mutationAckSchema.shape,
      annotations: TEAM_SHARED_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id, name, color }) => {
      const params: Record<string, string> = {}
      if (name !== undefined) params.name = name
      if (color !== undefined) params.color = color
      // On 404 (not found), 403 (forbidden), or 422 (validation_failed)
      // callHunterApi returns the typed error envelope unchanged; we pass it
      // through so the model gets `structuredContent.error`.
      return callHunterApi({ path: `/company-lists/folders/${id}`, apiKey, baseUrl, method: "PUT", params })
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteCompanyListFolder,
    {
      description:
        "Use this when the user wants to delete a company-list folder by ID. Deleting a folder does not delete the company lists filed in it — each affected list keeps existing and simply becomes unfiled (its folder is cleared). Deleting a folder cannot be undone from the API. Only the folder's owner, a team admin, or the team owner may delete it. Succeeds with no content on success. Returns a not-found error if the folder does not exist, or a forbidden error if the user is not allowed to delete it. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the folder to delete"),
      },
      // Delete renders 204 No Content, so callHunterApi synthesises a
      // mutationAckSchema-shaped payload.
      outputSchema: mutationAckSchema.shape,
      annotations: TEAM_SHARED_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id }) => {
      // On 404 (not found) or 403 (forbidden) callHunterApi returns the typed
      // error envelope unchanged; we pass it through so the model gets
      // `structuredContent.error`.
      return callHunterApi({ path: `/company-lists/folders/${id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    TOOL_NAMES.favoriteCompanyList,
    {
      description:
        "Use this when the user wants to mark a company list as a favorite, identified by ID. Favoriting is a reversible flag (it can be undone later) and does not change the list's contents. The call is idempotent: favoriting a list that is already a favorite still succeeds and returns `favorited: true`. Surface the `favorited: true` response to confirm the action succeeded. Returns a not-found error if the list does not exist or belongs to another team. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the company list to favorite"),
      },
      // create renders `{ data: { id, favorited: true } }` (status 201), so the
      // success path is a rendered body — buildResponseSchema, not mutationAck.
      outputSchema: favoriteToggleOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ id }) => {
      // On 404 (list does not exist or belongs to another team) callHunterApi
      // returns the typed error envelope unchanged; we pass it through so the
      // model gets `structuredContent.error`.
      return callHunterApi({ path: `/company-lists/${id}/favorite`, apiKey, baseUrl, method: "POST" })
    },
  )

  server.registerTool(
    TOOL_NAMES.unfavoriteCompanyList,
    {
      description:
        "Use this when the user wants to remove the favorite flag from a company list, identified by ID. This only clears the favorite marker; the list and its contents are untouched, and it can be favorited again later. The call is idempotent: unfavoriting a list that is not currently a favorite still succeeds and returns `favorited: false`. Surface the `favorited: false` response to confirm the favorite was removed. Returns a not-found error if the list does not exist or belongs to another team. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the company list to unfavorite"),
      },
      // destroy renders `{ data: { id, favorited: false } }` (status 200), so the
      // success path is a rendered body — buildResponseSchema, not mutationAck.
      outputSchema: favoriteToggleOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ id }) => {
      // On 404 (list does not exist or belongs to another team) callHunterApi
      // returns the typed error envelope unchanged; we pass it through so the
      // model gets `structuredContent.error`.
      return callHunterApi({ path: `/company-lists/${id}/favorite`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    TOOL_NAMES.addCompanyToList,
    {
      description:
        "Use this when the user wants to save a company to a static company list. Identify the list by `company_list_id` and the company by `company_id` (a company already saved in the user's account). Both the list and the company must belong to the user's team, and the list must be static — dynamic lists collect companies automatically by their filters and cannot have companies added manually. Returns the company (`id`, `domain`, `created_at`, `already_in_list`); surface the saved company's domain to confirm. `already_in_list: false` means the company was added; `already_in_list: true` means it was already in the list and nothing changed, so tell the user it was already there, not that the save failed. An invalid_input error saying the company \"has already been taken\" means the same as `already_in_list: true`. Returns a not-found error if the list or company does not exist, belongs to another team, or the list is dynamic, or a forbidden error if the user is not allowed to modify this list. Free to call.",
      inputSchema: {
        company_list_id: z.number().int().positive().describe("ID of the static company list to add the company to"),
        company_id: z.number().int().positive().describe("ID of the company (already saved in the account) to add"),
      },
      // create renders `{ data: { id, domain, created_at, already_in_list } }` (status 201,
      // or 200 when the company was already in the list), so the success path is a
      // rendered body — buildResponseSchema, not mutationAck.
      outputSchema: companyMembershipOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ company_list_id, company_id }) => {
      // On 400 (missing company_id) or 404 (list/company not found, other team, or
      // dynamic list) callHunterApi returns the typed error envelope unchanged; we
      // pass it through so the model gets `structuredContent.error`.
      return callHunterApi({
        path: `/company-lists/${company_list_id}/companies`,
        apiKey,
        baseUrl,
        method: "POST",
        params: { company_id: String(company_id) },
      })
    },
  )

  server.registerTool(
    TOOL_NAMES.removeCompanyFromList,
    {
      description:
        "Use this when the user wants to remove a company from a static company list. Identify the list by `company_list_id` and the company by `company_id`. This removes only the membership link between the company and the list; the company itself is not deleted and can be saved back to the list later, so the action is reversible. The list must be static (dynamic lists manage their members automatically). Succeeds with no content on success. Returns a not-found error if the list or company does not exist, belongs to another team, the list is dynamic, or the company is not in the list, or a forbidden error if the user is not allowed to modify this list. Free to call.",
      inputSchema: {
        company_list_id: z
          .number()
          .int()
          .positive()
          .describe("ID of the static company list to remove the company from"),
        company_id: z.number().int().positive().describe("ID of the company to remove from the list"),
      },
      // destroy responds `head :no_content` (204 empty body), so callHunterApi
      // synthesises a mutationAckSchema-shaped payload.
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ company_list_id, company_id }) => {
      // On 404 (list/company not found, other team, dynamic list, or company not
      // in the list) callHunterApi returns the typed error envelope unchanged; we
      // pass it through so the model gets `structuredContent.error`.
      return callHunterApi({
        path: `/company-lists/${company_list_id}/companies/${company_id}`,
        apiKey,
        baseUrl,
        method: "DELETE",
      })
    },
  )
}
