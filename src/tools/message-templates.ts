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
import { buildResponseSchema, mutationAckSchema, nullableString, paginationMetaSchema } from "../schemas/common"

// Hunter message-template shape from
// app/app/views/api/message_templates/_message_template.jbuilder: id, name,
// subject, body, message_format, created_at, updated_at. `subject` is a
// nullable varchar and MessageTemplate::Validator only checks its length when
// present, so null/blank subjects are legal. `body` is a nullable text column
// (db/structure.sql); MessageTemplate::Validator enforces presence, but
// EmailTemplates::ImportController#create copies EmailTemplate#body (also a
// nullable text column) via MessageTemplate.insert_all!, which bypasses
// validations — so an imported row can persist and serialize `body: null`.
// `message_format` mirrors the
// follow-ups column: a nullable varchar (db/structure.sql) whose inclusion in
// html/text is validated only conditionally (the MessageFormat concern treats
// blank-as-html for persisted rows), so a legacy row can serialize
// `message_format: null` — admit null alongside the enum. Leaf declares every
// jbuilder key (no `.loose()`) so a renamed key surfaces in vitest; unknown
// extra keys are stripped (Zod default), and the envelope stays loose via
// buildResponseSchema.
const messageTemplateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  subject: nullableString(),
  body: nullableString(),
  message_format: z.union([z.enum(["text", "html"]), z.null()]),
  created_at: z.string(),
  updated_at: z.string(),
})

// app/app/views/api/message_templates/index.jbuilder emits
// `meta: { total, params: { limit, offset } }` — the limit/offset echo is
// NESTED under `params`, unlike most list endpoints which echo them at the
// top level. Extend the shared pagination meta with the typed `params` echo
// so agents can plan the next page without regex over prose.
const listMessageTemplatesMetaSchema = paginationMetaSchema.extend({
  params: z
    .object({
      limit: z.number().int().nonnegative(),
      offset: z.number().int().nonnegative(),
    })
    .loose()
    .optional(),
})

const listMessageTemplatesDataSchema = z.object({ message_templates: z.array(messageTemplateSchema) }).loose()

const listMessageTemplatesOutputSchema = buildResponseSchema(
  listMessageTemplatesDataSchema,
  listMessageTemplatesMetaSchema,
)
// show.jbuilder / create.jbuilder / update.jbuilder all render
// `json.data { json.partial! "api/message_templates/message_template" }`, so
// Get/Create/Update share the single-template envelope.
const singleMessageTemplateOutputSchema = buildResponseSchema(messageTemplateSchema)

export function registerMessageTemplateTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listMessageTemplates,
    {
      description:
        "Use this when the user wants to see the saved message templates in their Hunter account, or when the user is drafting a sequence step (an introduction message or a follow-up) — list the templates first and ask whether they want to use a saved template as the starting point. Each template carries a reusable `subject`, `body`, and `message_format` (text or html). To build a follow-up step from one, pass the chosen template's id as `message_template_id` to Create-Sequence-Follow-Up: the step's subject, body, and format are pre-filled from the template (any subject/body you pass explicitly wins over the template's). Supports `limit` and `offset` pagination (default 25 per page, max 100); templates are ordered newest first. Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of templates to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of templates to return (default 25, max 100)"),
      },
      outputSchema: listMessageTemplatesOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: "/message-templates", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.getMessageTemplate,
    {
      description:
        "Use this when the user wants to inspect a single saved message template by ID — its full `subject`, `body`, and `message_format` — for example to preview it before reusing it in a sequence follow-up (via Create-Sequence-Follow-Up's `message_template_id`), or to copy and adapt its content. Returns a not-found error if the template does not exist or belongs to another team. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the message template to retrieve"),
      },
      outputSchema: singleMessageTemplateOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/message-templates/${id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.createMessageTemplate,
    {
      description:
        "Use this when the user wants to save a reusable message template — including when they ask to save a message draft written in chat (e.g. a sequence introduction or follow-up they liked) as a new template for later reuse. `name` and `body` are required; `subject` is optional and `message_format` defaults to html. The saved template can then pre-fill sequence steps via Create-Sequence-Follow-Up's `message_template_id`. Personalization placeholders like {{first_name}} are supported in the subject and body, but placeholders carrying the literal fallback markers FALLBACK or DEFAULT are rejected with a validation error. Free to call.",
      inputSchema: {
        name: z.string().min(1).max(255).describe("Name of the template, shown in the Hunter template picker"),
        subject: z
          .string()
          .max(250)
          .optional()
          .describe("Email subject line (max 250 characters); may include personalization placeholders"),
        body: z
          .string()
          .min(1)
          .max(50_000)
          .describe("Message body (max 50,000 characters); HTML unless message_format is text"),
        message_format: z
          .enum(["html", "text"])
          .optional()
          .describe("Message format of the body; defaults to html when omitted"),
      },
      outputSchema: singleMessageTemplateOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ name, subject, body, message_format }) => {
      const params: Record<string, string> = { name, body }
      if (subject !== undefined) params.subject = subject
      if (message_format !== undefined) params.message_format = message_format
      const result = await callHunterApi({
        path: "/message-templates",
        apiKey,
        baseUrl,
        method: "POST",
        params,
      })
      return withDeepLinkFromId(result, (id) => `/message-templates/${id}`)
    },
  )

  // DESTRUCTIVE: updating overwrites the previous template content and the
  // prior values cannot be recovered from the Hunter API. Sequence steps
  // ALREADY created from this template are unaffected: the Rails controller
  // behind Create-Sequence-Follow-Up copies subject/body/format into the step
  // at creation time (`apply_template_defaults`), it does not keep a live
  // reference to the template.
  server.registerTool(
    TOOL_NAMES.updateMessageTemplate,
    {
      description:
        "Use this when the user wants to edit a saved message template's name, subject, body, or message format. Only the fields provided are changed; the previous values are overwritten and cannot be recovered from the API. Sequence steps already created from this template keep their own copy of the subject and body, so updating the template does not change any existing sequence. Returns a not-found error if the template does not exist or belongs to another team. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the message template to update"),
        name: z.string().min(1).max(255).optional().describe("New name for the template"),
        subject: z.string().max(250).optional().describe("New email subject line (max 250 characters)"),
        body: z.string().min(1).max(50_000).optional().describe("New message body (max 50,000 characters)"),
        message_format: z.enum(["html", "text"]).optional().describe("New message format of the body"),
      },
      outputSchema: singleMessageTemplateOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id, name, subject, body, message_format }) => {
      const params: Record<string, string> = {}
      if (name !== undefined) params.name = name
      if (subject !== undefined) params.subject = subject
      if (body !== undefined) params.body = body
      if (message_format !== undefined) params.message_format = message_format
      const result = await callHunterApi({
        path: `/message-templates/${id}`,
        apiKey,
        baseUrl,
        method: "PUT",
        params,
      })
      return withDeepLink(result, `/message-templates/${id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteMessageTemplate,
    {
      description:
        "Use this when the user wants to permanently delete a saved message template by ID. Deleting cannot be undone from the API. Sequence steps already created from this template keep their own copy of the subject and body, so deleting the template does not change any existing sequence. Returns a not-found error if the template does not exist or belongs to another team. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the message template to delete"),
      },
      // The Rails controller responds `head :no_content` (204, empty body —
      // app/app/controllers/api/message_templates_controller.rb#destroy), so
      // callHunterApi synthesises the mutationAckSchema-shaped envelope.
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/message-templates/${id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )
}
