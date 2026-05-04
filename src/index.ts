import { McpAgent } from "agents/mcp"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import companyComponent from "../bundle/company.html.ts"
import discoverComponent from "../bundle/discover.html.ts"
import {
  BASE_API_URL_DEVELOPMENT,
  BASE_API_URL_PRODUCTION,
  READ_ONLY_ANNOTATIONS,
  TOOL_NAMES,
  WRITE_ANNOTATIONS,
  buildNextAction,
  callHunterApi,
  desc,
  embedNextAction,
  withDeepLink,
} from "./helpers"
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
    version: "2.0.0",
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
        description: desc`Find companies matching a natural language search query. Filter by location, industry, size, type, and technologies. Returns top 100 results by default — use 'offset' to paginate. Free (no credits). CRITICAL: never auto-pick the top result for a follow-up search — emit nextAction.kind === "ask_user" and let the user select which company to investigate. The top Discover hit is not necessarily the best semantic match. The response includes \`meta.permalink\` — a link to the same query on hunter.io that the user can open to see all results with the inferred filters applied; surface it as "See all results on Hunter" when relevant.`,
        inputSchema: {
          query: z
            .string()
            .describe("Your search query. Example: 'software companies in San Francisco with more than 50 employees'"),
        },
        annotations: READ_ONLY_ANNOTATIONS,
        _meta: {
          "openai/outputTemplate": "ui://widget/discover-widget.html",
          "openai/toolInvocation/invoking": "Rendering the results",
          "openai/toolInvocation/invoked": "Results ready",
        },
      },
      async ({ query }: { query: string }) => {
        const params = new URLSearchParams({ query })
        const url = `${baseUrl}/discover?${params.toString()}`

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "X-SOURCE": "hunter-chatgpt",
            Authorization: `Bearer ${apiKey}`,
          },
        })

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

        const json: any = await response.json()
        const result = {
          structuredContent: json,
          content: [{ type: "text" as const, text: JSON.stringify(json) }],
        }
        return embedNextAction(
          result,
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
          domain: z.string().describe("Domain name of the company to enrich"),
        },
        annotations: READ_ONLY_ANNOTATIONS,
        _meta: {
          "openai/outputTemplate": "ui://widget/company-widget.html",
          "openai/toolInvocation/invoking": "Enrichment in progress",
          "openai/toolInvocation/invoked": "Enrichment completed",
        },
      },
      async ({ domain }: { domain: string }) => {
        const params = new URLSearchParams({ domain })
        const url = `${baseUrl}/companies/find?${params.toString()}`

        const response = await fetch(url, {
          headers: {
            "X-SOURCE": "hunter-chatgpt",
            Authorization: `Bearer ${apiKey}`,
          },
        })

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

        const json: any = await response.json()
        return embedNextAction(
          {
            structuredContent: json.data,
            content: [],
          },
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
          domain: z.string().describe("Domain name of the company to save into your Hunter Leads"),
        },
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
