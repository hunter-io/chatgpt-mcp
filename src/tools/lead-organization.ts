import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  PRIVATE_WRITE_ANNOTATIONS,
  TOOL_NAMES,
  withDeepLink,
} from "../helpers"
import { buildResponseSchema, mutationAckSchema, paginationMetaSchema } from "../schemas/common"

// ─── Lead organization: tags, leads-list folders, favorites (HUN-20849) ─────
//
// Mirrors src/tools/company-lists.ts (the company-list folders + favorite +
// membership sibling): same leaf-grounding discipline, same annotation
// posture, same description phrasing for the folder/favorite equivalents.
// The organize-as-you-go UX (HUN-20850) lives in the descriptions: tagging
// tools steer the model to List-Lead-Tags first and to reuse existing tags
// before creating near-duplicates; favorites mark a list as the default
// destination suggestion; folders are surfaced when the account has many lists.

// `color` is a CLOSED enum on Create/Update for BOTH lead tags and leads-list
// folders: the models validate `inclusion: { in: VALID_COLORS }`
// (app/app/models/tag.rb and app/app/models/leads_list/folder.rb declare the
// SAME 14-swatch palette) and the dashboard hands the user exactly these
// swatches. Enumerate the set on the input so an invalid color is rejected
// before the network call (agent parity with the swatch picker), instead of
// fail-and-retry on a 422. Unlike company-list folders, BOTH create endpoints
// here sample a random valid color server-side when none is supplied, so
// `color` stays optional on create.
const VALID_COLORS = [
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
const VALID_COLORS_LIST = VALID_COLORS.join(", ")

// ─── Lead tags ───────────────────────────────────────────────────────────────
//
// Tag leaf shape from app/app/views/api/tags/_tag.jbuilder:
//   id, name, color (hex string, no leading '#'), created_at.
// Leaf declares every key (not `.loose()`) so a jbuilder rename surfaces in
// vitest as a missing-key parse error; the envelope stays loose via
// buildResponseSchema. Leaf-output `color` stays `z.string()`: the enum guard
// belongs on the input, not the response leaf.
const tagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  color: z.string(),
  created_at: z.string(),
})

// index.jbuilder wraps the array in `json.data do json.tags @tags`, so `data`
// is a `{ tags: [...] }` object. `meta` carries `{ total, params: { limit,
// offset } }` — `total` matches paginationMetaSchema and the loose envelope
// absorbs the nested `params` echo.
const listTagsDataSchema = z.object({ tags: z.array(tagSchema) })
const listTagsOutputSchema = buildResponseSchema(listTagsDataSchema, paginationMetaSchema)

// create.jbuilder / update.jbuilder render the tag partial directly at the
// `data` level (create → 201, update → 200 with the UPDATED tag body — the
// tags controller renders on update, unlike the 204-No-Content company-list
// update), so the single-item envelope wraps the tag leaf.
const singleTagOutputSchema = buildResponseSchema(tagSchema)

// Delete renders no body (`head :no_content`, 204). callHunterApi synthesises
// a mutationAckSchema-shaped payload, so the outputSchema MUST be
// mutationAckSchema — a buildResponseSchema envelope would reject the
// synthesised ack at the SDK validator (HUN-19943 P1).

// ─── Per-lead tagging ────────────────────────────────────────────────────────
//
// Api::Leads::TaggingsController#create renders the lead's FULL current tag
// set via app/app/views/api/leads/taggings/{create,_tag}.jbuilder:
//   `json.data { json.tags @lead.tags }` → each tag is { id, name, color } —
// note: NO created_at on this per-lead partial, unlike api/tags/_tag.jbuilder.
// `meta` carries `{ params: { id, tag_id } }` (raw param echo) — absorbed by
// the default loose meta. Leaf declares every key so a rename surfaces in
// vitest; NOT `.strict()` (an output leaf strips unknowns rather than
// rejecting an API-added field — HUN-19943).
const leadTagBriefSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  color: z.string(),
})
const addTagToLeadDataSchema = z.object({ tags: z.array(leadTagBriefSchema) })
const addTagToLeadOutputSchema = buildResponseSchema(addTagToLeadDataSchema)

