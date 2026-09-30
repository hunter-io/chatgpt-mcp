import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  BILLABLE_LOOKUP_ANNOTATIONS,
  READ_ONLY_PUBLIC_ANNOTATIONS,
  TOOL_NAMES,
  buildNextAction,
  callHunterApi,
  desc,
  domainStringSchema,
  embedNextAction,
  hunterDomainSearchPath,
  parseHunterApiData,
  withDeepLink,
} from "../helpers"
import { buildResponseSchema, nullableNumber } from "../schemas/common"

interface EmailVerifierData {
  status?: string
  email?: string
}

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

const emailVerifierOutputSchema = buildResponseSchema(emailVerifierDataSchema)

const emailCountDataSchema = z
  .object({
    total: z.number().int().nonnegative(),
    personal_emails: z.number().int().nonnegative().optional(),
    generic_emails: z.number().int().nonnegative().optional(),
    department: z.object({}).loose().optional(),
    seniority: z.object({}).loose().optional(),
  })
  .loose()

const emailCountOutputSchema = buildResponseSchema(emailCountDataSchema)

// The ChatGPT app ships no tool that returns a person or an email address
// (HUN-23709). Email-Verifier only checks an address the user gives, and
// Email-Count returns counts with a link to the addresses on hunter.io.
export function registerSearchTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.emailVerifier,
    {
      description:
        "Use this when the user wants to check whether an email address they provide is deliverable. Returns a status (valid, invalid, accept_all, etc.) and a confidence score. Uses Hunter credits, charged only for valid, invalid, or accept_all results. Do not use this on role/group addresses (info@, support@, etc.) — deliverability of role addresses is not meaningful and the result will typically be accept_all.",
      inputSchema: {
        email: z.string().email().max(254).describe("Email address to verify"),
        save_leads: z
          .boolean()
          .optional()
          .describe(
            desc`Set true only when the user asked to save this address as a lead. A valid result then chains to ${TOOL_NAMES.createLeadIfMissing}. Leave unset to only report the status.`,
          ),
        leads_list_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            desc`The leads list to save into when save_leads is true. ${TOOL_NAMES.emailVerifier} does not use it, only forwards it to ${TOOL_NAMES.createLeadIfMissing}.`,
          ),
      },
      outputSchema: emailVerifierOutputSchema.shape,
      annotations: { ...BILLABLE_LOOKUP_ANNOTATIONS, title: "Verify Email" },
    },
    async ({ email, save_leads, leads_list_id }) => {
      const result = await callHunterApi({ path: "/email-verifier", apiKey, baseUrl, params: { email } })
      if (result.isError) return result

      const status = parseHunterApiData<EmailVerifierData>(result)?.status
      // Only a save request may chain into a write (HUN-20651 review fix K).
      const isSave = save_leads === true

      if (status === "valid" && isSave) {
        return embedNextAction(
          result,
          buildNextAction({
            kind: "call_tool",
            tool: TOOL_NAMES.createLeadIfMissing,
            reason: "Save the verified contact as a new lead without overwriting any existing record.",
            suggestedArgs: leads_list_id !== undefined ? { email, leads_list_id } : { email },
          }),
        )
      }

      return embedNextAction(
        result,
        buildNextAction({
          kind: "complete",
          summary: isSave
            ? status
              ? `Email is ${status} — not saving.`
              : "Email verification status unavailable — not saving."
            : status
              ? `Email is ${status}.`
              : "Email verification status unavailable.",
        }),
      )
    },
  )

  server.registerTool(
    TOOL_NAMES.emailCount,
    {
      description:
        "Use this when the user wants to know how many email addresses Hunter has for a company domain, optionally split by personal vs generic. Returns counts only, and a link to hunter.io where the user can see the addresses. Free to call.",
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
      const result = await callHunterApi({ path: "/email-count", apiKey, baseUrl, params })
      // The ChatGPT app cannot show the addresses (HUN-23709). Hand the user the
      // Hunter page that does.
      const linked = withDeepLink(result, hunterDomainSearchPath(domain), "email-count")
      return embedNextAction(
        linked,
        buildNextAction({
          kind: "complete",
          summary:
            "Tell the user how many email addresses Hunter has for this domain, and that they can see them on Hunter with the viewInHunter link.",
        }),
      )
    },
  )
}
