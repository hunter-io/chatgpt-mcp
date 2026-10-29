import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  HUNTER_SOURCE_SUFFIX,
  type McpTextResult,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  PRIVATE_READ_ANNOTATIONS,
  PRIVATE_WRITE_ANNOTATIONS,
  TOOL_NAMES,
  buildNextAction,
  callHunterApi,
  desc,
  embedNextAction,
  parseHunterApiData,
  withDeepLink,
  withDeepLinkFromId,
} from "../helpers"
import {
  buildResponseSchema,
  mutationAckSchema,
  nullableNumber,
  nullableString,
  paginationMetaSchema,
  verificationSchema,
} from "../schemas/common"

const leadFieldsSchema = {
  email: z.string().optional().describe("Email address of the lead"),
  first_name: z.string().optional().describe("First name of the lead"),
  last_name: z.string().optional().describe("Last name of the lead"),
  position: z.string().optional().describe("Job title or position"),
  company: z.string().optional().describe("Company name"),
  company_industry: z.string().optional().describe("Industry of the company"),
  company_size: z.string().optional().describe("Size range of the company (e.g. 1-10, 11-50)"),
  company_type: z.string().optional().describe("Type of company (e.g. public, private, non-profit)"),
  website: z.string().optional().describe("Company website URL"),
  country_code: z.string().optional().describe("Two-letter country code (e.g. US, FR)"),
  linkedin_url: z.string().optional().describe("LinkedIn profile URL"),
  phone_number: z.string().optional().describe("Phone number"),
  twitter: z.string().optional().describe("Twitter/X handle"),
  notes: z.string().optional().describe("Notes about the lead"),
  source: z.string().optional().describe("Source of the lead"),
  leads_list_id: z.number().int().positive().optional().describe("ID of the leads list to add the lead to"),
  custom_attributes: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      desc`Custom attribute values, keyed by slug (not by label). Get each slug from ${TOOL_NAMES.listCustomAttributes}. The attribute must already exist: create it with ${TOOL_NAMES.createCustomAttribute} first. An unknown slug fails the call.`,
    ),
}

// Hunter lead shape — covers fields the model and the UI both reason about.
// `.loose()` on the leaf because (a) `_lead.jbuilder` emits user-defined
// custom-attribute values as FLAT sibling keys via `json.set! slug, value`
// (so they must flow through unenumerated), and (b) the jbuilder may add
// fields over time. `leads_list` fields are all nullable because the
// jbuilder unconditionally emits the block via safe-nav for orphan leads
// (lead with zero leads_list_memberships) — see HUN-19943 review.
const leadSchema = z
  .object({
    id: z.number().int().positive(),
    // `shareable(:email).presence`: null for a lead without an address and for a
    // claimed one (HUN-23599, HUN-24022).
    email: nullableString(),
    first_name: nullableString().optional(),
    last_name: nullableString().optional(),
    position: nullableString().optional(),
    company: nullableString().optional(),
    company_industry: nullableString().optional(),
    company_size: nullableString().optional(),
    company_type: nullableString().optional(),
    website: nullableString().optional(),
    country_code: nullableString().optional(),
    linkedin_url: nullableString().optional(),
    phone_number: nullableString().optional(),
    twitter: nullableString().optional(),
    notes: nullableString().optional(),
    source: nullableString().optional(),
    leads_list: z
      .object({
        id: nullableNumber().optional(),
        name: nullableString().optional(),
        leads_count: nullableNumber().optional(),
      })
      .optional(),
    verification: verificationSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .loose()

// List response from /v2/leads — { data: { leads: [...] }, meta: { count, total } }
const listLeadsDataSchema = z.object({ leads: z.array(leadSchema) }).loose()

const listLeadsOutputSchema = buildResponseSchema(listLeadsDataSchema, paginationMetaSchema)
const singleLeadOutputSchema = buildResponseSchema(leadSchema)
// Create-Lead-If-Missing extends the standard lead leaf with `alreadyExisted`
// so callers can distinguish the create vs. no-op branches without parsing
// the message text. The flag is omitted in the create path.
const createLeadIfMissingOutputSchema = buildResponseSchema(
  leadSchema.extend({ alreadyExisted: z.boolean().optional() }),
)
// Lead-Exists envelope: the controller emits `{ id, leads_list_id,
// leads_list_name }` (all nullable when no lead matches). There is no `exists`
// field — callers should derive existence from `data.id != null`. See
// app/controllers/api/leads/exist_controller.rb#show.
const leadExistsOutputSchema = buildResponseSchema(
  z
    .object({
      id: nullableNumber().optional(),
      leads_list_id: nullableNumber().optional(),
      leads_list_name: nullableString().optional(),
    })
    .loose(),
)

type LeadParams = Record<string, string | Record<string, string>>

function buildLeadParams({
  custom_attributes,
  ...fields
}: Record<string, unknown> & { custom_attributes?: Record<string, string> }): LeadParams {
  const params: LeadParams = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      params[key] = String(value)
    }
  }
  // Form-encoded as `custom_attributes[slug]=value`, the hash Rails permits.
  if (custom_attributes !== undefined) params.custom_attributes = custom_attributes
  return params
}

