import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  buildNextAction,
  callHunterApi,
  embedNextAction,
  type McpTextResult,
  parseHunterApiResponse,
  PRIVATE_DESTRUCTIVE_ANNOTATIONS,
  TOOL_NAMES,
  withDeepLink,
} from "../helpers"
import { buildResponseSchema } from "../schemas/common"

// Bulk operations on leads and companies (HUN-20852 / HUN-20853). Every tool
// here is a confirmable destructive write: the first call (without
// `confirmed`) NEVER hits the Rails bulk endpoint — it returns an ask_user
// nextAction stating the affected count (fetched cheaply when only a list id
// is given), and only the re-issued call with `confirmed: true` executes.

interface LeadsIndexResponse {
  meta?: {
    total?: number
    count?: number
  }
}

interface CompanyListShowResponse {
  data?: {
    companies_count?: number
  }
}

// Hard cap on explicit id selections. The confirmation gate echoes the ids
// back inside pendingToolCall, and embedNextAction downgrades any payload over
// its 2048-byte cap to a generic ask_user WITHOUT pendingToolCall — silently
// breaking the confirm-and-re-issue loop. 100 ids stay comfortably under the
// cap; larger selections should be batched or expressed via the source-list id.
const MAX_BULK_IDS = 100

// 1500ms cap — the count fetch lives on the confirmation critical path.
// Mirrors fetchRecipientCount in src/tools/sequences.ts: if the count can't be
// fetched in time we fall back to naming the list instead of blocking the gate.
const COUNT_PREVIEW_TIMEOUT_MS = 1500

// Cheap count preview for a leads selection scoped to a static list:
// GET /leads?leads_list_id=X&limit=1 and read `meta.count` — the FILTERED
// total matching the query. app/app/views/api/leads/index.jbuilder emits
// `json.meta { json.count @count; json.total @total }` where `@count` is the
// number of leads matching the filters and `@total` is the UNFILTERED
// team-wide editable-leads count (Current.user.total_editable_leads), so
// `meta.total` must NOT be used here.
async function fetchLeadsListCount(leads_list_id: number, apiKey: string, baseUrl: string): Promise<number | null> {
  try {
    const result = await callHunterApi({
      path: "/leads",
      apiKey,
      baseUrl,
      params: { leads_list_id: String(leads_list_id), limit: "1" },
      signal: AbortSignal.timeout(COUNT_PREVIEW_TIMEOUT_MS),
    })
    if (result.isError) return null
    const response = parseHunterApiResponse<LeadsIndexResponse>(result)
    return response?.meta?.count ?? null
  } catch {
    return null
  }
}

// Cheap count preview for a company list: GET /company-lists/:id and read
// `data.companies_count` (app/app/views/api/company_lists/show.jbuilder emits
// `json.companies_count @company_list.companies_count` alongside the
// _company_list partial).
async function fetchCompanyListCount(company_list_id: number, apiKey: string, baseUrl: string): Promise<number | null> {
  try {
    const result = await callHunterApi({
      path: `/company-lists/${company_list_id}`,
      apiKey,
      baseUrl,
      signal: AbortSignal.timeout(COUNT_PREVIEW_TIMEOUT_MS),
    })
    if (result.isError) return null
    const response = parseHunterApiResponse<CompanyListShowResponse>(result)
    return response?.data?.companies_count ?? null
  } catch {
    return null
  }
}

// Local pre-flight validation failure (missing selection, identical source and
// target lists). Shaped exactly like callHunterApi's 4xx envelope so the
// published output schema (buildResponseSchema declares `error`) validates.
function invalidInput(message: string, field: string): McpTextResult {
  return {
    content: [{ type: "text" as const, text: message, annotations: { audience: ["user"] } }],
    structuredContent: {
      error: { code: "invalid_input" as const, retryable: false, field, message },
    },
    isError: true,
  }
}

// Rails treats an empty array param as blank (`params[:lead_ids].present?` is
// false), which would silently widen the selection to the WHOLE list. Mirror
// that semantics locally so an empty ids array never masquerades as a narrow
// selection in the confirmation count.
function presentIds(ids: number[] | undefined): number[] | undefined {
  return ids && ids.length > 0 ? ids : undefined
}

function awaitingConfirmationStub(text: string, data: Record<string, unknown>): McpTextResult {
  return {
    content: [{ type: "text" as const, text, annotations: { audience: ["user"] } }],
    structuredContent: { data: { ...data, status: "awaiting_confirmation" } },
  }
}

