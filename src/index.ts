import { McpAgent } from "agents/mcp"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import companyComponent from "../bundle/company.html.ts"
import discoverComponent from "../bundle/discover.html.ts"
import {
  BASE_API_URL_DEVELOPMENT,
  BASE_API_URL_PRODUCTION,
  type McpTextResult,
  READ_ONLY_ANNOTATIONS,
  TOOL_NAMES,
  WRITE_ANNOTATIONS,
  buildNextAction,
  callHunterApi,
  desc,
  embedNextAction,
  withDeepLink,
} from "./helpers"
import { buildResponseSchema, nullableString, paginationMetaSchema } from "./schemas/common"

// ─── Widget tool output schemas ──────────────────────────────────────────────
//
// Two widget tools (Discover, Company-Enrichment) have a hard contract with
// their React widgets in `src/discover-widget.tsx` and `src/company-widget.tsx`.
// The schemas below enumerate every field the widget reads PLUS allow
// passthrough via .loose() so jbuilder additions don't break validation.
//
// Critical: if you change the structuredContent shape for these tools, verify
// the widget still renders against the new payload before merging — the SDK
// validator will reject a mismatch and the widget never receives the data.

// Discover widget reads: data[].domain, data[].organization, data[].logo,
// data[].industry, data[].location, data[].hiring, data[].already_saved,
// data[].emails_count.{personal,generic,total}, meta.permalink, meta.results.
// See src/discover-widget.tsx:7-20 for DiscoverCompany type and :200-208 for
// the meta read.
const discoverCompanySchema = z
  .object({
    domain: z.string().optional(),
    organization: nullableString().optional(),
    logo: nullableString().optional(),
    emails_count: z
      .object({
        personal: z.number().int().nonnegative().optional(),
        generic: z.number().int().nonnegative().optional(),
        total: z.number().int().nonnegative().optional(),
      })
      .loose()
      .optional(),
    industry: nullableString().optional(),
    location: nullableString().optional(),
    hiring: z.boolean().optional(),
    already_saved: z.boolean().optional(),
  })
  .loose()

const discoverDataSchema = z.array(discoverCompanySchema)
// Discover returns `meta.permalink` alongside the pagination counters — keep
// the pagination shape strict and let `.loose()` absorb the permalink.
const discoverOutputSchema = buildResponseSchema(discoverDataSchema, paginationMetaSchema)

// Company-Enrichment widget reads: id, name, domain, logo, location, description,
// already_saved / alreadySaved (both forms tolerated), emails_count, metrics.employees,
// site.emailAddresses. See src/company-widget.tsx:25-44 for CompanyData type and
// :47-58 for the snake↔camel reconciliation.
//
// IMPORTANT: this tool's handler stores `json.data` directly into structuredContent
// (not `json` — see index.ts handler). So the outputSchema's `data` field is the
// company envelope (not nested again).
const companyEnrichmentDataSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
    domain: z.string().optional(),
    legalName: nullableString().optional(),
    logo: nullableString().optional(),
    location: nullableString().optional(),
    description: nullableString().optional(),
    foundedYear: z.union([z.number(), z.null()]).optional(),
    alreadySaved: z.boolean().optional(),
    already_saved: z.boolean().optional(),
    // Clearbit-style enrichment bags. Genuinely evolving surfaces — keep
    // loose so jbuilder additions flow through to the widget without
    // breaking validation. See HUN-19943 todos/018.
    emailsCount: z.object({}).loose().optional(),
    emails_count: z.object({}).loose().optional(),
    metrics: z.object({}).loose().optional(),
    site: z.object({}).loose().optional(),
    category: z.object({}).loose().optional(),
    geo: z.object({}).loose().optional(),
    tech: z.array(z.string()).optional(),
  })
  .loose()

// Company-Enrichment now routes through callHunterApi (HUN-19943 todos/011), so
// structuredContent is the standard `{ data, meta, viewInHunter?, nextAction? }`
// envelope. The widget at src/company-widget.tsx:47 reads either
// `toolOutput.data` OR `toolOutput` directly, so rendering is preserved.
const companyEnrichmentOutputSchema = buildResponseSchema(companyEnrichmentDataSchema)

const saveCompanyOutputSchema = buildResponseSchema(
  z
    .object({
      id: z.union([z.number(), z.string()]).optional(),
      domain: z.string().optional(),
    })
    .loose(),
)
import { registerPrompts } from "./prompts"
import { CAPABILITIES_RECOVERY_MD, CAPABILITIES_RECOVERY_URI } from "./resources/capabilities-recovery"
import { registerAccountTools } from "./tools/account"
import { registerCampaignTools } from "./tools/campaigns"
import { registerCustomAttributeTools } from "./tools/custom-attributes"
import { registerEnrichmentTools } from "./tools/enrichment"
import { registerLeadTools } from "./tools/leads"
import { registerLeadsListTools } from "./tools/leads-lists"
import { registerProspectingTool } from "./tools/prospecting"
import { registerSearchTools } from "./tools/search"

