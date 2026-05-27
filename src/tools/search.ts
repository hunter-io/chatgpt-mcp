import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  BILLABLE_LOOKUP_ANNOTATIONS,
  READ_ONLY_PUBLIC_ANNOTATIONS,
  TOOL_NAMES,
  buildNextAction,
  callHunterApi,
  carryLoopFilters,
  domainStringSchema,
  embedNextAction,
  loopRecoveryAction,
  parseHunterApiData,
  pendingCompaniesSchema,
} from "../helpers"
import {
  buildResponseSchema,
  nullableNumber,
  nullableString,
  paginationMetaSchema,
  verificationSchema,
} from "../schemas/common"

interface DomainSearchData {
  emails?: Array<{ value?: string }>
}

interface EmailVerifierData {
  status?: string
  email?: string
}

// ─── Output schemas (co-located with handlers) ───────────────────────────────

// Hunter domain-search emit shape from app/app/views/api/domain_search/.
// .loose() at envelope level; leaf is strict.
const emailEntrySchema = z
  .object({
    value: z.string(),
    type: z.string().optional(),
    confidence: z.number().int().min(0).max(100).optional(),
    first_name: nullableString().optional(),
    last_name: nullableString().optional(),
    position: nullableString().optional(),
    seniority: nullableString().optional(),
    department: nullableString().optional(),
    linkedin: nullableString().optional(),
    twitter: nullableString().optional(),
    phone_number: nullableString().optional(),
    verification: verificationSchema.optional(),
    sources: z.array(z.unknown()).optional(),
  })
  .loose()

const domainSearchDataSchema = z
  .object({
    domain: z.string(),
    disposable: z.boolean().optional(),
    webmail: z.boolean().optional(),
    accept_all: z.boolean().optional(),
    pattern: nullableString().optional(),
    organization: nullableString().optional(),
    country: nullableString().optional(),
    state: nullableString().optional(),
    emails: z.array(emailEntrySchema),
  })
  .loose()

// `app/views/api/email_finder/show.json.jbuilder` emits `linkedin_url` (not
// `linkedin` like Domain-Search's emailEntrySchema). The Ruby attribute
// `@result.linkedin` is incidental — the wire key is what matters.
const emailFinderDataSchema = z
  .object({
    first_name: nullableString().optional(),
    last_name: nullableString().optional(),
    email: nullableString(),
    score: nullableNumber(),
    domain: z.string().optional(),
    accept_all: z.boolean().optional(),
    position: nullableString().optional(),
    twitter: nullableString().optional(),
    linkedin_url: nullableString().optional(),
    phone_number: nullableString().optional(),
    company: nullableString().optional(),
    sources: z.array(z.unknown()).optional(),
    verification: verificationSchema.optional(),
  })
  .loose()

const emailVerifierDataSchema = z
  .object({
    status: z.string(),
    result: z.string().optional(),
    score: nullableNumber(),
    email: z.string(),
    regexp: z.union([z.boolean(), z.null()]).optional(),
    gibberish: z.union([z.boolean(), z.null()]).optional(),
    disposable: z.union([z.boolean(), z.null()]).optional(),
    webmail: z.union([z.boolean(), z.null()]).optional(),
    mx_records: z.union([z.boolean(), z.null()]).optional(),
    smtp_server: z.union([z.boolean(), z.null()]).optional(),
    smtp_check: z.union([z.boolean(), z.null()]).optional(),
    accept_all: z.union([z.boolean(), z.null()]).optional(),
    block: z.union([z.boolean(), z.null()]).optional(),
    sources: z.array(z.unknown()).optional(),
  })
  .loose()

const emailCountDataSchema = z
  .object({
    total: z.number().int().nonnegative(),
    personal_emails: z.number().int().nonnegative().optional(),
    generic_emails: z.number().int().nonnegative().optional(),
    department: z.object({}).loose().optional(),
    seniority: z.object({}).loose().optional(),
  })
  .loose()

const domainSearchOutputSchema = buildResponseSchema(domainSearchDataSchema, paginationMetaSchema)
const emailFinderOutputSchema = buildResponseSchema(emailFinderDataSchema)
const emailVerifierOutputSchema = buildResponseSchema(emailVerifierDataSchema)
const emailCountOutputSchema = buildResponseSchema(emailCountDataSchema)

function firstEmailValue(data: DomainSearchData | null): string | null {
  if (!data || !Array.isArray(data.emails)) return null
  for (const entry of data.emails) {
    if (entry && typeof entry.value === "string" && entry.value.length > 0) {
      return entry.value
    }
  }
  return null
}

