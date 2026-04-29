export const BASE_API_URL_PRODUCTION = "https://api.hunter.io/v2"
export const BASE_API_URL_DEVELOPMENT = "http://localhost:3000/v2"
export const HUNTER_BASE = "https://hunter.io"

// TOOL_NAMES_START
// Single source of truth for every tool name exposed by Hunter MCPs.
// All names use PascalCase-Hyphenated for consistency. The only semantic
// rename is `Email-Enrichment` → `Person-Enrichment` (the operation enriches
// a person/profile, not an email — the email is just the input). Aligns with
// claude-plugin/skills/person-enrichment/.
//
// This block must be BYTE-IDENTICAL between chatgpt-mcp/src/helpers.ts and
// remote-mcp/src/helpers.ts — enforced by scripts/check-tool-names-aligned.mjs.
//
// See docs/plans/2026-04-28-feat-chatgpt-app-review-readiness-plan.md (Pillar 0).
export const TOOL_NAMES = {
  // search
  discover: "Discover",
  domainSearch: "Domain-Search",
  emailFinder: "Email-Finder",
  emailVerifier: "Email-Verifier",
  emailCount: "Email-Count",
  // enrichment
  personEnrichment: "Person-Enrichment",
  companyEnrichment: "Company-Enrichment",
  combinedEnrichment: "Combined-Enrichment",
  // account
  account: "Account",
  // leads
  listLeads: "List-Leads",
  getLead: "Get-Lead",
  createLead: "Create-Lead",
  updateLead: "Update-Lead",
  deleteLead: "Delete-Lead",
  upsertLead: "Upsert-Lead",
  leadExists: "Lead-Exists",
  saveCompany: "Save-Company",
  // leads lists
  listLeadsLists: "List-Leads-Lists",
  getLeadsList: "Get-Leads-List",
  createLeadsList: "Create-Leads-List",
  updateLeadsList: "Update-Leads-List",
  deleteLeadsList: "Delete-Leads-List",
  mergeLeadsLists: "Merge-Leads-Lists",
  // custom attributes
  listCustomAttributes: "List-Custom-Attributes",
  getCustomAttribute: "Get-Custom-Attribute",
  createCustomAttribute: "Create-Custom-Attribute",
  updateCustomAttribute: "Update-Custom-Attribute",
  deleteCustomAttribute: "Delete-Custom-Attribute",
  // campaigns
  listCampaigns: "List-Campaigns",
  listCampaignRecipients: "List-Campaign-Recipients",
  addCampaignRecipients: "Add-Campaign-Recipients",
  removeCampaignRecipients: "Remove-Campaign-Recipients",
  startCampaign: "Start-Campaign",
  // coordinator
  prospecting: "Prospecting",
} as const satisfies Record<string, string>

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES]

/**
 * Tagged template that accepts only string | ToolName interpolations.
 * Use in tool descriptions to keep cross-tool references valid:
 *
 *   description: desc`Use ${TOOL_NAMES.emailVerifier} to check deliverability.`
 *
 * Renaming a tool then becomes a single-file change to TOOL_NAMES.
 */
export function desc(strings: TemplateStringsArray, ...values: (string | ToolName)[]): string {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "")
}
// TOOL_NAMES_END

/**
 * Structured MCP tool result. Content carries user-visible (and optionally
 * assistant-only) text blocks; structuredContent carries machine-readable
 * data the model can reason over without parsing JSON out of prose.
 *
 * The `[key: string]: unknown` index signature is required by the MCP SDK's
 * CallToolResult type for forward compatibility. We keep it but also declare
 * the canonical fields explicitly — typos on those still fail type-check;
 * only fields we don't explicitly model fall through the index hatch.
 */
export interface McpTextResult {
  [key: string]: unknown
  content: { type: "text"; text: string; annotations?: { audience?: ("user" | "assistant")[] } }[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
  _meta?: Record<string, unknown>
}

export function withDeepLink(result: McpTextResult, path: string): McpTextResult {
  if (result.isError) return result
  const url = `${HUNTER_BASE}${path}`
  const text = result.content[0]?.text ?? ""
  return {
    content: [{ type: "text" as const, text: `${text}\n\nView in Hunter: ${url}` }],
  }
}

export function withDeepLinkFromId(result: McpTextResult, pathFn: (id: number) => string): McpTextResult {
  try {
    const raw = result.content[0]?.text ?? ""
    const jsonText = raw.split("\n\nSource:")[0]
    const id = JSON.parse(jsonText).data?.id
    if (typeof id === "number" && id > 0) return withDeepLink(result, pathFn(id))
  } catch (e) {
    console.warn("withDeepLinkFromId: failed to extract ID", e)
  }
  return result
}

interface FormParamsMap {
  [key: string]: string | string[] | FormParamsMap
}
type FormParams = FormParamsMap

type QueryParams = Record<string, string>

interface GetOptions {
  path: string
  apiKey: string
  baseUrl: string
  params?: QueryParams
}

interface MutateOptions {
  path: string
  apiKey: string
  baseUrl: string
  method: "POST" | "PUT" | "DELETE"
  params?: FormParams
}

type CallOptions = GetOptions | MutateOptions

function buildRailsFormBody(params: FormParams, prefix = ""): URLSearchParams {
  const result = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    const paramKey = prefix ? `${prefix}[${key}]` : key

    if (typeof value === "string") {
      result.append(paramKey, value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        result.append(`${paramKey}[]`, item)
      }
    } else {
      const nested = buildRailsFormBody(value, paramKey)
      for (const [k, v] of nested.entries()) {
        result.append(k, v)
      }
    }
  }