export class HunterChatGPTMCP extends McpAgent {
  // Type assertion needed: `agents` pins @modelcontextprotocol/sdk@1.26.0 while
  // the project uses ^1.27.1. The types are compatible at runtime but pnpm resolves
  // separate copies, causing a nominal type mismatch.
  server = new McpServer({
    name: "Hunter ChatGPT",
    version: "2.1.0",
  }) as any

  // Guard against the agents framework clobbering the stored API key when the
  // Durable Object wakes from hibernation. The framework calls updateProps()
  // with whatever props arrive in the current request; if those props lack an
  // apiKey (e.g. because a proxy stripped the header, or a non-standard client
  // didn't resend it), the stored key would be overwritten with undefined and
  // every subsequent tool call would send "Authorization: Bearer undefined" → 401.
  //
  // Mirrors remote-mcp/src/index.ts:onStart — the same risk exists here.
  async onStart(props?: Record<string, unknown>) {
    if (props && !props.apiKey) {
      try {
        const stored = (await this.ctx.storage.get("props")) as Record<string, unknown> | undefined
        if (stored?.apiKey) props.apiKey = stored.apiKey
      } catch {
        // Storage read can fail on first-ever init — that's fine,
        // the API key will come from ctx.props on the initial request.
      }
    }
    return super.onStart(props)
  }

