import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  PRIVATE_WRITE_ANNOTATIONS,
  TOOL_NAMES,
} from "../helpers"
import { buildResponseSchema, mutationAckSchema, nullableNumber, paginationMetaSchema } from "../schemas/common"

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
//   `json.data { json.partial! "company" }` → { id, domain, created_at }.
// Leaf declares every key (not `.loose()`) so a renamed jbuilder field surfaces
// in vitest as a missing-key parse error; the envelope stays loose via
// buildResponseSchema. NOT `.strict()` (strips unknowns rather than rejecting an
// API-added field — HUN-19943).
const companyMembershipSchema = z.object({
  id: z.number().int().positive(),
  domain: z.string(),
  created_at: z.string(),
})
const companyMembershipOutputSchema = buildResponseSchema(companyMembershipSchema)

// companies_controller.rb#destroy responds `head :no_content` (204 empty body),
// so callHunterApi synthesises a mutationAckSchema-shaped payload — the
// outputSchema MUST be mutationAckSchema, not a buildResponseSchema envelope.

// Update + Delete render no body (204 No Content). callHunterApi synthesises a
// mutationAckSchema-shaped payload, so the outputSchema MUST be mutationAckSchema.

// `filters` is a free-form, sanitized key/value bag (the controller deep-stringifies
// and sanitizes it). Accept it faithfully as an open record without inventing a
// filter DSL — only dynamic lists use it.
const filtersInputSchema = z.record(z.string(), z.unknown())

// callHunterApi's mutation form body accepts `string | string[] | nested object`.
// Convert the free-form `filters` record into that shape so Rails receives the
// nested `filters[...]` params the controller's sanitize_filters expects. Values
// are coerced to strings (or string arrays); nested objects recurse. null/undefined
// entries are dropped.
type FormValue = string | string[] | { [key: string]: FormValue }
function toFormParams(value: Record<string, unknown>): Record<string, FormValue> {
  const out: Record<string, FormValue> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (raw == null) continue
    if (Array.isArray(raw)) {
      out[key] = raw.filter((item) => item != null).map((item) => String(item))
    } else if (typeof raw === "object") {
      out[key] = toFormParams(raw as Record<string, unknown>)
    } else {
      out[key] = String(raw)
    }
  }
  return out
}

export function registerCompanyListTools(server: McpServer, apiKey: string, baseUrl: string) {
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
          .describe("Saved matching criteria for a dynamic list (key/value pairs). Required when type is 'dynamic'."),
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
          .describe("Updated matching criteria (applies only to dynamic lists; ignored for static lists)"),
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
      annotations: PRIVATE_WRITE_ANNOTATIONS,
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
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
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
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
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
        "Use this when the user wants to save a company to a static company list. Identify the list by `company_list_id` and the company by `company_id` (a company already saved in the user's account). Both the list and the company must belong to the user's team, and the list must be static — dynamic lists collect companies automatically by their filters and cannot have companies added manually. Returns the added company (`id`, `domain`, `created_at`); surface the saved company's domain to confirm. Returns an invalid_input error (id validation_failed) if the company is already in the list, a not-found error if the list or company does not exist, belongs to another team, or the list is dynamic, or a forbidden error if the user is not allowed to modify this list. Free to call.",
      inputSchema: {
        company_list_id: z.number().int().positive().describe("ID of the static company list to add the company to"),
        company_id: z.number().int().positive().describe("ID of the company (already saved in the account) to add"),
      },
      // create renders `{ data: { id, domain, created_at } }` (status 201), so
      // the success path is a rendered body — buildResponseSchema, not mutationAck.
      outputSchema: companyMembershipOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ company_list_id, company_id }) => {
      // On 400 (missing company_id), 404 (list/company not found, other team, or
      // dynamic list), or 422 (validation_failed: company already in the list)
      // callHunterApi returns the typed error envelope unchanged; we pass it
      // through so the model gets `structuredContent.error`.
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
