// Response bodies of the Agent briefing endpoints, as the jbuilder views under
// app/app/views/api/{briefing,opportunities,signals,monitored_signals} render
// them. Each call returns a fresh copy, so a test can change it.

const nextCall = (
  endpoint: string,
  params: Record<string, string | number>,
  mcpTool: string | null,
  credits = false,
) => ({
  endpoint,
  params,
  mcp_tool: mcpTool,
  charges_credits: credits,
})

export function briefingBody() {
  return {
    data: {
      needs_attention: {
        items: [
          {
            type: "lead_signals",
            status: "ok",
            reason: null,
            count: 12 as number | null,
            count_exact: true as boolean | null,
            next_call: nextCall(
              "GET /v2/signals",
              { source: "leads", since: "2026-10-29T09:00:00.000000Z", limit: 100 },
              null,
            ) as ReturnType<typeof nextCall> | null,
            next_since: "2026-11-03T21:00:00.000000Z" as string | null,
          },
          {
            type: "monitored_signals",
            status: "unavailable",
            reason: null,
            count: null,
            count_exact: null,
            next_call: null,
            next_since: "2026-10-29T09:00:00.000000Z",
          },
        ],
      },
      new_this_week: {
        items: [
          {
            type: "opportunities",
            status: "no_access",
            reason: "no_opportunities_access" as string | null,
            count: null as number | null,
            count_exact: null as boolean | null,
            next_call: null as ReturnType<typeof nextCall> | null,
            next_since: null,
          },
        ],
      },
      account: {
        status: "ok",
        plan_name: "Growth",
        plan_level: 2,
        reset_date: "2026-11-21",
        requests: {
          credits: { used: 120, available: 5000, remaining: 4880 },
          searches: { used: 100, available: 5000, remaining: 4900 },
          verifications: { used: 40, available: 10000, remaining: 9960 },
        },
        next_call: nextCall("GET /v2/account", {}, "Get-Account-Details"),
      },
    },
    meta: { since: "2026-10-29T09:00:00.000000Z", next_since: "2026-10-29T09:00:00.000000Z" },
  }
}

export function opportunitiesBody() {
  return {
    data: [
      {
        id: 812345,
        type: "people",
        source: "leads",
        description:
          "Chief Financial Officers at software companies in Germany are recommended based on your saved leads.",
        results_count: 174,
        score: 92,
        seen_at: null,
        created_at: "2026-11-02T06:14:09Z",
        next_call: nextCall("GET /v2/opportunities/812345/results", {}, null),
      },
      {
        id: 9,
        type: "companies",
        source: "companies",
        description: "Fintech companies like the ones you saved.",
        results_count: 40,
        score: 61,
        seen_at: "2026-11-03T08:00:00Z",
        created_at: "2026-11-02T06:14:09Z",
        next_call: nextCall("GET /v2/opportunities/9/results", {}, null),
      },
    ],
    meta: { results: 2, limit: 20, offset: 0 },
  }
}

export function peopleResultsBody() {
  return {
    data: [
      {
        name: "Ada L.",
        position: "CFO",
        department: "finance",
        seniority: "executive",
        type: "personal",
        provenance: "found",
        decision_maker: true,
        domain: "example.com",
        company_name: null,
        full_name_exists: true,
        phone_number_exists: false,
        verification: { date: null, status: "valid" },
        reveal_handle: "aAKWnmY9z-P8kCj6sBQjZ8yiYnNSMKb0",
      },
    ],
    meta: { type: "people", results: 1, limit: 20, offset: 0 },
  }
}

export function companyResultsBody() {
  return {
    data: [{ domain: "acme.io", emails_count: { personal: 12, generic: 3, total: 15 } }],
    meta: { type: "companies", results: 1, limit: 20, offset: 0 },
  }
}

export function signalsBody() {
  return {
    data: [
      {
        id: "lead:domain_event:812345678",
        source: "leads",
        type: "funding_round",
        occurred_at: "2026-11-02T10:00:00.000000Z",
        company: { domain: "stripe.com", name: null },
        details: { round_type: "Series A", amount_usd: 12000000, announced_on: "2026-11-02" },
        signal_id: null,
        next_call: nextCall("GET /v2/domain-search", { domain: "stripe.com" }, "Domain-Search", true),
      },
      {
        id: "lead:domain_event:812345679",
        source: "leads",
        type: "technology_added",
        occurred_at: "2026-11-01T10:00:00.000000Z",
        company: { domain: "acme.io", name: null },
        details: { technology: { slug: "react", name: "React" } },
        signal_id: null,
        next_call: nextCall("GET /v2/domain-search", { domain: "acme.io" }, "Domain-Search", true),
      },
    ],
    meta: {
      limit: 20,
      next_cursor: null as string | null,
      next_since: "2026-11-03T21:00:00.000000Z",
      window_start: "2026-10-06T21:00:00.000000Z",
    },
  }
}

export function monitoredSignalsBody() {
  return {
    data: [
      {
        id: 123,
        name: "Series A in France",
        type: "funding_rounds",
        status: "active",
        filters: { countries: ["FR"], series: ["series_a"] } as Record<string, unknown>,
        event_types: ["funding_round"],
        created_at: "2026-10-01T09:00:00Z",
      },
      {
        id: 124,
        name: "Stripe",
        type: "company_follow",
        status: "paused",
        filters: { domain: "stripe.com", updates: ["funding_round", "technology_added"] } as Record<string, unknown>,
        event_types: ["funding_round", "technology_added"],
        created_at: "2026-09-01T09:00:00Z",
      },
    ],
    meta: { total: 2, limit: 20, offset: 0 },
  }
}