  async init() {
    const baseUrl = this.props?.environment === "development" ? BASE_API_URL_DEVELOPMENT : BASE_API_URL_PRODUCTION
    const apiKey = this.props!.apiKey as string

    // --- ChatGPT widget resources ---
    this.server.registerResource("company-widget", "ui://widget/company-widget.html", {}, async () => ({
      contents: [
        {
          uri: "ui://widget/company-widget.html",
          mimeType: "text/html+skybridge",
          text: `${companyComponent}`.trim(),
          _meta: {
            "openai/widgetDomain": "https://chatgpt.hunter.io",
            "openai/widgetAccessible": true,
            "openai/widgetPrefersBorder": true,
            "openai/widgetCSP": {
              connect_domains: ["https://chatgpt.com", "https://hunter.io"],
              resource_domains: ["https://*.oaistatic.com", "https://*.hunter.io", "https://hunter.io"],
            },
            "openai/widgetDescription":
              "Display all available data for the specified company via the UI. When this widget is shown, the UI is the primary source of truth. Outside of the widget, the assistant will suggest next steps, provide high-level information on funding (if any), and share a small set of generic email addresses, including a link to the company profile on Hunter.io. Other than that, the assistant must not add any narrative, interpretation, recommendations, or descriptive text alongside the widget.",
          },
        },
      ],
    }))

    this.server.registerResource("discover-widget", "ui://widget/discover-widget.html", {}, async () => ({
      contents: [
        {
          uri: "ui://widget/discover-widget.html",
          mimeType: "text/html+skybridge",
          text: `${discoverComponent}`.trim(),
          _meta: {
            "openai/widgetDomain": "https://chatgpt.hunter.io",
            "openai/widgetAccessible": true,
            "openai/widgetPrefersBorder": true,
            "openai/widgetCSP": {
              connect_domains: ["https://chatgpt.com", "https://hunter.io"],
              resource_domains: ["https://*.oaistatic.com", "https://*.hunter.io", "https://hunter.io"],
            },
            "openai/widgetDescription":
              "Displays the top 5 results and a link to see all the results. You don't have to repeat the results; instead, suggest follow-up actions.",
          },
        },
      ],
    }))

    // --- ChatGPT-specific tools with widget metadata ---
    this.server.registerTool(
      TOOL_NAMES.discover,
      {
        description: desc`Find companies matching a natural language search query. Filter by location, industry, size, type, and technologies. Returns top 100 results by default — use 'offset' to paginate. Free (no credits). CRITICAL: never auto-pick the top result for a follow-up search — emit nextAction.kind === "ask_user" and let the user select which company to investigate. The top Discover hit is not necessarily the best semantic match. The response includes \`meta.permalink\` — a link to the same query on hunter.io that the user can open to see all results with the inferred filters applied; surface it as "See all results on Hunter" when relevant. CRITICAL: when the user picks more than one company for follow-up, call ${TOOL_NAMES.domainSearch} ONCE with the FIRST picked domain and pass \`pending_companies\` as the array of remaining picked domains. The chain auto-threads through ${TOOL_NAMES.domainSearch} → ${TOOL_NAMES.emailVerifier} → ${TOOL_NAMES.upsertLead} per company and continues to the next picked company without between-company confirmation gates. You only need to seed the loop on this first call.`,
        inputSchema: {
          query: z
            .string()
            .min(1)
            .max(500)
            .describe("Your search query. Example: 'software companies in San Francisco with more than 50 employees'"),
        },
        outputSchema: discoverOutputSchema.shape,
        annotations: READ_ONLY_ANNOTATIONS,
        _meta: {
          "openai/outputTemplate": "ui://widget/discover-widget.html",
          "openai/widgetAccessible": true,
          "openai/toolInvocation/invoking": "Rendering the results",
          "openai/toolInvocation/invoked": "Results ready",
        },
      },
      async ({ query }: { query: string }) => {
        // Route through callHunterApi for typed errorSchema envelope on isError,
        // mutationAck on empty bodies, and `stripInjectedFields` defense-in-depth
        // (HUN-19943 todos/011). Query goes in the path because POST /discover
        // takes it as a URL parameter, not a form body.
        const search = new URLSearchParams({ query }).toString()
        const result = await callHunterApi({ path: `/discover?${search}`, apiKey, baseUrl, method: "POST" })
        // Widget contract: discover-widget.tsx renders the result list + a
        // "See all on Hunter" link via meta.permalink. The widget is the sole
        // visual; empty content[] prevents ChatGPT from rendering a raw JSON
        // blob alongside it (same pattern as Company-Enrichment). The model
        // reads from structuredContent for follow-up reasoning. On the isError
        // path we preserve the original result so error narration in content[]
        // is not wiped.
        const widgetResult = result.isError ? result : { ...result, content: [] as McpTextResult["content"] }
        return embedNextAction(
          widgetResult,
          buildNextAction({
            kind: "ask_user",
            question:
              "I found matching companies. Which one(s) should I find contacts for? You can also refine the search.",
          }),
        )
      },
    )

    this.server.registerTool(
      TOOL_NAMES.companyEnrichment,
      {
        description: desc`Enrich a company domain with industry, size, location, technologies, funding, and social profiles. Does NOT return personal data (PII). Costs 1 enrichment credit — only charged if data is found. If you only have a company name, try assuming the domain. Follow up with ${TOOL_NAMES.domainSearch} to find contacts or ${TOOL_NAMES.saveCompany} to save as a lead.`,
        inputSchema: {
          domain: z.string().min(1).max(253).describe("Domain name of the company to enrich"),
        },
        outputSchema: companyEnrichmentOutputSchema.shape,
        annotations: READ_ONLY_ANNOTATIONS,
        _meta: {
          "openai/outputTemplate": "ui://widget/company-widget.html",
          "openai/widgetAccessible": true,
          "openai/toolInvocation/invoking": "Enrichment in progress",
          "openai/toolInvocation/invoked": "Enrichment completed",
        },
      },
      async ({ domain }: { domain: string }) => {
        // Route through callHunterApi for typed errorSchema envelope on isError,
        // mutationAck on empty bodies, and `stripInjectedFields` defense-in-depth
        // (HUN-19943 todos/011). The company widget at src/company-widget.tsx:47
        // reads either `toolOutput.data` OR `toolOutput` directly — the
        // `{ data, meta }` envelope returned by callHunterApi triggers the `.data`
        // branch, so widget rendering is preserved.
        const result = await callHunterApi({
          path: "/companies/find",
          apiKey,
          baseUrl,
          params: { domain },
        })
        // Widget contract: the company widget at src/company-widget.tsx is the sole
        // visual source of truth — empty content[] prevents ChatGPT from rendering
        // a raw JSON blob alongside the rendered widget. structuredContent.data is
        // what the widget reads. See chatgpt-mcp/docs/dashboard.md. On the isError
        // path we preserve the original result so error narration in content[] is
        // not wiped.
        const widgetResult = result.isError ? result : { ...result, content: [] as McpTextResult["content"] }
        return embedNextAction(
          widgetResult,
          buildNextAction({
            kind: "ask_user",
            question:
              "Save this company as a lead, find contacts at this domain, or both? (Multiple equally-valid next steps — let the user choose.)",
          }),
        )
      },
    )

    this.server.registerTool(
      TOOL_NAMES.saveCompany,
      {
        description: "Save a company as a lead in your Hunter account. Free (no credits).",
        inputSchema: {
          domain: z.string().min(1).max(253).describe("Domain name of the company to save into your Hunter Leads"),
        },
        outputSchema: saveCompanyOutputSchema.shape,
        annotations: WRITE_ANNOTATIONS,
      },
      async ({ domain }: { domain: string }) => {
        const result = await callHunterApi({
          path: "/leads/companies",
          apiKey,
          baseUrl,
          method: "POST",
          params: { domain },
        })
        return withDeepLink(result, "/leads")
      },
    )

    // --- Shared tools from modules ---
    registerSearchTools(this.server, apiKey, baseUrl)
    registerEnrichmentTools(this.server, apiKey, baseUrl)
    registerAccountTools(this.server, apiKey, baseUrl)
    registerLeadTools(this.server, apiKey, baseUrl)
    registerLeadsListTools(this.server, apiKey, baseUrl)
    registerCustomAttributeTools(this.server, apiKey, baseUrl)
    registerCampaignTools(this.server, apiKey, baseUrl)
    registerProspectingTool(this.server)
    registerPrompts(this.server)

    // Capability recovery resource — see docs/plans/2026-04-28-feat-chatgpt-app-review-readiness-plan.md (Pillar 5).
    this.server.registerResource(
      "capabilities-recovery",
      CAPABILITIES_RECOVERY_URI,
      {
        description: "How to translate ambiguous user intent into Hunter API filter values.",
        mimeType: "text/markdown",
      },
      async () => ({
        contents: [
          {
            uri: CAPABILITIES_RECOVERY_URI,
            mimeType: "text/markdown",
            text: CAPABILITIES_RECOVERY_MD,
          },
        ],
      }),
    )
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // CORS preflight handling
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, mcp-protocol-version",
        },
      })
    }

    let AUTHORIZATION_SERVER = "https://hunter.io"
    let ENVIRONMENT = "production"

    const url = new URL(request.url)

    if (url.hostname === "localhost") {
      AUTHORIZATION_SERVER = "https://localhost:4000"
      ENVIRONMENT = "development"
    }

    ctx.props.environment = ENVIRONMENT

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      // Extract API key from headers
      let apiKey = request.headers.get("x-api-key")
      if (!apiKey) {
        const authHeader = request.headers.get("authorization")
        if (authHeader?.startsWith("Bearer ")) {
          apiKey = authHeader.split(/\s+/)[1] ?? ""
        }
      }

      if (!apiKey) {
        return new Response("Unauthorized: a Hunter API key is required", {
          status: 401,
          headers: {
            "WWW-Authenticate": `Bearer resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`,
          },
        })
      }

      ctx.props.apiKey = apiKey

      return HunterChatGPTMCP.serveSSE("/sse").fetch(request, env, ctx)
    }

    if (url.pathname === "/mcp") {
      // Extract API key from headers
      let apiKey = request.headers.get("x-api-key")
      if (!apiKey) {
        const authHeader = request.headers.get("authorization")
        if (authHeader?.startsWith("Bearer ")) {
          apiKey = authHeader.split(/\s+/)[1] ?? ""
        }
      }

      if (!apiKey) {
        return new Response("Unauthorized: a Hunter API key is required", {
          status: 401,
          headers: {
            "WWW-Authenticate": `Bearer resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`,
          },
        })
      }

      ctx.props.apiKey = apiKey

      return HunterChatGPTMCP.serve("/mcp").fetch(request, env, ctx)
    }

    if (
      url.pathname === "/.well-known/oauth-protected-resource" ||
      url.pathname === "/.well-known/oauth-protected-resource/sse"
    ) {
      const wellKnownResource = {
        resource: url.origin,
        authorization_servers: [AUTHORIZATION_SERVER],
        scopes_supported: ["read", "write"],
        bearer_methods_supported: ["header"],
      }

      return new Response(JSON.stringify(wellKnownResource, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, mcp-protocol-version",
        },
      })
    }

    if (url.pathname === "/.well-known/openai-apps-challenge") {
      return new Response("JUhnNKiJYpD65gL3PPLSMoSuyplvLfsWHz9QUQ1q_Hs", {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, mcp-protocol-version",
        },
      })
    }

    if (url.pathname.startsWith("/assets/")) {
      const assetResponse = await env.ASSETS.fetch(request)

      // Add CORS headers to asset responses (required for ChatGPT widgets)
      const newHeaders = new Headers(assetResponse.headers)
      newHeaders.set("Access-Control-Allow-Origin", "*")

      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers: newHeaders,
      })
    }

    return new Response("Not found", { status: 404 })
  },
}