  return result
}

export async function callHunterApi(options: CallOptions): Promise<McpTextResult> {
  const isGet = !("method" in options)
  const method = isGet ? "GET" : options.method

  let url: string
  let body: string | undefined

  if (isGet) {
    const search = options.params ? new URLSearchParams(options.params).toString() : ""
    url = search ? `${options.baseUrl}${options.path}?${search}` : `${options.baseUrl}${options.path}`
  } else {
    if (options.params && Object.keys(options.params).length > 0) {
      const formBody = buildRailsFormBody(options.params)
      url = `${options.baseUrl}${options.path}`
      body = formBody.toString()
    } else {
      url = `${options.baseUrl}${options.path}`
    }
  }

  const headers: Record<string, string> = {
    "X-SOURCE": "hunter-chatgpt",
    Authorization: `Bearer ${options.apiKey}`,
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded"
  }

  const response = await fetch(url, { method, headers, body })

  if (!response.ok) {
    let errorText: string
    try {
      const errorJson = await response.json()
      errorText = JSON.stringify(errorJson)
    } catch {
      errorText = `HTTP ${response.status}`
    }
    return {
      content: [{ type: "text" as const, text: errorText }],
      isError: true,
    }
  }

  if (response.status === 204) {
    return {
      content: [{ type: "text" as const, text: "Success (no content)\n\nSource: Hunter.io (https://hunter.io)" }],
    }
  }

  const json = await response.json()
  return {
    content: [{ type: "text" as const, text: `${JSON.stringify(json)}\n\nSource: Hunter.io (https://hunter.io)` }],
  }
}

// ─── NextAction chaining (Pillar 1) ────────────────────────────────────────
//
// Mirrors openai/openai-apps-sdk-examples/cards_against_ai_server_node — the
// documented-by-example pattern for forcing the model to chain tool calls
// reliably. Multi-step tools return a NextAction in BOTH
// structuredContent.nextAction AND a model-only content text block:
//   - structuredContent is machine-readable
//   - the assistant-only block is JSON the model sees but the user does not
//     (audience: ["assistant"])
// Description prose reinforces with "CRITICAL: if nextAction.kind === 'call_tool',
// call the indicated tool immediately."
//
// See docs/plans/2026-04-28-feat-chatgpt-app-review-readiness-plan.md (Pillar 1).

/**
 * The chaining hint a tool emits to tell the model what to do next.
 *
 * - `call_tool`: chain into another tool. `tool` is the registered ToolName
 *   (compile-time check). `reason` is constants only — never untrusted API
 *   data (prompt-injection guard).
 * - `ask_user`: stop and wait for user input. Used for destructive ops and
 *   ambiguous next steps where the model shouldn't auto-pick.
 * - `complete`: terminal step, summarise and stop.
 */
export type NextAction =
  | {
      kind: "call_tool"
      tool: ToolName
      reason: string
      suggestedArgs?: Readonly<Record<string, unknown>>
      requiresConfirmation?: boolean
    }
  | { kind: "ask_user"; question: string }
  | { kind: "complete"; summary: string }

const REASON_MAX_LENGTH = 200
const SUGGESTED_ARGS_MAX_BYTES = 1024

/**
 * Truncates `reason` at 200 chars to keep chained-flow token cost bounded.
 * The discriminated union enforces shape at compile time — no runtime throws.
 */
export function buildNextAction(input: NextAction): NextAction {
  if (input.kind === "call_tool") {
    return {
      kind: "call_tool",
      tool: input.tool,
      reason: truncateReason(input.reason),
      ...(input.suggestedArgs !== undefined && { suggestedArgs: input.suggestedArgs }),
      ...(input.requiresConfirmation && { requiresConfirmation: true }),
    }
  }
  return input
}

function truncateReason(reason: string): string {
  if (reason.length <= REASON_MAX_LENGTH) return reason
  console.warn(`buildNextAction: reason truncated from ${reason.length} to ${REASON_MAX_LENGTH} chars`)
  return reason.slice(0, REASON_MAX_LENGTH - 3) + "..."
}

/**
 * Embeds a NextAction in a tool response across two carriers:
 *   - structuredContent.nextAction       (machine-readable)
 *   - content block with audience:["assistant"] (model-only)
 *
 * Single helper means the two locations can never drift apart.
 *
 * If the serialised payload exceeds 1KB (e.g., bloated suggestedArgs),
 * skips embedding and returns the result unchanged — the chain becomes
 * advisory rather than blowing up token budget.
 */
export function embedNextAction(result: McpTextResult, nextAction: NextAction): McpTextResult {
  if (result.isError) return result
  const serialised = JSON.stringify(nextAction)
  if (serialised.length > SUGGESTED_ARGS_MAX_BYTES) {
    console.warn(
      `embedNextAction: payload ${serialised.length} bytes exceeds ${SUGGESTED_ARGS_MAX_BYTES} cap — skipping embed`,
    )
    return result
  }
  return {
    ...result,
    content: [
      ...result.content,
      {
        type: "text" as const,
        text: serialised,
        annotations: { audience: ["assistant"] },
      },
    ],
    structuredContent: { ...result.structuredContent, nextAction },
  }
}

// ───────────────────────────────────────────────────────────────────────────

export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const

export const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const

export const DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: true,
} as const
