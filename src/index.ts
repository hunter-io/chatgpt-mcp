import { McpAgent } from "agents/mcp"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import companyComponent from "../bundle/company.html.ts"
import discoverComponent from "../bundle/discover.html.ts"
import {
  BASE_API_URL_DEVELOPMENT,
  BASE_API_URL_PRODUCTION,
  READ_ONLY_ANNOTATIONS,
  WRITE_ANNOTATIONS,
  callHunterApi,
} from "./helpers"
import { registerAccountTools } from "./tools/account"
import { registerCampaignTools } from "./tools/campaigns"
import { registerCustomAttributeTools } from "./tools/custom-attributes"
import { registerEnrichmentTools } from "./tools/enrichment"
import { registerLeadTools } from "./tools/leads"
import { registerLeadsListTools } from "./tools/leads-lists"
import { registerSearchTools } from "./tools/search"

export class HunterChatGPTMCP extends McpAgent {
  // Type assertion needed: `agents` pins @modelcontextprotocol/sdk@1.26.0 while
  // the project uses ^1.27.1. The types are compatible at runtime but pnpm resolves
  // separate copies, causing a nominal type mismatch.
  server = new McpServer({
    name: "Hunter ChatGPT",
    version: "2.0.0",
  }) as any

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
      "Discover",
      {
        title: "Discover Companies",
        description:
          "Use this to find companies matching a search query expressed in natural language.\nCompanies can be filtered by headquarters location, industry, size, type, and technologies used.\nThe results include the name and domain name of each company, along with how many email addresses Hunter has found for that company.\nThe top 100 results are returned by default, but you can paginate through the results using the 'offset' parameter.\nThe total number of results matching the query is also provided (in 'meta'.'results'): if there are a few (less than 10) or too many (more than 1,000) results, interact with the user to refine their query.\nThis tool is read-only and does not use any credits.",
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
        return {
          structuredContent: json,
          content: [{ type: "text" as const, text: JSON.stringify(json) }],
        }
      },
    )

    this.server.registerTool(
      "Company-Enrichment",
      {
        title: "Enrich Company",
        description:
          "Use this to enrich a company domain with additional information, such as industry, size, location, and technologies used. If the user asks about any domain, enrichment is the way to go. If no domain is specified, only a company name, try assuming the domain and search for it.\nIMPORTANT: This tool does not process, store, or return any form of personal data (PII). It works exclusively with company-level information.\nThis tool can be used in combination of Discover to enrich company data.\nEach request to this tool consumes 0.2 credit.\nIf the response is a 402 Payment Required, inform the user that they have insufficient credits to perform the enrichment and then they should login to Hunter.io to upgrade their plan or purchase more credits.",
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
        return {
          structuredContent: json.data,
          content: [],
        }
      },
    )

    this.server.registerTool(
      "Save-Company",
      {
        title: "Save Company",
        description:
          "Use this to save a company into your Hunter Leads.\nYou need to provide the company's domain name.\nThis tool does not use any credits.",
        inputSchema: {
          domain: z.string().describe("Domain name of the company to save into your Hunter Leads"),
        },
        annotations: WRITE_ANNOTATIONS,
      },
      async ({ domain }: { domain: string }) => {
        return callHunterApi({ path: "/leads/companies", apiKey, baseUrl, method: "POST", params: { domain } })
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
