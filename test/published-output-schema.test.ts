import { afterEach, describe, expect, it, vi } from "vitest"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { createServer } from "../src/index"
import {
  briefingBody,
  companyResultsBody,
  monitoredSignalsBody,
  opportunitiesBody,
  peopleResultsBody,
  signalsBody,
} from "./fixtures/briefing"

// The real SDK Client checks structured output against the published JSON Schema, as validating hosts do.

async function connectClient() {
  const server = createServer("test-api-key", "https://api.hunter.io/v2")
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: "published-output-schema-test", version: "1.0.0" })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  // callTool only validates against the output schemas listTools cached.
  await client.listTools()
  return client
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// show.jbuilder with salesforce_sync_object on: conflict_policy is null unless the mapping imports.
const salesforceAppBody = {
  data: {
    id: 12,
    provider: "salesforce",
    name: "Salesforce",
    category: "crm",
    provider_email: "ops@acme.com",
    connected_at: "2026-10-01T09:00:00.000Z",
    updated_at: "2026-10-02T09:00:00.000Z",
    attribute_mappings: [
      { target_field: "Email", source_field: "email", direction: "export", conflict_policy: null },
      { target_field: "FirstName", source_field: "first_name", direction: "both", conflict_policy: "crm_wins" },
      { target_field: "Title", source_field: "position", direction: "import", conflict_policy: "fill_if_empty" },
    ],
  },
}

const flagOffBody = {
  data: { ...salesforceAppBody.data, attribute_mappings: [{ target_field: "Email", source_field: "email" }] },
}

describe("Get-Connected-App structured output", () => {
  it.each([
    ["with direction and conflict_policy", salesforceAppBody],
    ["without them while the owner's flag is off", flagOffBody],
  ])("validates against the published schema %s", async (_case, body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body))))
    const client = await connectClient()

    const result = await client.callTool({ name: "Get-Connected-App", arguments: { id: 12 } })

    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toEqual(body)
  })
})

// HUN-24935: the briefing, opportunity and signal tools, through the real SDK client.
describe("briefing tools structured output", () => {
  const counted = briefingBody()
  counted.data.new_this_week.items[0] = {
    type: "opportunities",
    status: "ok",
    reason: null,
    count: 3,
    count_exact: true,
    next_call: { endpoint: "GET /v2/opportunities", params: { limit: 50 }, mcp_tool: null, charges_credits: false },
    next_since: null,
  }

  it.each([
    ["Get-Briefing with unavailable and no_access items", "Get-Briefing", {}, briefingBody()],
    ["Get-Briefing with every item read", "Get-Briefing", { since: "2026-11-01T00:00:00Z" }, counted],
    ["List-Opportunities", "List-Opportunities", { limit: 2 }, opportunitiesBody()],
    ["Get-Opportunity-Results for people", "Get-Opportunity-Results", { opportunity_id: 812345 }, peopleResultsBody()],
    ["Get-Opportunity-Results for companies", "Get-Opportunity-Results", { opportunity_id: 9 }, companyResultsBody()],
    ["List-Signals", "List-Signals", { source: "leads", types: ["funding_round"] }, signalsBody()],
    ["List-Monitored-Signals", "List-Monitored-Signals", {}, monitoredSignalsBody()],
  ])("validates %s against the published schema", async (_case, name, args, body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body))))
    const client = await connectClient()

    const result = await client.callTool({ name, arguments: args })

    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toHaveProperty("nextAction")
  })
})
