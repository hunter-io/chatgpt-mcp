import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  PRIVATE_WRITE_ANNOTATIONS,
  TOOL_NAMES,
} from "../helpers"
import { buildResponseSchema, mutationAckSchema, paginationMetaSchema } from "../schemas/common"

// Hunter custom attributes are simple { id, label, slug } records with an
// optional derived `leads_count`. `.loose()` only at the envelope level via
// buildResponseSchema — the leaf schema is strict so a jbuilder typo surfaces
// in vitest. Co-located with handlers (HUN-19943 architecture review).
const customAttributeSchema = z
  .object({
    id: z.number().int().positive(),
    label: z.string(),
    leads_count: z.number().int().nonnegative().optional(),
    slug: z.string().optional(),
  })
  .loose()

// The list endpoint emits `data: { leads_custom_attributes: [...] }` — wrap
// the array under that key so envelope validation matches the jbuilder.
const listOutputSchema = buildResponseSchema(
  z.object({ leads_custom_attributes: z.array(customAttributeSchema) }).loose(),
  paginationMetaSchema,
)
const singleOutputSchema = buildResponseSchema(customAttributeSchema)

// NOTE: the HTTP paths below intentionally use the snake_case `/leads_custom_attributes`.
// Unlike the other multi-word v2 resources (which the API exposes in kebab-case, e.g.
// `/leads-lists`, `/email-accounts`), `leads_custom_attributes` has NO kebab alias —
// `GET /v2/leads-custom-attributes` 404s. Keep the underscore here. This resource is the
// single allowlisted exception in the "v2 path convention" guard test (HUN-20797).
export function registerCustomAttributeTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listCustomAttributes,
    {
      description:
        "Use this when the user wants to list all custom attributes defined on leads in their Hunter account. Free to call.",
      inputSchema: {},
      outputSchema: listOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async () => {
      return callHunterApi({ path: "/leads_custom_attributes", apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.getCustomAttribute,
    {
      description: "Use this when the user wants to retrieve a single custom-attribute definition by ID. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the custom attribute to retrieve"),
      },
      outputSchema: singleOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads_custom_attributes/${id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.createCustomAttribute,
    {
      description:
        "Use this when the user wants to define a new custom attribute on leads, identified by label. Free to call.",
      inputSchema: {
        label: z.string().min(1).max(100).describe("Label for the new custom attribute"),
      },
      outputSchema: singleOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ label }) => {
      return callHunterApi({
        path: "/leads_custom_attributes",
        apiKey,
        baseUrl,
        method: "POST",
        params: { label },
      })
    },
  )

  // Destructive because the rename overwrites the prior attribute label and the
  // previous value cannot be retrieved from the Hunter API. Per OpenAI Apps SDK
  // reference, tools that "may delete or overwrite user data" warrant
  // destructiveHint: true. HUN-20170-v3, Phase 1.3.
  server.registerTool(
    TOOL_NAMES.updateCustomAttribute,
    {
      description:
        "Use this when the user wants to rename an existing custom-attribute definition, identified by ID. Overwrites the existing label; the previous label cannot be recovered from the API. If the user declines the rename, offer to instead create a new custom-attribute definition with the desired label. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the custom attribute to update"),
        label: z.string().min(1).max(100).describe("New label for the custom attribute"),
      },
      outputSchema: singleOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id, label }) => {
      return callHunterApi({
        path: `/leads_custom_attributes/${id}`,
        apiKey,
        baseUrl,
        method: "PUT",
        params: { label },
      })
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteCustomAttribute,
    {
      description:
        "Use this when the user wants to permanently delete a custom-attribute definition, identified by ID. Per-lead values stored for the attribute are dropped and cannot be recovered. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the custom attribute to delete"),
      },
      // Hunter returns 204 No Content — callHunterApi synthesises
      // mutationAckSchema-shaped structuredContent so outputSchema validates.
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({
        path: `/leads_custom_attributes/${id}`,
        apiKey,
        baseUrl,
        method: "DELETE",
      })
    },
  )
}