/**
 * Lead-Exists answer in the same `{ data: { id, leads_list_id, leads_list_name } }`
 * shape that /leads/exist returns, built from /leads/bulk/exist and the lead
 * record (HUN-24702).
 */
async function findExistingLead(email: string, apiKey: string, baseUrl: string): Promise<McpTextResult> {
  // /leads/bulk/exist, not /leads/exist: on a team with automatic lead saving,
  // /leads/exist hides a lead that is in no list, and the Email Verifier
  // auto-saves exactly such a lead (HUN-24240).
  const existsResult = await callHunterApi({
    path: "/leads/bulk/exist",
    apiKey,
    baseUrl,
    params: { "emails[]": email },
  })
  if (existsResult.isError) return existsResult

  const id = parseHunterApiData<Array<{ id?: number | null }>>(existsResult)?.[0]?.id
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    return leadExistsResult(existsResult, { id: null, leads_list_id: null, leads_list_name: null })
  }

  // The lead record (free GET) says which list it is in.
  const leadResult = await callHunterApi({ path: `/leads/${id}`, apiKey, baseUrl })
  if (leadResult.isError) return leadResult
  const list = parseHunterApiData<{ leads_list?: { id?: number | null; name?: string | null } | null }>(
    leadResult,
  )?.leads_list
  return leadExistsResult(leadResult, {
    id,
    leads_list_id: list?.id ?? null,
    leads_list_name: list?.name ?? null,
  })
}

function leadExistsResult(
  result: McpTextResult,
  data: { id: number | null; leads_list_id: number | null; leads_list_name: string | null },
): McpTextResult {
  const structuredContent = { data }
  return {
    ...result,
    content: [
      {
        type: "text" as const,
        text: `${JSON.stringify(structuredContent)}${HUNTER_SOURCE_SUFFIX}`,
        annotations: { audience: ["user"] },
      },
    ],
    structuredContent,
  }
}

/**
 * For Create-Lead-If-Missing's already-existed branch: stamps
 * `structuredContent.data.alreadyExisted = true` so the model can distinguish
 * the no-op path from the create path without parsing message text, and
 * prepends a clear user-visible "already exists" line to the first content
 * block. Leaves error results untouched.
 */
function injectAlreadyExisted(result: McpTextResult, userMessage: string): McpTextResult {
  if (result.isError) return result
  const data = (result.structuredContent as { data?: Record<string, unknown> } | undefined)?.data ?? {}
  const firstBlock = result.content[0]
  const newContent =
    firstBlock !== undefined
      ? [{ ...firstBlock, text: `${userMessage}\n\n${firstBlock.text}` }, ...result.content.slice(1)]
      : result.content
  return {
    ...result,
    content: newContent,
    structuredContent: {
      ...result.structuredContent,
      data: { ...data, alreadyExisted: true },
    },
  }
}