// TaggingsController#destroy responds `head :no_content` (204 empty body), so
// callHunterApi synthesises a mutationAckSchema-shaped payload — the
// outputSchema MUST be mutationAckSchema, not a buildResponseSchema envelope.

// ─── Leads-list folders ──────────────────────────────────────────────────────
//
// Folder leaf shape from app/app/views/api/leads_lists/folders/_folder.jbuilder:
//   id, name, color (hex string, no leading '#'), leads_lists_count, created_at.
// Leaf is strict so a jbuilder rename surfaces in vitest; the envelope stays
// loose via buildResponseSchema.
const folderSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  color: z.string(),
  leads_lists_count: z.number().int().nonnegative(),
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

// Update + Delete render no body (204 No Content — the controller actions
// return without rendering). callHunterApi synthesises a mutationAckSchema-
// shaped payload, so the outputSchema MUST be mutationAckSchema.

// ─── Leads-list favorite / unfavorite ────────────────────────────────────────
//
// app/app/controllers/api/leads_lists/favorites_controller.rb renders an
// INLINE body on both verbs (NOT an empty 204 ack): `create` → `{ data: { id,
// favorited: true } }` status 201; `destroy` → `{ data: { id, favorited:
// false } }` status 200. So both tools use a buildResponseSchema envelope
// around the `{ id, favorited }` leaf — never mutationAckSchema. Leaf declares
// every key (not `.loose()`) so a renamed field surfaces in vitest as a
// missing-key parse error; NOT `.strict()` (an output leaf strips unknowns
// rather than rejecting an API-added field — HUN-19943).
const favoriteToggleSchema = z.object({
  id: z.number().int().positive(),
  favorited: z.boolean(),
})
const favoriteToggleOutputSchema = buildResponseSchema(favoriteToggleSchema)

