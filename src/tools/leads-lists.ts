import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  PRIVATE_WRITE_ANNOTATIONS,
  TOOL_NAMES,
  withDeepLink,
  withDeepLinkFromId,
} from "../helpers"
import { buildResponseSchema, hunterUrl, mutationAckSchema, paginationMetaSchema } from "../schemas/common"

// Hunter leads-list shape from app/app/views/api/leads_lists/_leads_list.json.jbuilder.
// .loose() at the envelope level (via buildResponseSchema); leaf is strict so a
// jbuilder typo surfaces in vitest. Co-located with handlers.
const leadsListSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    leads_count: z.number().int().nonnegative().optional(),
    team_id: z.number().int().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .loose()

const listLeadsListsDataSchema = z.object({ leads_lists: z.array(leadsListSchema) }).loose()

const listOutputSchema = buildResponseSchema(listLeadsListsDataSchema, paginationMetaSchema)
const singleOutputSchema = buildResponseSchema(leadsListSchema)

// Delete-Leads-List can return:
//   - 204 No Content (synchronous delete, list had ≤10 leads)
//   - 202 Accepted (async destroy scheduled via scheduled_destroy)
// Either way callHunterApi synthesises a mutationAckSchema-shaped payload.
//
// Merge can also return 202 for large lists. callHunterApi synthesises
// mutationAckSchema-shaped structuredContent in both cases (empty body), so
// the outputSchema MUST be `mutationAckSchema` — a `buildResponseSchema`
// envelope rejects the synthesised ack at the SDK validator (HUN-19943 P1).

// Merge-Leads-Lists returns the empty-body mutationAck envelope AND a
// viewInHunter deep link (handler calls withDeepLink). Extend the strict
// mutationAckSchema to declare the optional URL — without this, the
// undeclared field is silently stripped by the SDK validator or triggers
// an "Output validation error" log line. See PR #12212 Claude bot review.
const mergeAckOutputSchema = mutationAckSchema.extend({ viewInHunter: hunterUrl.optional() })

export function registerLeadsListTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listLeadsLists,
    {
      description:
        "Use this when the user wants to list the leads lists in their Hunter account, with pagination. Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of lists to skip"),
        limit: z.number().int().positive().max(100).optional().describe("Maximum number of lists to return"),
      },
      outputSchema: listOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: "/leads_lists", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.getLeadsList,
    {
      description:
        "Use this when the user wants to retrieve a single leads list (name, lead count, timestamps) by ID. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the leads list to retrieve"),
      },
      outputSchema: singleOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads_lists/${id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.createLeadsList,
    {
      description: "Use this when the user wants to create a new, empty leads list with the given name. Free to call.",
      inputSchema: {
        name: z.string().min(1).max(100).describe("Name of the new leads list"),
      },
      outputSchema: singleOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ name }) => {
      const result = await callHunterApi({
        path: "/leads_lists",
        apiKey,
        baseUrl,
        method: "POST",
        params: { name },
      })
      return withDeepLinkFromId(result, (id) => `/leads?leads_list_id=${id}`)
    },
  )

  // Destructive because the rename overwrites the prior list name and the previous
  // value cannot be retrieved from the Hunter API. Per OpenAI Apps SDK reference,
  // tools that "may delete or overwrite user data" warrant destructiveHint: true.
  // HUN-20170-v3, Phase 1.2.
  server.registerTool(
    TOOL_NAMES.updateLeadsList,
    {
      description:
        "Use this when the user wants to rename an existing leads list, identified by ID. Overwrites the existing list name; the previous name cannot be recovered from the API. If the user declines the rename, offer to instead create a new leads list with the desired name. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the leads list to update"),
        name: z.string().min(1).max(100).describe("New name for the leads list"),
      },
      outputSchema: singleOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id, name }) => {
      const result = await callHunterApi({
        path: `/leads_lists/${id}`,
        apiKey,
        baseUrl,
        method: "PUT",
        params: { name },
      })
      return withDeepLink(result, `/leads?leads_list_id=${id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteLeadsList,
    {
      description:
        "Use this when the user wants to permanently delete a leads list, identified by ID. Lists with more than 10 leads are scheduled for asynchronous deletion (HTTP 202). Free to call. Deleting a list cannot be undone from the API.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the leads list to delete"),
      },
      // 202 (async) and 204 (sync) both yield mutationAckSchema-shaped structuredContent.
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads_lists/${id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    TOOL_NAMES.mergeLeadsLists,
    {
      description:
        "Use this when the user wants to move every lead from a source list into a destination list. The source list is permanently deleted after the move. Leads on the destination list are preserved. Free to call. Merging cannot be undone from the API.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the source leads list (will be merged and deleted)"),
        destination_leads_list_id: z
          .number()
          .int()
          .positive()
          .describe("ID of the destination leads list (will receive all leads and be kept)"),
      },
      // Merge always returns an empty body (202 async or 204 sync), which
      // callHunterApi synthesises as mutationAckSchema — matching the
      // Delete-Leads-List pattern. The handler also injects a viewInHunter
      // deep link via withDeepLink, so use the extended schema that
      // declares the optional URL field.
      outputSchema: mergeAckOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id, destination_leads_list_id }) => {
      const result = await callHunterApi({
        path: `/leads_lists/${id}/merge`,
        apiKey,
        baseUrl,
        method: "POST",
        params: { destination_leads_list_id: String(destination_leads_list_id) },
      })
      return withDeepLink(result, `/leads?leads_list_id=${destination_leads_list_id}`)
    },
  )
}
