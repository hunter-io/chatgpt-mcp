import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  callHunterApi,
  DESTRUCTIVE_ANNOTATIONS,
  READ_ONLY_ANNOTATIONS,
  TOOL_NAMES,
  WRITE_ANNOTATIONS,
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

export function registerCustomAttributeTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listCustomAttributes,
    {
      description: "List all custom attributes for leads. Free (no credits).",
      inputSchema: {},
      outputSchema: listOutputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      return callHunterApi({ path: "/leads_custom_attributes", apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.getCustomAttribute,
    {
      description: "Get a single custom attribute by ID. Free (no credits).",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the custom attribute to retrieve"),
      },
      outputSchema: singleOutputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads_custom_attributes/${id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.createCustomAttribute,
    {
      description: "Create a new custom attribute for leads. Free (no credits).",
      inputSchema: {
        label: z.string().min(1).max(100).describe("Label for the new custom attribute"),
      },
      outputSchema: singleOutputSchema.shape,
      annotations: WRITE_ANNOTATIONS,
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

  server.registerTool(
    TOOL_NAMES.updateCustomAttribute,
    {
      description: "Rename an existing custom attribute. Free (no credits).",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the custom attribute to update"),
        label: z.string().min(1).max(100).describe("New label for the custom attribute"),
      },
      outputSchema: singleOutputSchema.shape,
      annotations: WRITE_ANNOTATIONS,
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
      description: "Delete a custom attribute by ID. Free (no credits).",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the custom attribute to delete"),
      },
      // Hunter returns 204 No Content — callHunterApi synthesises
      // mutationAckSchema-shaped structuredContent so outputSchema validates.
      outputSchema: mutationAckSchema.shape,
      annotations: DESTRUCTIVE_ANNOTATIONS,
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
