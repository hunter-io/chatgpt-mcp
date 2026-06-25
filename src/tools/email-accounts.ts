import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { callHunterApi, PRIVATE_READ_ANNOTATIONS, TOOL_NAMES } from "../helpers"
import { buildResponseSchema, nullableString, paginationMetaSchema } from "../schemas/common"

// Per-item shape from app/app/views/api/email_accounts/_email_account.jbuilder.
// Leaf is strict (no `.loose()`) so a jbuilder typo surfaces in vitest; the
// envelope is loose via buildResponseSchema. `sending_status` is one of
// active | paused | warming (the model derives it: active by default, paused
// when disconnected, warming during ramp-up or warmup). first_name/last_name
// come from `email_account.user&.first_name` so they can be null, and `email`
// is the nullable `send_email_as` column emitted raw, so it can be null too —
// admit null to avoid an SDK output-validation rejection (HUN-20344 bug class).
const emailAccountSchema = z.object({
  id: z.number().int(),
  email: nullableString(),
  first_name: nullableString(),
  last_name: nullableString(),
  sending_status: z.enum(["active", "paused", "warming"]),
  daily_limit: z.number().int(),
  provider: z.string(),
})

// index.jbuilder emits `json.data @email_accounts do |email_account| ...`, so
// `data` is an ARRAY of email accounts (not a `{ email_accounts: [...] }`
// object). `meta` carries `{ total, limit, offset }`.
const listEmailAccountsOutputSchema = buildResponseSchema(z.array(emailAccountSchema), paginationMetaSchema)

export function registerEmailAccountTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.listEmailAccounts,
    {
      description:
        "Use this when the user wants to see the email accounts (sending inboxes) connected to their Hunter account, typically as the first step before creating or starting a sequence. Surface each account's `sending_status` clearly: `active` means it is ready to send, `paused` means it is disconnected and will not send until reconnected, and `warming` means it is in ramp-up or warmup and currently sends a reduced volume. Each entry also includes the sender's email, name, daily sending limit, and provider (such as gmail or outlook). Supports `limit` and `offset` pagination. Free to call.",
      inputSchema: {
        offset: z.number().int().nonnegative().optional().describe("Number of email accounts to skip (default 0)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Maximum number of email accounts to return (default 20, max 100)"),
      },
      outputSchema: listEmailAccountsOutputSchema.shape,
      annotations: PRIVATE_READ_ANNOTATIONS,
    },
    async ({ offset, limit }) => {
      const params: Record<string, string> = {}
      if (offset !== undefined) params.offset = String(offset)
      if (limit !== undefined) params.limit = String(limit)
      return callHunterApi({ path: "/email-accounts", apiKey, baseUrl, params })
    },
  )
}