export function registerLeadTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listLeads,
    {
      description:
        "Use this when the user wants to list leads from their Hunter account, with optional filters on email, name, company, or list. Returns up to 100 leads per page; use `offset` to paginate. Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of leads to skip"),
        limit: z.number().int().positive().max(100).optional().describe("Maximum number of leads to return (max 100)"),
        leads_list_id: z.number().int().positive().optional().describe("Filter leads by list ID"),
        email: z.string().optional().describe("Filter leads by email address"),
        first_name: z.string().optional().describe("Filter leads by first name"),
        last_name: z.string().optional().describe("Filter leads by last name"),
        company: z.string().optional().describe("Filter leads by company name"),
      },
      outputSchema: listLeadsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit, leads_list_id, email, first_name, last_name, company }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      if (leads_list_id !== undefined) params.leads_list_id = String(leads_list_id)
      if (email) params.email = email
      if (first_name) params.first_name = first_name
      if (last_name) params.last_name = last_name
      if (company) params.company = company
      return callHunterApi({ path: "/leads", apiKey, baseUrl, params })
    },
  )

  server.registerTool(
    TOOL_NAMES.getLead,
    {
      description:
        "Use this when the user wants to retrieve a single lead from their Hunter account by ID. Free to call.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the lead to retrieve"),
      },
      outputSchema: singleLeadOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads/${id}`, apiKey, baseUrl })
    },
  )

  server.registerTool(
    TOOL_NAMES.createLead,
    {
      description: desc`Use this when the user wants to create a new lead in their Hunter account. Email is required; other fields are optional. Pass \`leads_list_id\` to add the lead directly to a list. Free to call. If a lead with this email already exists, the call succeeds and returns that lead, but does not apply the supplied values, including \`custom_attributes\`. It only adds the lead to \`leads_list_id\` when you pass one. To change the values of an existing lead, use ${TOOL_NAMES.updateLead} or ${TOOL_NAMES.upsertLead}.`,
      inputSchema: {
        ...leadFieldsSchema,
        email: z.string().email().max(254).describe("Email address of the lead (required)"),
      },
      outputSchema: singleLeadOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async (fields) => {
      const result = await callHunterApi({
        path: "/leads",
        apiKey,
        baseUrl,
        method: "POST",
        params: buildLeadParams(fields),
      })
      return withDeepLinkFromId(result, (id) => `/leads/${id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.updateLead,
    {
      description:
        "Use this when the user wants to update fields on an existing lead identified by ID. Free to call. Updating a lead overwrites the supplied fields in place. In `custom_attributes`, a slug that you leave out keeps its value, and an empty string clears the value.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the lead to update"),
        ...leadFieldsSchema,
      },
      outputSchema: singleLeadOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id, ...fields }) => {
      const result = await callHunterApi({
        path: `/leads/${id}`,
        apiKey,
        baseUrl,
        method: "PUT",
        params: buildLeadParams(fields),
      })
      return withDeepLink(result, `/leads/${id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.deleteLead,
    {
      description:
        "Use this when the user wants to remove a lead from their Hunter account, identified by ID. Free to call. Deleting a lead cannot be undone from the API.",
      inputSchema: {
        id: z.number().int().positive().describe("ID of the lead to delete"),
      },
      // Hunter returns 204 No Content — callHunterApi synthesises mutationAckSchema.
      outputSchema: mutationAckSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ id }) => {
      return callHunterApi({ path: `/leads/${id}`, apiKey, baseUrl, method: "DELETE" })
    },
  )

  server.registerTool(
    TOOL_NAMES.upsertLead,
    {
      description: desc`Use this when the user explicitly wants to create a lead or overwrite an existing lead's fields by email. If a lead with the email exists, its fields are overwritten with the supplied values; otherwise a new lead is created. On an existing lead, \`custom_attributes\` merges into the current values: a slug that you leave out keeps its value, and an empty string clears the value. Free to call. Overwriting an existing lead's fields cannot be undone from the API. For save-without-overwrite semantics, use ${TOOL_NAMES.createLeadIfMissing} instead.`,
      inputSchema: {
        ...leadFieldsSchema,
        email: z.string().email().max(254).describe("Email address of the lead (used to match existing leads)"),
      },
      outputSchema: singleLeadOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async (fields) => {
      const result = await callHunterApi({
        path: "/leads",
        apiKey,
        baseUrl,
        method: "PUT",
        params: buildLeadParams(fields),
      })
      const linked = withDeepLinkFromId(result, (id) => `/leads/${id}`)
      return embedNextAction(linked, buildNextAction({ kind: "complete", summary: "Lead saved to Hunter." }))
    },
  )

  server.registerTool(
    TOOL_NAMES.createLeadIfMissing,
    {
      description: desc`Use this when the user wants to save a verified contact as a new lead without modifying any existing lead. If a lead with the email already exists, returns it with \`alreadyExisted: true\` and never applies the supplied values to it; otherwise creates the lead with the supplied fields. Custom attribute values apply only when this tool creates the lead. An existing lead in no list (for example, one the team's automatic lead saving stored when ${TOOL_NAMES.emailVerifier} ran) is added to \`leads_list_id\` when you pass one, and Hunter can then refresh its fields from Hunter's own data, as for any lead saved in Hunter. A lead already in a list is never moved, added to another list, or changed. Use ${TOOL_NAMES.upsertLead} instead when the user explicitly wants to overwrite an existing lead. Free (no credits).`,
      inputSchema: {
        ...leadFieldsSchema,
        email: z.string().email().max(254).describe("Email address of the contact to save"),
      },
      outputSchema: createLeadIfMissingOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
    },
    async ({ email, ...fields }) => {
      // Pre-flight: does the lead already exist?
      // We use a free GET BEFORE POST /leads because
      // Hunter's create controller (app/controllers/api/leads/create_controller.rb)
      // reportedly enriches before validation, so a naive POST + catch-422 would
      // burn an enrichment credit on every duplicate. Two cheap GETs beat one
      // POST with hidden cost.
      //
      // /leads/bulk/exist, not /leads/exist: on a team with automatic lead saving,
      // /leads/exist hides a lead that is in no list, and the Email Verifier
      // auto-saves exactly such a lead right before this tool runs (HUN-24240).
      const existsResult = await callHunterApi({
        path: "/leads/bulk/exist",
        apiKey,
        baseUrl,
        params: { "emails[]": email },
      })
      if (existsResult.isError) return existsResult

      const existing = parseHunterApiData<Array<{ id?: number | null }>>(existsResult)?.[0]
      let leadResult: McpTextResult

      // Defense-in-depth: `parseHunterApiData` is a runtime-unchecked cast, so
      // the id could in theory be a string, NaN, or negative integer if the
      // upstream response shape changed. Guard with `Number.isSafeInteger > 0`
      // before interpolating into a path, mirroring withDeepLinkFromId.
      const existingId = existing?.id
      if (typeof existingId === "number" && Number.isSafeInteger(existingId) && existingId > 0) {
        // Already exists: fetch the full record (free GET), which also tells whether it is in a list.
        const getResult = await callHunterApi({ path: `/leads/${existingId}`, apiKey, baseUrl })
        if (getResult.isError) return getResult
        const inNoList =
          parseHunterApiData<{ leads_list?: { id?: number | null } | null }>(getResult)?.leads_list?.id == null
        if (inNoList && fields.leads_list_id !== undefined) {
          // POST /leads on an existing email adds the missing list membership and
          // applies none of the posted fields (HUN-22831), so send only the list.
          // It can still enrich the lead from Hunter's data (HUN-23085): the
          // description says so.
          const added = await callHunterApi({
            path: "/leads",
            apiKey,
            baseUrl,
            method: "POST",
            params: buildLeadParams({ email, leads_list_id: fields.leads_list_id }),
          })
          if (added.isError) return added
          leadResult = injectAlreadyExisted(
            withDeepLink(added, `/leads/${existingId}`),
            `Lead already existed in no list; added it to list ${fields.leads_list_id}. The supplied values were not applied.`,
          )
        } else {
          leadResult = injectAlreadyExisted(
            withDeepLink(getResult, `/leads/${existingId}`),
            "Lead already exists; no changes made.",
          )
        }
      } else {
        // Doesn't exist: POST to create.
        const created = await callHunterApi({
          path: "/leads",
          apiKey,
          baseUrl,
          method: "POST",
          params: buildLeadParams({ email, ...fields }),
        })
        if (created.isError) return created
        leadResult = withDeepLinkFromId(created, (id) => `/leads/${id}`)
      }

      return embedNextAction(
        leadResult,
        buildNextAction({ kind: "complete", summary: "Lead saved or already existed." }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.leadExists,
    {
      description:
        "Use this when the user wants to check whether a lead with a given email already exists in their Hunter account. Returns the lead ID and list info if present. Free to call.",
      inputSchema: {
        email: z.string().email().max(254).describe("Email address to check"),
      },
      outputSchema: leadExistsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ email }) => {
      return findExistingLead(email, apiKey, baseUrl)
    },
  )
}
