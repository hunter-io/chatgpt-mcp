import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { callHunterApi, PRIVATE_READ_ANNOTATIONS, TOOL_NAMES } from "../helpers"
import { buildResponseSchema, nullableString, paginationMetaSchema } from "../schemas/common"

// Per-item shape from app/app/views/api/connected_apps/_connected_app.jbuilder.
// Leaf is strict (no `.loose()`) so a jbuilder typo surfaces in vitest; the
// envelope is loose via buildResponseSchema. `name` resolves from the
// INTERNAL_APPS lookup (`provider_meta&.dig(:name)`) and falls back to
// `connected_app.provider_name`, so it can be null. `category` comes straight
// from `provider_meta&.dig(:category)` and is null for providers not in the
// internal catalog. `provider_email` is a nullable column. `connected_at`
// (created_at) and `updated_at` are ISO datetime strings.
const connectedAppSchema = z.object({
  id: z.number().int(),
  provider: z.string(),
  name: nullableString(),
  category: nullableString(),
  provider_email: nullableString(),
  connected_at: z.string(),
  updated_at: z.string(),
})

// index.jbuilder emits `json.data @apps do |connected_app| ...`, so `data` is an
// ARRAY of connected apps (not a `{ connected_apps: [...] }` object). `meta`
// carries `{ total, limit, offset }`.
const listConnectedAppsOutputSchema = buildResponseSchema(z.array(connectedAppSchema), paginationMetaSchema)

// Attribute mapping pairs an integration field with a Hunter field. From
// show.jbuilder: `json.attribute_mappings ... { target_field, source_field }`.
// Both `target_field` and `source_field` are NULLABLE columns on
// attribute_mappings (db/structure.sql) and the jbuilder emits them raw, so a
// mapping with an unset side serializes as null. Admit null — otherwise the SDK
// output validator rejects the whole response and Get-Connected-App fails on an
// otherwise-valid app (the HUN-20344 null-output bug class).
const attributeMappingSchema = z.object({
  target_field: nullableString(),
  source_field: nullableString(),
})

// show.jbuilder wraps the same per-item shape plus an `attribute_mappings`
// array, all nested under a single `data` object (not an array).
const getConnectedAppOutputSchema = buildResponseSchema(
  connectedAppSchema.extend({ attribute_mappings: z.array(attributeMappingSchema) }),
)

export function registerConnectedAppTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listConnectedApps,
    {
      description:
        "Use this when the user wants to see the connected apps (third-party integrations such as HubSpot, Pipedrive, Google Sheets, or a custom SMTP/IMAP inbox) linked to their Hunter account. Surface each app's `provider` and resolved `name` clearly: canonical names like Google Sheets come from Hunter's internal catalog, while others fall back to the provider name. Each entry also includes `category`, `provider_email`, and the `connected_at` / `updated_at` timestamps. Supports `limit` and `offset` pagination. Returns an empty list if no apps are connected. To inspect a specific app's field mappings, follow up with Get-Connected-App using its `id`. Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of apps to skip (default 0)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of apps to return (default 20, max 100)"),
      },
      outputSchema: listConnectedAppsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: "/connected_apps", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.getConnectedApp,
    {
      description:
        "Use this when the user wants the details of a single connected app, identified by ID, including its `attribute_mappings` — the list of `target_field` ↔ `source_field` pairs that map Hunter fields to the integration's fields. Present the mappings as a table or list. Also returns the `provider`, resolved `name`, `category`, `provider_email`, and `connected_at` / `updated_at` timestamps. Returns a not_found error if the app does not exist or belongs to a different team. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the connected app to retrieve"),
      },
      outputSchema: getConnectedAppOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/connected_apps/${id}`, apiKey, baseUrl })
    },
  )
}