// The bulk jbuilders all echo the raw request params back under `meta.params`
// (e.g. app/app/views/api/leads/bulk/move/create.jbuilder). Values arrive as
// the form-encoded strings/arrays we sent (or null when a param was absent),
// so type them as an open bag rather than over-claiming.
const paramsEchoMetaSchema = z
  .object({
    params: z.record(z.string(), z.unknown()).optional(),
  })
  .loose()

// Bulk-Move-Leads success shape from app/app/views/api/leads/bulk/move/create.jbuilder
// (rendered with HTTP 202): `data: { source_leads_list_id, target_leads_list_id,
// leads_count, status: "queued" }`. The fields are optional (except `status`)
// because the same leaf also validates the awaiting_confirmation stub, which
// omits the count when the preview fetch fails.
const bulkMoveLeadsDataSchema = z.object({
  source_leads_list_id: z.number().int().positive().optional(),
  target_leads_list_id: z.number().int().positive().optional(),
  leads_count: z.number().int().nonnegative().optional(),
  status: z.string(),
})

const bulkMoveLeadsOutputSchema = buildResponseSchema(bulkMoveLeadsDataSchema, paramsEchoMetaSchema)

// Bulk-Delete-Leads shape from app/app/views/api/leads/bulk/delete/create.jbuilder:
// sync path (≤10 matches, HTTP 200) emits `{ requested_count, deleted_count,
// status: "completed" }`; async path (HTTP 202) emits `{ requested_count,
// status: "queued" }` (no deleted_count).
const bulkDeleteLeadsDataSchema = z.object({
  requested_count: z.number().int().nonnegative().optional(),
  deleted_count: z.number().int().nonnegative().optional(),
  status: z.string(),
})

const bulkDeleteLeadsOutputSchema = buildResponseSchema(bulkDeleteLeadsDataSchema, paramsEchoMetaSchema)

// Bulk-Move-Companies success shape from
// app/app/views/api/companies/bulk/move/create.jbuilder (HTTP 202):
// `data: { source_company_list_id, target_company_list_id, companies_count,
// status: "queued" }`.
const bulkMoveCompaniesDataSchema = z.object({
  source_company_list_id: z.number().int().positive().optional(),
  target_company_list_id: z.number().int().positive().optional(),
  companies_count: z.number().int().nonnegative().optional(),
  status: z.string(),
})

const bulkMoveCompaniesOutputSchema = buildResponseSchema(bulkMoveCompaniesDataSchema, paramsEchoMetaSchema)

// Bulk-Copy-Companies success shape from
// app/app/views/api/companies/bulk/copy/create.jbuilder (HTTP 202):
// `data: { target_company_list_id, companies_count, status: "queued" }` —
// no source id in the payload (the source selection is untouched).
const bulkCopyCompaniesDataSchema = z.object({
  target_company_list_id: z.number().int().positive().optional(),
  companies_count: z.number().int().nonnegative().optional(),
  status: z.string(),
})

const bulkCopyCompaniesOutputSchema = buildResponseSchema(bulkCopyCompaniesDataSchema, paramsEchoMetaSchema)

// Bulk-Delete-Companies shape from
// app/app/views/api/companies/bulk/delete/create.jbuilder: sync path (≤10
// matches, HTTP 200) emits `{ requested_count, deleted_count, status:
// "completed" }`; async path (HTTP 202) emits `{ requested_count, status:
// "queued" }`.
const bulkDeleteCompaniesDataSchema = z.object({
  requested_count: z.number().int().nonnegative().optional(),
  deleted_count: z.number().int().nonnegative().optional(),
  status: z.string(),
})

const bulkDeleteCompaniesOutputSchema = buildResponseSchema(bulkDeleteCompaniesDataSchema, paramsEchoMetaSchema)