export function registerSearchTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.domainSearch,
    {
      description:
        "Use this when the user wants the contacts published for a domain — emails with names, positions, and confidence scores. Optional filters: type, seniority, department, required field. Costs 1 search credit per 10 emails returned (rounded up), only charged when emails are found.",
      inputSchema: {
        domain: domainStringSchema.describe("Domain name to find data for"),
        limit: z.number().optional().describe("Maximum number of email addresses to return"),
        offset: z.number().optional().describe("Number of email addresses to skip"),
        type: z.enum(["personal", "generic"]).optional().describe("Type of email addresses to return"),
        seniority: z
          .string()
          .optional()
          .describe(
            "Filter by seniority level. Values: junior, senior, executive. Supports comma-separated multi-values (e.g. 'senior,executive')",
          ),
        department: z
          .string()
          .optional()
          .describe(
            "Filter by department. Values: executive, it, finance, management, sales, legal, support, hr, marketing, communication, education, design, health, operations. Supports comma-separated multi-values (e.g. 'sales,marketing')",
          ),
        required_field: z
          .enum(["full_name", "position", "phone_number"])
          .optional()
          .describe("Only return results where this field has a value"),
        pending_companies: pendingCompaniesSchema,
      },
      outputSchema: domainSearchOutputSchema.shape,
      annotations: BILLABLE_LOOKUP_ANNOTATIONS,
    },
    async ({ domain, limit, offset, type, seniority, department, required_field, pending_companies }) => {
      // Self-reference guard: drop the current domain from the loop carry so
      // the chain doesn't re-enter DS for the same company after saving its
      // lead. Dedup + lowercase normalization is handled by `pendingCompaniesSchema`'s
      // .transform() (entries arrive already-lowercased), so we only need to
      // compare against `domain.toLowerCase()` here to catch case-mixed
      // self-references like domain="Stripe.com" + pending=["stripe.com"].
      const domainLower = domain.toLowerCase()
      const cleanedPending = pending_companies && pending_companies.filter((d) => d !== domainLower)

      const params: Record<string, string> = { domain }
      if (limit !== undefined) params.limit = String(limit)
      if (offset !== undefined) params.offset = String(offset)
      if (type) params.type = type
      if (seniority) params.seniority = seniority
      if (department) params.department = department
      if (required_field) params.required_field = required_field
      const result = await callHunterApi({ path: "/domain-search", apiKey, baseUrl, params })
      if (result.isError) {
        if (cleanedPending !== undefined && cleanedPending.length > 0) {
          return loopRecoveryAction(result, cleanedPending, `Hunter API error on ${domain}`)
        }
        return result
      }

      const email = firstEmailValue(parseHunterApiData<DomainSearchData>(result))

      if (cleanedPending !== undefined) {
        // Forward DS filters (seniority, department, etc.) through the chain so
        // they apply at every company in the loop, not just the seed call.
        // Email-Verifier and Upsert-Lead accept these as carry-only fields.
        const filterCarry = carryLoopFilters({ limit, type, seniority, department, required_field })
        if (email) {
          return embedNextAction(
            result,
            buildNextAction({
              kind: "call_tool",
              tool: TOOL_NAMES.emailVerifier,
              reason: "Verify deliverability before saving (multi-company loop).",
              suggestedArgs: { email, pending_companies: cleanedPending, ...filterCarry },
            }),
          )
        }
        if (cleanedPending.length > 0) {
          const [next, ...rest] = cleanedPending
          return embedNextAction(
            result,
            buildNextAction({
              kind: "call_tool",
              tool: TOOL_NAMES.domainSearch,
              reason: `No contacts at ${domain}; continuing loop with next picked company.`,
              suggestedArgs: { domain: next, pending_companies: rest, ...filterCarry },
            }),
          )
        }
        return embedNextAction(
          result,
          buildNextAction({
            kind: "complete",
            summary: `No contacts found for ${domain}. Multi-company loop complete.`,
          }),
        )
      }

      if (!email) {
        return embedNextAction(
          result,
          buildNextAction({
            kind: "complete",
            summary: `No contacts found for ${domain}.`,
          }),
        )
      }

      return embedNextAction(
        result,
        buildNextAction({
          kind: "call_tool",
          tool: TOOL_NAMES.emailVerifier,
          reason: "Verify deliverability before saving.",
          suggestedArgs: { email },
          requiresConfirmation: true,
        }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.emailFinder,
    {
      description:
        "Use this when the user wants a specific person's email address at a company. Provide the person's full name and the company's domain. Costs 1 search credit, only charged when an email is found.",
      inputSchema: {
        full_name: z.string().min(1).max(200).describe("Full name of the person to find the email address for"),
        domain: domainStringSchema.describe("Domain name to find the person's email address for"),
      },
      outputSchema: emailFinderOutputSchema.shape,
      annotations: BILLABLE_LOOKUP_ANNOTATIONS,
    },
    async ({ full_name, domain }) => {
      return callHunterApi({ path: "/email-finder", apiKey, baseUrl, params: { full_name, domain } })
    },
  )

  server.registerTool(
    TOOL_NAMES.emailVerifier,
    {
      description:
        "Use this when the user wants to check whether an email address is deliverable. Returns a status (valid, invalid, accept_all, etc.) and a confidence score. Costs 1 verification credit, only charged for valid, invalid, or accept_all results.",
      inputSchema: {
        email: z.string().email().max(254).describe("Email address to verify"),
        pending_companies: pendingCompaniesSchema,
        // Domain-Search filter carry: not used by Email-Verifier itself, only
        // forwarded to the next chained call so filters survive the full loop.
        limit: z.number().optional().describe("Loop carry: forwarded from Domain-Search."),
        type: z.enum(["personal", "generic"]).optional().describe("Loop carry: forwarded from Domain-Search."),
        seniority: z.string().optional().describe("Loop carry: forwarded from Domain-Search."),
        department: z.string().optional().describe("Loop carry: forwarded from Domain-Search."),
        required_field: z
          .enum(["full_name", "position", "phone_number"])
          .optional()
          .describe("Loop carry: forwarded from Domain-Search."),
      },
      outputSchema: emailVerifierOutputSchema.shape,
      annotations: BILLABLE_LOOKUP_ANNOTATIONS,
    },
    async ({ email, pending_companies, limit, type, seniority, department, required_field }) => {
      const result = await callHunterApi({ path: "/email-verifier", apiKey, baseUrl, params: { email } })
      if (result.isError) {
        if (pending_companies !== undefined && pending_companies.length > 0) {
          return loopRecoveryAction(result, pending_companies, `Email-Verifier failed for ${email}`)
        }
        return result
      }

      const status = parseHunterApiData<EmailVerifierData>(result)?.status

      if (pending_companies !== undefined) {
        const filterCarry = carryLoopFilters({ limit, type, seniority, department, required_field })
        if (status === "valid") {
          return embedNextAction(
            result,
            buildNextAction({
              kind: "call_tool",
              tool: TOOL_NAMES.createLeadIfMissing,
              reason: "Save the verified contact as a new lead without overwriting any existing record.",
              suggestedArgs: { email, pending_companies, ...filterCarry },
            }),
          )
        }
        if (pending_companies.length > 0) {
          const [next, ...rest] = pending_companies
          return embedNextAction(
            result,
            buildNextAction({
              kind: "call_tool",
              tool: TOOL_NAMES.domainSearch,
              reason: `Email status: ${status ?? "unknown"} — skipping save and continuing loop.`,
              suggestedArgs: { domain: next, pending_companies: rest, ...filterCarry },
            }),
          )
        }
        return embedNextAction(
          result,
          buildNextAction({
            kind: "complete",
            summary: status
              ? `Email is ${status} — not saving. Multi-company loop complete.`
              : "Email verification status unavailable — not saving. Multi-company loop complete.",
          }),
        )
      }

      if (status === "valid") {
        return embedNextAction(
          result,
          buildNextAction({
            kind: "call_tool",
            tool: TOOL_NAMES.createLeadIfMissing,
            reason: "Save the verified contact as a new lead without overwriting any existing record.",
            suggestedArgs: { email },
          }),
        )
      }

      return embedNextAction(
        result,
        buildNextAction({
          kind: "complete",
          summary: status ? `Email is ${status} — not saving.` : "Email verification status unavailable — not saving.",
        }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.emailCount,
    {
      description:
        "Use this when the user wants the count of email addresses Hunter has indexed for a domain, optionally split by personal vs generic. Free to call.",
      inputSchema: {
        domain: domainStringSchema.describe("Domain name to count email addresses for"),
        type: z.enum(["personal", "generic"]).optional().describe("Type of email addresses to count"),
      },
      outputSchema: emailCountOutputSchema.shape,
      annotations: READ_ONLY_PUBLIC_ANNOTATIONS,
    },
    async ({ domain, type }) => {
      const params: Record<string, string> = { domain }
      if (type) params.type = type
      return callHunterApi({ path: "/email-count", apiKey, baseUrl, params })
    },
  )
}
