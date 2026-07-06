import { afterEach, describe, expect, it, vi } from "vitest"
import { callHunterApi } from "../src/helpers"

// HUN-18680 / HUN-20867: Idempotency-Key support in callHunterApi.
//
// Contract under test:
//   - every POST carries an Idempotency-Key header (auto-generated UUID per
//     invocation, or the caller-supplied key verbatim)
//   - GET / PUT / DELETE never carry the header
//   - a network-level fetch rejection on an idempotency-protected path
//     (POST /sequences) is retried exactly once, reusing the byte-identical
//     key so the server can replay instead of double-creating
//   - unprotected POST paths, HTTP-status errors, and deliberate aborts are
//     never retried

const BASE = "https://api.hunter.io/v2"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function okResponse(body: unknown = { data: { id: 1 } }) {
  return {
    ok: true,
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

function headerOf(mockFetch: ReturnType<typeof vi.fn>, callIndex = 0): string | undefined {
  const [, opts] = mockFetch.mock.calls[callIndex] as [string, { headers: Record<string, string> }]
  return opts.headers["Idempotency-Key"]
}

describe("HUN-18680 / HUN-20867: Idempotency-Key in callHunterApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("POST requests carry an auto-generated UUID Idempotency-Key header", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await callHunterApi({ path: "/sequences", apiKey: "k", baseUrl: BASE, method: "POST", params: { name: "Q3" } })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(headerOf(mockFetch)).toMatch(UUID_RE)
  })

  it("two invocations generate different keys", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await callHunterApi({ path: "/sequences", apiKey: "k", baseUrl: BASE, method: "POST", params: { name: "a" } })
    await callHunterApi({ path: "/sequences", apiKey: "k", baseUrl: BASE, method: "POST", params: { name: "b" } })

    const first = headerOf(mockFetch, 0)
    const second = headerOf(mockFetch, 1)
    expect(first).toMatch(UUID_RE)
    expect(second).toMatch(UUID_RE)
    expect(first).not.toBe(second)
  })

  it("a caller-supplied idempotencyKey is sent verbatim", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await callHunterApi({
      path: "/sequences",
      apiKey: "k",
      baseUrl: BASE,
      method: "POST",
      params: { name: "Q3" },
      idempotencyKey: "caller-key-123",
    })

    expect(headerOf(mockFetch)).toBe("caller-key-123")
  })

  it("GET requests carry no Idempotency-Key header", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await callHunterApi({ path: "/sequences", apiKey: "k", baseUrl: BASE })

    expect(headerOf(mockFetch)).toBeUndefined()
  })

  it("PUT and DELETE requests carry no Idempotency-Key header", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal("fetch", mockFetch)

    await callHunterApi({ path: "/sequences/1", apiKey: "k", baseUrl: BASE, method: "PUT", params: { name: "x" } })
    await callHunterApi({ path: "/sequences/1", apiKey: "k", baseUrl: BASE, method: "DELETE" })

    expect(headerOf(mockFetch, 0)).toBeUndefined()
    expect(headerOf(mockFetch, 1)).toBeUndefined()
  })

  it("network failure on POST /sequences retries once reusing the byte-identical key", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed: connection reset"))
      .mockResolvedValueOnce(okResponse({ data: { id: 7 } }))
    vi.stubGlobal("fetch", mockFetch)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    try {
      const result = await callHunterApi({
        path: "/sequences",
        apiKey: "k",
        baseUrl: BASE,
        method: "POST",
        params: { name: "Q3" },
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(headerOf(mockFetch, 0)).toMatch(UUID_RE)
      expect(headerOf(mockFetch, 1)).toBe(headerOf(mockFetch, 0))
      expect(result.isError).toBeUndefined()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it("network failure on BOTH the initial POST /sequences and its retry returns a typed error envelope (does not throw)", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed: connection reset"))
      .mockRejectedValueOnce(new TypeError("fetch failed: connection reset"))
    vi.stubGlobal("fetch", mockFetch)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    try {
      const result = await callHunterApi({
        path: "/sequences",
        apiKey: "k",
        baseUrl: BASE,
        method: "POST",
        params: { name: "Q3" },
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.isError).toBe(true)
      const error = (result.structuredContent as { error: Record<string, unknown> }).error
      expect(error.code).toBe("upstream_error")
    } finally {
      warnSpy.mockRestore()
    }
  })

  it("an AbortError on the retry propagates (not masked as upstream_error), mirroring the initial fetch", async () => {
    const abortError = new Error("The operation was aborted")
    abortError.name = "AbortError"
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed: connection reset"))
      .mockRejectedValueOnce(abortError)
    vi.stubGlobal("fetch", mockFetch)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    try {
      await expect(
        callHunterApi({ path: "/sequences", apiKey: "k", baseUrl: BASE, method: "POST", params: { name: "Q3" } }),
      ).rejects.toThrow("aborted")
      expect(mockFetch).toHaveBeenCalledTimes(2)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it("network failure on a non-idempotent POST path does not retry and propagates", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    vi.stubGlobal("fetch", mockFetch)

    await expect(
      callHunterApi({
        path: "/leads/bulk/move",
        apiKey: "k",
        baseUrl: BASE,
        method: "POST",
        params: { leads_list_id: "1", target_leads_list_id: "2" },
      }),
    ).rejects.toThrow("fetch failed")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("HTTP error responses do not retry", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers(),
      text: () => Promise.resolve(JSON.stringify({ errors: [{ id: "validation_failed", details: "bad" }] })),
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await callHunterApi({
      path: "/sequences",
      apiKey: "k",
      baseUrl: BASE,
      method: "POST",
      params: { name: "" },
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.isError).toBe(true)
  })

  it("409 + Retry-After: 2 (in-flight Idempotency-Key, HUN-18680) surfaces rate_limited with retry_after_seconds", async () => {
    // Rails' Api::Concerns::Idempotency returns 409 with `Retry-After: 2`
    // while a request carrying the same Idempotency-Key is still in flight.
    // The envelope must be retryable with an explicit wait so the model backs
    // off and checks for the resource instead of blindly re-creating.
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      headers: new Headers({ "Retry-After": "2" }),
      text: () =>
        Promise.resolve(
          JSON.stringify({ errors: [{ id: "idempotency_conflict", code: 409, details: "request in progress" }] }),
        ),
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await callHunterApi({
      path: "/sequences",
      apiKey: "k",
      baseUrl: BASE,
      method: "POST",
      params: { name: "Q3" },
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.isError).toBe(true)
    const error = (result.structuredContent as { error: Record<string, unknown> }).error
    expect(error).toMatchObject({ code: "rate_limited", retryable: true, retry_after_seconds: 2 })
  })

  it("aborted requests do not retry", async () => {
    const abortError = new Error("The operation was aborted")
    abortError.name = "AbortError"
    const mockFetch = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal("fetch", mockFetch)

    await expect(
      callHunterApi({
        path: "/sequences",
        apiKey: "k",
        baseUrl: BASE,
        method: "POST",
        params: { name: "Q3" },
      }),
    ).rejects.toThrow("aborted")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
