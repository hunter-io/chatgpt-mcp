import { afterEach, describe, expect, it, vi } from "vitest"
import { callHunterApi } from "../src/helpers"

function stubFetch() {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [], meta: {} }), { status: 200 }))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

// HUN-25033 KTD1 and KTD8: GET queries use the Rails nested form, like POST bodies,
// and a query too long for Puma fails before the request. Mirrors the
// "callHunterApi GET query" block in remote-mcp/test/helpers.test.ts.
describe("callHunterApi GET query", () => {
  const BASE = "https://api.hunter.io/v2"
  type Params = Parameters<typeof callHunterApi>[0]["params"]

  async function requestedUrl(params: Params): Promise<string> {
    const fetchMock = stubFetch()
    await callHunterApi({ path: "/leads", apiKey: "k", baseUrl: BASE, params })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    return (fetchMock.mock.calls[0] as unknown as [string])[0]
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("encodes an array with empty brackets", async () => {
    expect(await requestedUrl({ sending_status: ["replied", "opened"] })).toBe(
      `${BASE}/leads?sending_status%5B%5D=replied&sending_status%5B%5D=opened`,
    )
  })

  it("encodes a nested object with an array inside", async () => {
    expect(await requestedUrl({ location: { country: { include: ["FR"] } } })).toBe(
      `${BASE}/leads?location%5Bcountry%5D%5Binclude%5D%5B%5D=FR`,
    )
  })

  it("encodes both bounds of a date range", async () => {
    expect(await requestedUrl({ created_at: { from: "2026-11-01", to: "2026-11-09" } })).toBe(
      `${BASE}/leads?created_at%5Bfrom%5D=2026-11-01&created_at%5Bto%5D=2026-11-09`,
    )
  })

  it("encodes a custom attribute hash", async () => {
    expect(await requestedUrl({ custom_attributes: { plan: "Pro" } })).toBe(
      `${BASE}/leads?custom_attributes%5Bplan%5D=Pro`,
    )
  })

  it("keeps a scalar value plain", async () => {
    expect(await requestedUrl({ sequence_ids: "*" })).toBe(`${BASE}/leads?sequence_ids=*`)
  })

  it("sends flat params as the same URL as before", async () => {
    const params = { leads_list_id: "5", limit: "1", email: "a b@c.co" }
    expect(await requestedUrl(params)).toBe(`${BASE}/leads?${new URLSearchParams(params).toString()}`)
    expect(await requestedUrl(params)).toBe(`${BASE}/leads?leads_list_id=5&limit=1&email=a+b%40c.co`)
  })

  it("keeps a key that already ends in brackets", async () => {
    expect(await requestedUrl({ "emails[]": "a@b.co" })).toBe(`${BASE}/leads?emails%5B%5D=a%40b.co`)
  })

  it("keeps flat and nested params in the order given", async () => {
    const url = await requestedUrl({
      leads_list_id: "5",
      sending_status: ["replied"],
      location: { country: { include: ["FR", "BE"] } },
      limit: "20",
    })
    expect(url).toBe(
      `${BASE}/leads?leads_list_id=5&sending_status%5B%5D=replied` +
        "&location%5Bcountry%5D%5Binclude%5D%5B%5D=FR&location%5Bcountry%5D%5Binclude%5D%5B%5D=BE&limit=20",
    )
  })

  it("adds no ? for empty or absent params", async () => {
    expect(await requestedUrl({})).toBe(`${BASE}/leads`)
    expect(await requestedUrl(undefined)).toBe(`${BASE}/leads`)
  })

  it("sends a query of exactly 8,000 characters", async () => {
    const url = await requestedUrl({ q: "a".repeat(7_998) })
    expect(url.split("?")[1]).toHaveLength(8_000)
  })

  it("refuses a query over 8,000 characters without calling Hunter", async () => {
    const fetchMock = stubFetch()

    const result = await callHunterApi({ path: "/leads", apiKey: "k", baseUrl: BASE, params: { q: "a".repeat(7_999) } })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: { code: string; retryable: boolean; message: string } }).error
    expect(error).toEqual({ code: "invalid_input", retryable: false, message: expect.any(String) })
    expect(error.message).toContain("too large")
    expect(error.message).toContain("fewer")
    expect(result.content).toEqual([{ type: "text", text: error.message, annotations: { audience: ["user"] } }])
  })

  it("refuses two full 100-value arrays", async () => {
    const fetchMock = stubFetch()
    const values = Array.from({ length: 100 }, (_, i) => `Head of Engineering Operations ${i}`)

    const result = await callHunterApi({
      path: "/leads",
      apiKey: "k",
      baseUrl: BASE,
      params: { position: values, company: values },
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
  })

  it("does not size-check a POST body", async () => {
    const fetchMock = stubFetch()

    const result = await callHunterApi({
      path: "/leads",
      apiKey: "k",
      baseUrl: BASE,
      method: "POST",
      params: { notes: "a".repeat(9_000) },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.isError).toBeUndefined()
  })
})
