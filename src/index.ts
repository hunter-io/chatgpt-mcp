import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { z } from "zod"
import companyComponent from "../bundle/company.html.ts"
import discoverComponent from "../bundle/discover.html.ts"
import {
  BASE_API_URL_DEVELOPMENT,
  BASE_API_URL_PRODUCTION,
  BILLABLE_LOOKUP_ANNOTATIONS,
  type McpTextResult,
  PRIVATE_WRITE_ANNOTATIONS,
  READ_ONLY_PUBLIC_ANNOTATIONS,
  TOOL_NAMES,
  buildNextAction,
  callHunterApi,
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
    // `name`/`domain` come from `domain.company_name` / `domain.value` in
    // `_company.jbuilder` as raw scalars; `company_name` is null for a found-
    // but-nameless company, so `z.string()` would reject it and the SDK would
    // -32602. Same null-tolerance class as the email-finder accept_all bug
    // (HUN-20344). Mirrors remote-mcp's companyEnrichmentDataSchema.
    name: nullableString().optional(),
    domain: nullableString().optional(),
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
import { registerCompanyListTools } from "./tools/company-lists"
import { registerConnectedAppTools } from "./tools/connected-apps"
import { registerCustomAttributeTools } from "./tools/custom-attributes"
import { registerEmailAccountTools } from "./tools/email-accounts"
import { registerEnrichmentTools } from "./tools/enrichment"
import { registerLeadTools } from "./tools/leads"
import { registerLeadsListTools } from "./tools/leads-lists"
import { registerProspectingTool } from "./tools/prospecting"
import { registerSearchTools } from "./tools/search"
import { registerSequenceTools } from "./tools/sequences"

export function createServer(apiKey: string, baseUrl: string): McpServer {
  const server = new McpServer({
    name: "Hunter ChatGPT",
    version: "2.4.0",
  })

  // --- ChatGPT widget resources ---
  server.registerResource("company-widget", "ui://widget/company-widget.html", {}, async () => ({
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
            "Displays a company's profile (industry, size, location, technologies, funding, social profiles) as a card.",
        },
      },
    ],
  }))

  server.registerResource("discover-widget", "ui://widget/discover-widget.html", {}, async () => ({
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
          "openai/widgetDescription": "Displays the top 5 matching companies with a link to view the full result set.",
        },
      },
    ],
  }))

  // --- ChatGPT-specific tools with widget metadata ---
  server.registerTool(
    TOOL_NAMES.discover,
    {
      description:
        "Use this when the user wants to search for companies that match natural-language criteria such as location, industry, size, type, or technologies. Returns up to 100 matching companies per page; use `offset` to paginate. The response includes `meta.permalink` — a link to the same query on hunter.io that the user can open to view all results with the inferred filters applied. Free to call. Do not use this when the user has already named a specific company — call Company-Enrichment directly with that company's domain.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .max(500)
          .describe("Your search query. Example: 'software companies in San Francisco with more than 50 employees'"),
      },
      outputSchema: discoverOutputSchema.shape,
      annotations: READ_ONLY_PUBLIC_ANNOTATIONS,
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

  server.registerTool(
    TOOL_NAMES.companyEnrichment,
    {
      description:
        "Use this when the user wants to look up a company by domain and see its industry, size, location, technologies, funding rounds, and social profiles. Does not return personal data (PII). Costs 1 enrichment credit, only charged when data is found. Do not use this for personal websites or webmail domains (gmail.com, yahoo.com, etc.) — there is no company behind those domains to enrich.",
      inputSchema: {
        domain: z.string().min(1).max(253).describe("Domain name of the company to enrich"),
      },
      outputSchema: companyEnrichmentOutputSchema.shape,
      annotations: { ...BILLABLE_LOOKUP_ANNOTATIONS, title: "Enrich Company" },
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

  server.registerTool(
    TOOL_NAMES.saveCompany,
    {
      description:
        "Use this when the user wants to add a company as a lead in their Hunter account, identified by domain. Free to call.",
      inputSchema: {
        domain: z.string().min(1).max(253).describe("Domain name of the company to save into your Hunter Leads"),
      },
      outputSchema: saveCompanyOutputSchema.shape,
      annotations: PRIVATE_WRITE_ANNOTATIONS,
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
  registerSearchTools(server, apiKey, baseUrl)
  registerEnrichmentTools(server, apiKey, baseUrl)
  registerAccountTools(server, apiKey, baseUrl)
  registerEmailAccountTools(server, apiKey, baseUrl)
  registerSequenceTools(server, apiKey, baseUrl)
  registerLeadTools(server, apiKey, baseUrl)
  registerLeadsListTools(server, apiKey, baseUrl)
  registerCompanyListTools(server, apiKey, baseUrl)
  registerConnectedAppTools(server, apiKey, baseUrl)
  registerCustomAttributeTools(server, apiKey, baseUrl)
  registerCampaignTools(server, apiKey, baseUrl)
  registerProspectingTool(server)
  registerPrompts(server)

  // Capability recovery resource — see docs/plans/2026-04-28-feat-chatgpt-app-review-readiness-plan.md (Pillar 5).
  server.registerResource(
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

  return server
}

// HUN-20170-v3 Phase 4.5: CORS posture restricted from wildcard `Origin: *` to
// an allowlist of documented host origins. Server-to-server MCP clients (the
// OpenAI host, programmatic integrators) do not send an `Origin` header and
// are unaffected. Browser-side requests from non-allowed origins receive no
// `Access-Control-Allow-Origin` header (browser blocks). This closes the
// browser-stolen-Bearer attack vector flagged in the security-sentinel
// review without breaking any documented integration path.
const ALLOWED_CORS_ORIGINS = new Set(["https://chatgpt.com", "https://chat.openai.com"])

const CORS_METHOD_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, mcp-protocol-version",
}

function corsHeadersFor(request: Request): Record<string, string> {
  const origin = request.headers.get("origin")
  // No Origin header → server-to-server call (or non-CORS context). Browsers
  // always send Origin on cross-origin requests, so absence means no CORS
  // negotiation is needed. Return only the method/header policy so OPTIONS
  // preflights still describe what's allowed without granting any specific
  // origin access.
  if (!origin) {
    return CORS_METHOD_HEADERS
  }
  // Browser-side from an allowed host: reflect the specific origin and
  // include Vary: Origin so caches don't serve a wrong-origin response.
  if (ALLOWED_CORS_ORIGINS.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      ...CORS_METHOD_HEADERS,
    }
  }
  // Unknown origin: no Allow-Origin header, browser blocks.
  return CORS_METHOD_HEADERS
}

function extractApiKey(request: Request): string | null {
  const explicit = request.headers.get("x-api-key")
  if (explicit) return explicit
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(/\s+/)[1] ?? ""
    if (token) return token
  }
  return null
}

function addCorsHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeadersFor(request))) {
    headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeadersFor(request) })
    }

    const url = new URL(request.url)
    const AUTHORIZATION_SERVER = url.hostname === "localhost" ? "https://localhost:4000" : "https://hunter.io"

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return new Response("Gone — use /mcp (Streamable HTTP transport)", {
        status: 410,
        headers: corsHeadersFor(request),
      })
    }

    if (url.pathname === "/mcp") {
      const apiKey = extractApiKey(request)

      const baseUrl = url.hostname === "localhost" ? BASE_API_URL_DEVELOPMENT : BASE_API_URL_PRODUCTION

      // Validate on every request rather than caching — intentional security
      // posture. The old DO model validated once per session, but that enabled
      // the session-hijack class of bug this PR fixes. The extra 50-200ms RTT
      // per request is the accepted trade-off for statelessness.
      // When no key is present, allow through: ChatGPT calls tools/list for
      // discovery before the user has authenticated via OAuth. Actual tool calls
      // still fail at the Hunter backend (empty Bearer → 401).
      if (apiKey) {
        try {
          const accountResponse = await fetch(`${baseUrl}/account`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          })
          await accountResponse.body?.cancel()
          if (accountResponse.status === 401 || accountResponse.status === 403) {
            return new Response("Unauthorized: invalid Hunter API key", {
              status: 401,
              headers: {
                ...corsHeadersFor(request),
                "WWW-Authenticate": `Bearer resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`,
              },
            })
          }
          if (!accountResponse.ok) {
            return new Response("Upstream validation unavailable", { status: 502, headers: corsHeadersFor(request) })
          }
        } catch {
          return new Response("Upstream validation unavailable", { status: 502, headers: corsHeadersFor(request) })
        }
      }
      const server = createServer(apiKey || "", baseUrl)
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      await server.connect(transport)
      return addCorsHeaders(await transport.handleRequest(request), request)
    }

    if (
      url.pathname === "/.well-known/oauth-protected-resource" ||
      url.pathname === "/.well-known/oauth-protected-resource/sse"
    ) {
      return new Response(
        JSON.stringify(
          {
            resource: url.origin,
            authorization_servers: [AUTHORIZATION_SERVER],
            scopes_supported: ["read", "write"],
            bearer_methods_supported: ["header"],
          },
          null,
          2,
        ),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeadersFor(request) } },
      )
    }

    if (url.pathname === "/.well-known/openai-apps-challenge") {
      return new Response("JUhnNKiJYpD65gL3PPLSMoSuyplvLfsWHz9QUQ1q_Hs", {
        status: 200,
        headers: { "Content-Type": "text/plain", ...corsHeadersFor(request) },
      })
    }

    if (url.pathname.startsWith("/assets/")) {
      const assetResponse = await env.ASSETS.fetch(request)
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
