import type { ErrorEvent } from "@sentry/cloudflare"
import { describe, expect, it } from "vitest"
import { scrubSensitive } from "../src/index"

// `scrubSensitive` is the Sentry `beforeSend` hook. Before any event leaves the
// Worker it must remove (a) credential headers — `x-api-key` is NOT in Sentry's
// default scrub denylist, so a regression leaks Hunter API keys — and (b) the
// request body, which @sentry/cloudflare captures for /mcp POSTs and which holds
// end-user PII (emails, names, phone numbers, lead notes). Tested directly (not
// through a live SDK init) so it never depends on a DSN. See HUN-20813.

describe("scrubSensitive", () => {
  it("strips credential headers (case-insensitive) and keeps benign ones", () => {
    const event = {
      request: {
        method: "POST",
        url: "https://chatgpt.hunter.io/mcp",
        headers: {
          Authorization: "Bearer super-secret-token",
          "x-api-key": "hunter-key-123",
          "X-API-Key": "hunter-key-456",
          Cookie: "session=abc",
          "content-type": "application/json",
          "mcp-protocol-version": "2025-03-26",
        },
      },
    } as unknown as ErrorEvent

    const request = scrubSensitive(event).request ?? {}
    const headers = request.headers ?? {}

    expect(headers).not.toHaveProperty("Authorization")
    expect(headers).not.toHaveProperty("x-api-key")
    expect(headers).not.toHaveProperty("X-API-Key")
    expect(headers).not.toHaveProperty("Cookie")
    // Non-sensitive headers + url/method survive for triage.
    expect(headers["content-type"]).toBe("application/json")
    expect(headers["mcp-protocol-version"]).toBe("2025-03-26")
    expect(request.url).toBe("https://chatgpt.hunter.io/mcp")
    expect(request.method).toBe("POST")
  })

  it("drops the request body, cookies, and query string (PII sinks)", () => {
    const event = {
      request: {
        method: "POST",
        // The SDK normalizes request.url from the raw Request.url, so a query
        // string would survive `delete query_string` — it must be stripped here.
        url: "https://chatgpt.hunter.io/mcp?token=leak&x-api-key=secret",
        // The /mcp body is the JSON-RPC tools/call payload — full of end-user PII.
        data: { method: "tools/call", params: { arguments: { email: "jane@acme.com", first_name: "Jane" } } },
        cookies: { session: "abc" },
        query_string: "token=leak",
      },
    } as unknown as ErrorEvent

    const request = scrubSensitive(event).request ?? {}

    expect(request).not.toHaveProperty("data")
    expect(request).not.toHaveProperty("cookies")
    expect(request).not.toHaveProperty("query_string")
    // The query string is stripped from request.url; origin+path kept for triage.
    expect(request.url).toBe("https://chatgpt.hunter.io/mcp")
    expect(request.method).toBe("POST")
  })

  it("strips query strings from breadcrumb URLs (fetch breadcrumbs carry PII)", () => {
    const event = {
      breadcrumbs: [
        {
          category: "fetch",
          data: { url: "https://api.hunter.io/v2/email-finder?domain=acme.com&full_name=Jane+Doe", method: "GET", status_code: 200 },
        },
        { category: "console", data: {} },
        { category: "navigation" },
      ],
    } as unknown as ErrorEvent

    const crumbs = scrubSensitive(event).breadcrumbs ?? []

    // Path kept (trail stays useful), query stripped.
    expect(crumbs[0]?.data?.url).toBe("https://api.hunter.io/v2/email-finder")
    expect(crumbs[0]?.data?.method).toBe("GET")
    // Breadcrumbs without a url are left untouched (no throw).
    expect(crumbs[2]?.category).toBe("navigation")
  })

  it("returns the event unchanged when there is no request payload", () => {
    const event = {} as unknown as ErrorEvent
    expect(() => scrubSensitive(event)).not.toThrow()
    expect(scrubSensitive(event)).toBe(event)
  })
})