export function registerBulkOperationTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.bulkMoveLeads,
    {
      description:
        "Use this when the user wants to move many leads at once from one static leads list to another. Both lists must be static (not dynamic) and different; `lead_ids` optionally narrows the move to specific leads inside the source list, otherwise every lead in the source list is moved. The move runs asynchronously — the response reports the matched `leads_count` with status `queued`, and the leads appear in the destination list shortly after. Returns a not-found error if either list does not exist in the team and an invalid_input error if a list is dynamic or no leads match the selection. Moving leads requires an explicit user confirmation: the first call returns a confirmation prompt stating the affected count without moving anything, and only re-issuing with `confirmed: true` performs the move. Free to call.",
      inputSchema: {
        leads_list_id: z.number().int().positive().describe("ID of the static source leads list to move leads out of"),
        target_leads_list_id: z
          .number()
          .int()
          .positive()
          .describe("ID of the static destination leads list to move leads into (must differ from leads_list_id)"),
        lead_ids: z
          .array(z.number().int().positive())
          .max(MAX_BULK_IDS)
          .optional()
          .describe(
            "Optional lead IDs to narrow the move to specific leads inside the source list; when omitted, every lead in the source list is moved. Maximum 100 IDs per call — batch larger selections into multiple calls, or omit lead_ids to move the whole source list",
          ),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat that the leads should be moved. The first invocation (without confirmed) returns an ask_user nextAction stating the affected count; the second invocation (with confirmed: true) actually performs the move.",
          ),
      },
      outputSchema: bulkMoveLeadsOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ leads_list_id, target_leads_list_id, lead_ids, confirmed }) => {
      if (leads_list_id === target_leads_list_id) {
        return invalidInput("The leads_list_id and target_leads_list_id must be different.", "target_leads_list_id")
      }
      const ids = presentIds(lead_ids)

      if (!confirmed) {
        // Hard gate: no POST to /leads/bulk/move until re-issued confirmed.
        const count = ids ? ids.length : await fetchLeadsListCount(leads_list_id, apiKey, baseUrl)
        // Both count sources are upper bounds ("up to N"): an id-derived count
        // because Rails moves the INTERSECTION of lead_ids and the source list;
        // a list-derived count (fetchLeadsListCount) because the async
        // Leads::MoveSelectionJob applies per-record authorization, so a regular
        // team member only moves the leads they own — a subset of the team-wide
        // list count returned here.
        const countPhrase =
          count !== null ? `up to ${count} lead${count === 1 ? "" : "s"}` : `all leads in leads list ${leads_list_id}`
        const stub = awaitingConfirmationStub(
          `Awaiting user confirmation to move ${countPhrase} from leads list ${leads_list_id} to leads list ${target_leads_list_id}.`,
          {
            source_leads_list_id: leads_list_id,
            target_leads_list_id,
            ...(count !== null && { leads_count: count }),
          },
        )
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `Confirm: move ${countPhrase} from leads list ${leads_list_id} to leads list ${target_leads_list_id}? Re-issue with confirmed: true only after the user explicitly confirms.`,
            pendingToolCall: {
              tool: TOOL_NAMES.bulkMoveLeads,
              args: {
                leads_list_id,
                target_leads_list_id,
                ...(ids && { lead_ids: ids }),
                confirmed: true,
              },
            },
          }),
        )
      }

      const params: Record<string, string | string[]> = {
        leads_list_id: String(leads_list_id),
        target_leads_list_id: String(target_leads_list_id),
      }
      if (ids) params.lead_ids = ids.map(String)
      const result = await callHunterApi({ path: "/leads/bulk/move", apiKey, baseUrl, method: "POST", params })
      return withDeepLink(result, `/leads?leads_list_id=${target_leads_list_id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.bulkDeleteLeads,
    {
      description:
        "Use this when the user wants to delete many leads at once, selected by explicit `lead_ids` and/or by a whole `leads_list_id`. Deleting leads is permanent and cannot be undone. Selections of 10 or fewer leads are deleted synchronously and the response reports the exact `deleted_count` with status `completed`; larger selections are queued for asynchronous deletion (status `queued` with the matched `requested_count`). Returns a not-found error if the leads list does not exist in the team and an invalid_input error when no leads match the selection. Deleting leads requires an explicit user confirmation: the first call returns a confirmation prompt stating the affected count without deleting anything, and only re-issuing with `confirmed: true` performs the deletion. Free to call.",
      inputSchema: {
        lead_ids: z
          .array(z.number().int().positive())
          .max(MAX_BULK_IDS)
          .optional()
          .describe(
            "Lead IDs to delete. Provide lead_ids and/or leads_list_id (at least one is required). Maximum 100 IDs per call — batch larger selections into multiple calls, or select via leads_list_id instead",
          ),
        leads_list_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "ID of a leads list whose leads should be deleted; combined with lead_ids it narrows the selection to those leads inside the list",
          ),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat, including the count of leads to be permanently deleted. The first invocation (without confirmed) returns an ask_user nextAction stating the affected count; the second invocation (with confirmed: true) actually deletes.",
          ),
      },
      outputSchema: bulkDeleteLeadsOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ lead_ids, leads_list_id, confirmed }) => {
      const ids = presentIds(lead_ids)
      if (!ids && leads_list_id === undefined) {
        return invalidInput("Provide lead_ids and/or leads_list_id to select the leads to delete.", "lead_ids")
      }

      if (!confirmed) {
        // Hard gate: no POST to /leads/bulk/delete until re-issued confirmed.
        const count =
          ids !== undefined ? ids.length : await fetchLeadsListCount(leads_list_id as number, apiKey, baseUrl)
        // Both count sources are upper bounds ("up to N"): an id-derived count
        // because Rails deletes the INTERSECTION of lead_ids and the team's
        // leads (and the list when both are given); a list-derived count
        // (fetchLeadsListCount) because Leads::DeleteSelectionJob applies
        // per-record authorization (LeadPolicy#destroy?), so a regular team
        // member only deletes the leads they own — a subset of the team-wide
        // list count returned here.
        const countPhrase =
          count !== null ? `up to ${count} lead${count === 1 ? "" : "s"}` : `ALL leads in leads list ${leads_list_id}`
        const stub = awaitingConfirmationStub(
          `Awaiting user confirmation to permanently delete ${countPhrase}.`,
          count !== null ? { requested_count: count } : {},
        )
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `This permanently deletes ${countPhrase} and cannot be undone. Ask the user to explicitly confirm the count before re-issuing with confirmed: true.`,
            pendingToolCall: {
              tool: TOOL_NAMES.bulkDeleteLeads,
              args: {
                ...(ids && { lead_ids: ids }),
                ...(leads_list_id !== undefined && { leads_list_id }),
                confirmed: true,
              },
            },
          }),
        )
      }

      const params: Record<string, string | string[]> = {}
      if (ids) params.lead_ids = ids.map(String)
      if (leads_list_id !== undefined) params.leads_list_id = String(leads_list_id)
      const result = await callHunterApi({ path: "/leads/bulk/delete", apiKey, baseUrl, method: "POST", params })
      return withDeepLink(result, "/leads")
    },
  )

  server.registerTool(
    TOOL_NAMES.bulkMoveCompanies,
    {
      description:
        "Use this when the user wants to move many companies at once from one static company list to another. Both lists must be static (not dynamic) and different; `company_ids` optionally narrows the move to specific companies inside the source list, otherwise every company in the source list is moved. The move runs asynchronously — the response reports the matched `companies_count` with status `queued`. Both lists are modified, so a regular team member must own them (otherwise a forbidden error). Returns a not-found error if either list does not exist in the team and an invalid_input error if a list is dynamic or no companies match the selection. Moving companies requires an explicit user confirmation: the first call returns a confirmation prompt stating the affected count without moving anything, and only re-issuing with `confirmed: true` performs the move. Free to call.",
      inputSchema: {
        company_list_id: z
          .number()
          .int()
          .positive()
          .describe("ID of the static source company list to move companies out of"),
        target_company_list_id: z
          .number()
          .int()
          .positive()
          .describe(
            "ID of the static destination company list to move companies into (must differ from company_list_id)",
          ),
        company_ids: z
          .array(z.number().int().positive())
          .max(MAX_BULK_IDS)
          .optional()
          .describe(
            "Optional company IDs to narrow the move to specific companies inside the source list; when omitted, every company in the source list is moved. Maximum 100 IDs per call — batch larger selections into multiple calls, or omit company_ids to move the whole source list",
          ),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat that the companies should be moved. The first invocation (without confirmed) returns an ask_user nextAction stating the affected count; the second invocation (with confirmed: true) actually performs the move.",
          ),
      },
      outputSchema: bulkMoveCompaniesOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ company_list_id, target_company_list_id, company_ids, confirmed }) => {
      if (company_list_id === target_company_list_id) {
        return invalidInput(
          "The company_list_id and target_company_list_id must be different.",
          "target_company_list_id",
        )
      }
      const ids = presentIds(company_ids)

      if (!confirmed) {
        // Hard gate: no POST to /companies/bulk/move until re-issued confirmed.
        const count = ids ? ids.length : await fetchCompanyListCount(company_list_id, apiKey, baseUrl)
        // Both count sources are upper bounds ("up to N"): an id-derived count
        // because Rails moves the INTERSECTION of company_ids and the source
        // list; a list-derived count (fetchCompanyListCount) because the bulk
        // controller runs member_scoped, so a regular team member only moves the
        // companies they own — a subset of the team-wide list count returned here.
        const countPhrase =
          count !== null
            ? `up to ${count} compan${count === 1 ? "y" : "ies"}`
            : `all companies in company list ${company_list_id}`
        const stub = awaitingConfirmationStub(
          `Awaiting user confirmation to move ${countPhrase} from company list ${company_list_id} to company list ${target_company_list_id}.`,
          {
            source_company_list_id: company_list_id,
            target_company_list_id,
            ...(count !== null && { companies_count: count }),
          },
        )
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `Confirm: move ${countPhrase} from company list ${company_list_id} to company list ${target_company_list_id}? Re-issue with confirmed: true only after the user explicitly confirms.`,
            pendingToolCall: {
              tool: TOOL_NAMES.bulkMoveCompanies,
              args: {
                company_list_id,
                target_company_list_id,
                ...(ids && { company_ids: ids }),
                confirmed: true,
              },
            },
          }),
        )
      }

      const params: Record<string, string | string[]> = {
        company_list_id: String(company_list_id),
        target_company_list_id: String(target_company_list_id),
      }
      if (ids) params.company_ids = ids.map(String)
      const result = await callHunterApi({ path: "/companies/bulk/move", apiKey, baseUrl, method: "POST", params })
      return withDeepLink(result, `/lead/companies?company_list_id=${target_company_list_id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.bulkCopyCompanies,
    {
      description:
        "Use this when the user wants to copy many companies at once into a static company list, leaving the source selection untouched. Select the companies by explicit `company_ids` and/or by a source `company_list_id` (at least one is required); `target_company_list_id` is the static destination list. The copy runs asynchronously — the response reports the matched `companies_count` with status `queued`. The destination is modified, so a regular team member must own it (otherwise a forbidden error). Returns a not-found error if a list does not exist in the team and an invalid_input error if the destination is dynamic or no companies match the selection. Copying requires an explicit user confirmation: the first call returns a confirmation prompt stating the affected count without copying anything, and only re-issuing with `confirmed: true` performs the copy. Free to call.",
      inputSchema: {
        target_company_list_id: z
          .number()
          .int()
          .positive()
          .describe("ID of the static destination company list to copy companies into"),
        company_list_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "ID of a source company list whose companies should be copied (must differ from target_company_list_id). Provide company_ids and/or company_list_id",
          ),
        company_ids: z
          .array(z.number().int().positive())
          .max(MAX_BULK_IDS)
          .optional()
          .describe(
            "Company IDs to copy. Provide company_ids and/or company_list_id (at least one is required). Maximum 100 IDs per call — batch larger selections into multiple calls, or select via company_list_id instead",
          ),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat that the companies should be copied. The first invocation (without confirmed) returns an ask_user nextAction stating the affected count; the second invocation (with confirmed: true) actually performs the copy.",
          ),
      },
      outputSchema: bulkCopyCompaniesOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ target_company_list_id, company_list_id, company_ids, confirmed }) => {
      const ids = presentIds(company_ids)
      if (!ids && company_list_id === undefined) {
        return invalidInput(
          "Provide company_ids and/or company_list_id to select the companies to copy.",
          "company_ids",
        )
      }
      if (company_list_id === target_company_list_id) {
        return invalidInput(
          "The company_list_id and target_company_list_id must be different.",
          "target_company_list_id",
        )
      }

      if (!confirmed) {
        // Hard gate: no POST to /companies/bulk/copy until re-issued confirmed.
        const count =
          ids !== undefined ? ids.length : await fetchCompanyListCount(company_list_id as number, apiKey, baseUrl)
        // Both count sources are upper bounds ("up to N"): an id-derived count
        // because Rails copies the INTERSECTION of company_ids and the source
        // list; a list-derived count (fetchCompanyListCount) because the bulk
        // controller runs member_scoped, so a regular team member only copies the
        // companies they own — a subset of the team-wide list count returned here.
        const countPhrase =
          count !== null
            ? `up to ${count} compan${count === 1 ? "y" : "ies"}`
            : `all companies in company list ${company_list_id}`
        const stub = awaitingConfirmationStub(
          `Awaiting user confirmation to copy ${countPhrase} into company list ${target_company_list_id}.`,
          {
            target_company_list_id,
            ...(count !== null && { companies_count: count }),
          },
        )
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `Confirm: copy ${countPhrase} into company list ${target_company_list_id}? The source selection is left untouched. Re-issue with confirmed: true only after the user explicitly confirms.`,
            pendingToolCall: {
              tool: TOOL_NAMES.bulkCopyCompanies,
              args: {
                target_company_list_id,
                ...(company_list_id !== undefined && { company_list_id }),
                ...(ids && { company_ids: ids }),
                confirmed: true,
              },
            },
          }),
        )
      }

      const params: Record<string, string | string[]> = {
        target_company_list_id: String(target_company_list_id),
      }
      if (company_list_id !== undefined) params.company_list_id = String(company_list_id)
      if (ids) params.company_ids = ids.map(String)
      const result = await callHunterApi({ path: "/companies/bulk/copy", apiKey, baseUrl, method: "POST", params })
      return withDeepLink(result, `/lead/companies?company_list_id=${target_company_list_id}`)
    },
  )

  server.registerTool(
    TOOL_NAMES.bulkDeleteCompanies,
    {
      description:
        "Use this when the user wants to delete many companies at once, selected by explicit `company_ids` and/or by a whole `company_list_id`. Deleting companies is permanent and cannot be undone; a regular team member only deletes their own companies. Selections of 10 or fewer companies are deleted synchronously and the response reports the exact `deleted_count` with status `completed`; larger selections are queued for asynchronous deletion (status `queued` with the matched `requested_count`). Returns a not-found error if the company list does not exist in the team and an invalid_input error when no companies match the selection. Deleting companies requires an explicit user confirmation: the first call returns a confirmation prompt stating the affected count without deleting anything, and only re-issuing with `confirmed: true` performs the deletion. Free to call.",
      inputSchema: {
        company_ids: z
          .array(z.number().int().positive())
          .max(MAX_BULK_IDS)
          .optional()
          .describe(
            "Company IDs to delete. Provide company_ids and/or company_list_id (at least one is required). Maximum 100 IDs per call — batch larger selections into multiple calls, or select via company_list_id instead",
          ),
        company_list_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "ID of a company list whose companies should be deleted; combined with company_ids it narrows the selection to those companies inside the list",
          ),
        confirmed: z
          .boolean()
          .default(false)
          .describe(
            "Set to true ONLY after the user has explicitly confirmed in chat, including the count of companies to be permanently deleted. The first invocation (without confirmed) returns an ask_user nextAction stating the affected count; the second invocation (with confirmed: true) actually deletes.",
          ),
      },
      outputSchema: bulkDeleteCompaniesOutputSchema.shape,
      annotations: PRIVATE_DESTRUCTIVE_ANNOTATIONS,
    },
    async ({ company_ids, company_list_id, confirmed }) => {
      const ids = presentIds(company_ids)
      if (!ids && company_list_id === undefined) {
        return invalidInput(
          "Provide company_ids and/or company_list_id to select the companies to delete.",
          "company_ids",
        )
      }

      if (!confirmed) {
        // Hard gate: no POST to /companies/bulk/delete until re-issued confirmed.
        const count =
          ids !== undefined ? ids.length : await fetchCompanyListCount(company_list_id as number, apiKey, baseUrl)
        // Both count sources are upper bounds ("up to N"): an id-derived count
        // because Rails deletes the INTERSECTION of company_ids and the team's
        // companies (and the list when both are given); a list-derived count
        // (fetchCompanyListCount) because the bulk-delete controller runs
        // member_scoped, so a regular team member only deletes the companies they
        // own — a subset of the team-wide list count returned here.
        const countPhrase =
          count !== null
            ? `up to ${count} compan${count === 1 ? "y" : "ies"}`
            : `ALL companies in company list ${company_list_id}`
        const stub = awaitingConfirmationStub(
          `Awaiting user confirmation to permanently delete ${countPhrase}.`,
          count !== null ? { requested_count: count } : {},
        )
        return embedNextAction(
          stub,
          buildNextAction({
            kind: "ask_user",
            question: `This permanently deletes ${countPhrase} and cannot be undone. Ask the user to explicitly confirm the count before re-issuing with confirmed: true.`,
            pendingToolCall: {
              tool: TOOL_NAMES.bulkDeleteCompanies,
              args: {
                ...(ids && { company_ids: ids }),
                ...(company_list_id !== undefined && { company_list_id }),
                confirmed: true,
              },
            },
          }),
        )
      }

      const params: Record<string, string | string[]> = {}
      if (ids) params.company_ids = ids.map(String)
      if (company_list_id !== undefined) params.company_list_id = String(company_list_id)
      const result = await callHunterApi({ path: "/companies/bulk/delete", apiKey, baseUrl, method: "POST", params })
      return withDeepLink(result, "/lead/companies")
    },
  )
}