export function registerLeadOrganizationTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listLeadTags,
    {
      description:
        "Use this when the user wants to see the lead tags in their Hunter account — and ALWAYS before tagging leads or creating a new tag, so you can suggest reusing an existing tag instead of creating a near-duplicate. Tags label leads for organization and filtering and are shared with the whole team. Tags are ordered with the most recently created first; each tag reports its `name`, `color` (a hex color string), and `created_at`. Supports `limit` and `offset` pagination (default limit 25, max 100). Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of tags to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of tags to return (default 25, max 100)"),
      },
      outputSchema: listTagsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      // Unlike List-Company-Lists, no client-side defaults are needed here:
      // Api::Concerns::Pagination defaults params[:limit] server-side (25 for
      // tags via Api::TagsController#default_limit) BEFORE the query runs and
      // the jbuilder echoes the defaulted params in meta.params, so a no-arg
      // call returns the first page with an accurate echo.
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: "/tags", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.createLeadTag,
    {
      description: `Use this when the user wants to create a new lead tag. Before creating one, call ${TOOL_NAMES.listLeadTags} and prefer reusing an existing tag with the same meaning (e.g. "Customers" vs "customer") instead of creating a near-duplicate — ${TOOL_NAMES.addTagToLead} can also create a tag on the fly by name while tagging. Provide a \`name\`; \`color\` is optional and must be one of the allowed Hunter tag colors (hex without a leading '#'): ${VALID_COLORS_LIST} — when omitted, Hunter picks a random color from that palette. Tags are shared with the whole team. Returns an invalid_input error (id validation_failed) if the name is missing, longer than 255 characters, or already used by another lead tag in the user's team. Free to call.`,
      inputSchema: {
        name: z.string().min(1).max(255).describe("Name of the new lead tag (unique within the team)"),
        color: z
          .enum(VALID_COLORS)
          .optional()
          .describe(
            `Tag color. One of the allowed Hunter tag colors (hex without a leading '#'): ${VALID_COLORS_LIST}. Omit to let Hunter pick a random color from that palette.`,
          ),
      },
      outputSchema: singleTagOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ name, color }) => {
      const params: Record<string, string> = { name }
      if (color !== undefined) params.color = color
      // On 422 (validation_failed: missing/duplicate/too-long name, invalid
      // color) callHunterApi returns the typed error envelope unchanged; we
      // pass it through so the model gets `structuredContent.error`.
      return callHunterApi({ path: "/tags", apiKey, baseUrl, method: "POST", params })
    },
  )

  server.registerTool(
    TOOL_NAMES.updateLeadTag,
    {
      description: `Use this when the user wants to rename a lead tag or change its color, identified by ID. Renaming overwrites the previous name everywhere the tag is applied, and the old name cannot be recovered from the API; if the user declines the rename, offer to create a new tag with the desired name instead. \`color\` must be one of the allowed Hunter tag colors (hex without a leading '#'): ${VALID_COLORS_LIST}. Returns the updated tag. Only the tag's owner, a team admin, or the team owner may update it. Returns a not-found error if the tag does not exist or belongs to another team, a forbidden error if the user is not allowed to update it, or an invalid_input error (id validation_failed) if the new name is empty, too long, or duplicated, or the color is not one of the allowed values. Free to call.`,
      inputSchema: {
        id: z.number().int().positive().describe("ID of the lead tag to update"),
        name: z.string().min(1).max(255).optional().describe("New name for the tag"),
        color: z
          .enum(VALID_COLORS)
          .optional()
          .describe(
            `New tag color. One of the allowed Hunter tag colors (hex without a leading '#'): ${VALID_COLORS_LIST}.`,
          ),
      },
      // Update renders the UPDATED tag body (app/app/views/api/tags/update.jbuilder,
      // status 200) — a rendered body, so buildResponseSchema, not mutationAck.
      outputSchema: singleTagOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id, name, color }) => {
      const params: Record<string, string> = {}
      if (name !== undefined) params.name = name
      if (color !== undefined) params.color = color
      // On 404 (not found / other team), 403 (not the owner nor a team
      // admin/owner), or 422 (validation_failed) callHunterApi returns the
      // typed error envelope unchanged; we pass it through so the model gets
      // `structuredContent.error`.
      return callHunterApi({ path: `/tags/${id}`, apiKey, baseUrl, method: "PUT", params })
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteLeadTag,
    {
      description: `Use this when the user wants to delete a lead tag by ID. Deleting a tag removes it from EVERY lead it is applied to (the tag's assignments are destroyed with it); the leads themselves are untouched. This cannot be undone from the API, so confirm with the user before deleting a tag that may still be in use — to detach a tag from a single lead instead, use ${TOOL_NAMES.removeTagFromLead}. Only the tag's owner, a team admin, or the team owner may delete it. Succeeds with no content on success. Returns a not-found error if the tag does not exist or belongs to another team, or a forbidden error if the user is not allowed to delete it. Free to call.`,
      inputSchema: {
        id: z.number().int().positive().describe("ID of the lead tag to delete"),
      },
      // Delete renders no body (`head :no_content`, 204), so callHunterApi
      // synthesises a mutationAckSchema-shaped payload.
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id }) => {
      // On 404 (not found / other team) or 403 (not the owner nor a team
      // admin/owner) callHunterApi returns the typed error envelope unchanged;
      // we pass it through so the model gets `structuredContent.error`.
      return callHunterApi({ path: `/tags/${id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    TOOL_NAMES.addTagToLead,
    {
      description: `Use this when the user wants to tag a lead, identified by \`lead_id\`. Provide either \`tag_id\` (an existing tag) or \`tag_name\`; with \`tag_name\`, a tag that does not exist yet is created automatically with a random color. Call ${TOOL_NAMES.listLeadTags} first and suggest reusing an existing tag (by \`tag_id\` or its exact name) before introducing a near-duplicate name. The call is idempotent: re-adding a tag the lead already has still succeeds. Returns the lead's full current tag set (\`tags\`, each with \`id\`, \`name\`, and \`color\`) — surface it to confirm. Returns an invalid_input error (id tag_required) if neither \`tag_id\` nor \`tag_name\` is given, a not-found error if the lead or the tag does not exist or belongs to another team, or an invalid_input error (id validation_failed) if the new tag name is invalid. Free to call.`,
      inputSchema: {
        lead_id: z.number().int().positive().describe("ID of the lead to tag"),
        tag_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("ID of an existing tag to attach (preferred when the tag already exists)"),
        tag_name: z
          .string()
          .min(1)
          .max(255)
          .optional()
          .describe(
            "Name of the tag to attach. Reuses the team's existing tag with that exact name, or creates it with a random color when missing. Ignored when tag_id is given.",
          ),
      },
      outputSchema: addTagToLeadOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ lead_id, tag_id, tag_name }) => {
      // Mirror the controller's resolve_tag precedence: tag_id wins when both
      // are given. When neither is given, send no params and pass Rails'
      // 422 (id tag_required) error envelope through unchanged.
      const params: Record<string, string> = {}
      if (tag_id !== undefined) params.tag_id = String(tag_id)
      else if (tag_name !== undefined) params.tag_name = tag_name
      const result = await callHunterApi({
        path: `/leads/${lead_id}/tags`,
        apiKey,
        baseUrl,
        method: "POST",
        params,
      })
      return withDeepLink(result, `/leads/${lead_id}`)
    },
  )

  // Remove-Tag-From-Lead uses PRIVATE_WRITE_ANNOTATIONS (not destructive),
  // mirroring Remove-Company-From-List in src/tools/company-lists.ts: this
  // only detaches the tag from one lead — the tag itself is not deleted and
  // can be re-applied, so the action is fully reversible. Delete-Lead-Tag
  // (which destroys the tag and all its assignments) is the destructive one.
  server.registerTool(
    TOOL_NAMES.removeTagFromLead,
    {
      description: `Use this when the user wants to remove a tag from a single lead, identified by \`lead_id\` and \`tag_id\`. This only detaches the tag from that lead; the tag itself is not deleted and stays available to re-apply later, so the action is reversible (to delete the tag everywhere, use ${TOOL_NAMES.deleteLeadTag}). The call is idempotent: removing a tag the lead does not have still succeeds. Succeeds with no content on success. Returns a not-found error if the lead or the tag does not exist or belongs to another team. Free to call.`,
      inputSchema: {
        lead_id: z.number().int().positive().describe("ID of the lead to remove the tag from"),
        tag_id: z.number().int().positive().describe("ID of the tag to detach from the lead"),
      },
      // destroy responds `head :no_content` (204 empty body), so callHunterApi
      // synthesises a mutationAckSchema-shaped payload.
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ lead_id, tag_id }) => {
      // On 404 (lead/tag not found or other team) callHunterApi returns the
      // typed error envelope unchanged; we pass it through so the model gets
      // `structuredContent.error`.
      return callHunterApi({ path: `/leads/${lead_id}/tags/${tag_id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    TOOL_NAMES.listLeadsListFolders,
    {
      description:
        "Use this when the user wants to see the leads-list folders in their Hunter account — and when the account has many leads lists, since grouping lists by folder is how users keep a large workspace navigable (surface the folder structure when suggesting where a list lives). Folders group leads lists and are visible to the whole team. Folders are ordered with the most recently created first; each folder reports its `name`, `color` (a hex color string), `leads_lists_count` (how many lists are filed in it), and `created_at`. Supports `limit` and `offset` pagination (default 20, max 100). Free to call.",
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
      // No client-side defaults needed: Api::Concerns::Pagination defaults
      // params[:limit] to 20 server-side before the jbuilder echoes it, and
      // the folders controller additionally clamps limit to [1, 100] — a
      // no-arg call returns the first page with an accurate meta echo.
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: "/leads-lists/folders", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.createLeadsListFolder,
    {
      description: `Use this when the user wants to create a new leads-list folder to group leads lists — worth suggesting once the account has many lists. Provide a \`name\`; \`color\` is optional and must be one of the allowed Hunter folder colors (hex without a leading '#'): ${VALID_COLORS_LIST} — when omitted, Hunter picks a random color from that palette. A team can have at most 100 folders. Returns an invalid_input error (id validation_failed) if the name is missing or already used by another folder in the user's team, if the color is not one of the allowed values, or if the folder limit is reached. Free to call.`,
      inputSchema: {
        name: z.string().min(1).max(255).describe("Name of the new folder (unique within the team)"),
        color: z
          .enum(VALID_COLORS)
          .optional()
          .describe(
            `Folder color. One of the allowed Hunter folder colors (hex without a leading '#'): ${VALID_COLORS_LIST}. Omit to let Hunter pick a random color from that palette.`,
          ),
      },
      outputSchema: singleFolderOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ name, color }) => {
      const params: Record<string, string> = { name }
      if (color !== undefined) params.color = color
      // On 422 (validation_failed: missing/duplicate name, invalid color,
      // 100-folder team limit reached) callHunterApi returns the typed error
      // envelope unchanged; we pass it through so the model gets
      // `structuredContent.error`.
      return callHunterApi({ path: "/leads-lists/folders", apiKey, baseUrl, method: "POST", params })
    },
  )

  server.registerTool(
    TOOL_NAMES.updateLeadsListFolder,
    {
      description: `Use this when the user wants to update a leads-list folder, identified by ID. You can rename it (\`name\`) and change its \`color\`. \`color\` must be one of the allowed Hunter folder colors (hex without a leading '#'): ${VALID_COLORS_LIST}. Renaming overwrites the previous name, which cannot be recovered from the API; if the user declines the rename, offer to create a new folder with the desired name instead. Succeeds with no content on success. Only the folder's owner, a team admin, or the team owner may update it. Returns a not-found error if the folder does not exist, a forbidden error if the user is not allowed to update it, or an invalid_input error (id validation_failed) if the new name is duplicated or the color is not one of the allowed values. Free to call.`,
      inputSchema: {
        id: z.number().int().positive().describe("ID of the folder to update"),
        name: z.string().min(1).max(255).optional().describe("New name for the folder"),
        color: z
          .enum(VALID_COLORS)
          .optional()
          .describe(
            `New folder color. One of the allowed Hunter folder colors (hex without a leading '#'): ${VALID_COLORS_LIST}.`,
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
      return callHunterApi({ path: `/leads-lists/folders/${id}`, apiKey, baseUrl, method: "PUT", params })
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteLeadsListFolder,
    {
      description:
        "Use this when the user wants to delete a leads-list folder by ID. Deleting a folder does not delete the leads lists filed in it — each affected list keeps existing and simply becomes unfiled (its folder is cleared and it is re-ordered after the existing unfiled lists). Deleting a folder cannot be undone from the API. Only the folder's owner, a team admin, or the team owner may delete it. Succeeds with no content on success. Returns a not-found error if the folder does not exist, or a forbidden error if the user is not allowed to delete it. Free to call.",
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
      return callHunterApi({ path: `/leads-lists/folders/${id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    TOOL_NAMES.favoriteLeadsList,
    {
      description:
        "Use this when the user wants to mark a leads list as a favorite, identified by ID. Favorites are a personal flag for the current user, and a favorited list is a strong signal of their preferred working list — suggest it as the default destination when the user saves new leads without naming a list. Favoriting is reversible (it can be undone later) and does not change the list's contents. The call is idempotent: favoriting a list that is already a favorite still succeeds and returns `favorited: true`. Surface the `favorited: true` response to confirm the action succeeded. Returns a not-found error if the list does not exist or belongs to another team. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the leads list to favorite"),
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
      return callHunterApi({ path: `/leads-lists/${id}/favorite`, apiKey, baseUrl, method: "POST" })
    },
  )

  server.registerTool(
    TOOL_NAMES.unfavoriteLeadsList,
    {
      description:
        "Use this when the user wants to remove the favorite flag from a leads list, identified by ID. This only clears the current user's personal favorite marker; the list and its contents are untouched, and it can be favorited again later. The call is idempotent: unfavoriting a list that is not currently a favorite still succeeds and returns `favorited: false`. Surface the `favorited: false` response to confirm the favorite was removed. Returns a not-found error if the list does not exist or belongs to another team. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the leads list to unfavorite"),
      },
      // destroy renders `{ data: { id, favorited: false } }` (status 200), so
      // the success path is a rendered body — buildResponseSchema, not mutationAck.
      outputSchema: favoriteToggleOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ id }) => {
      // On 404 (list does not exist or belongs to another team) callHunterApi
      // returns the typed error envelope unchanged; we pass it through so the
      // model gets `structuredContent.error`.
      return callHunterApi({ path: `/leads-lists/${id}/favorite`, apiKey, baseUrl, method: "DELETE" })
    },
  )
}
