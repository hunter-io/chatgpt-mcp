import { describe, expect, it } from "vitest"
import { extractApiKey } from "../src/auth"

function request(headers: Record<string, string> = {}): Request {
  return new Request("https://chatgpt.hunter.io/mcp", { headers })
}

describe("extractApiKey", () => {
  it.each(["Bearer", "bearer", "BEARER", "bEaReR"])("accepts the %s scheme", (scheme) => {
    expect(extractApiKey(request({ Authorization: `${scheme} hunter-test-token` }))).toBe(
      "hunter-test-token",
    )
  })

  it("accepts one or more spaces or tabs between scheme and token", () => {
    expect(extractApiKey(request({ Authorization: "Bearer   hunter-test-token" }))).toBe(
      "hunter-test-token",
    )
    expect(extractApiKey(request({ Authorization: "Bearer\thunter-test-token" }))).toBe(
      "hunter-test-token",
    )
  })

  it("returns null for missing, empty, or malformed Bearer credentials", () => {
    expect(extractApiKey(request())).toBeNull()
    expect(extractApiKey(request({ Authorization: "Bearer" }))).toBeNull()
    expect(extractApiKey(request({ Authorization: "Bearer " }))).toBeNull()
    expect(extractApiKey(request({ Authorization: "Basic hunter-test-token" }))).toBeNull()
    expect(extractApiKey(request({ Authorization: "Bearer token with-spaces" }))).toBeNull()
  })

  it("preserves X-API-Key precedence", () => {
    expect(
      extractApiKey(
        request({
          "X-API-Key": "explicit-api-key",
          Authorization: "bearer authorization-token",
        }),
      ),
    ).toBe("explicit-api-key")
  })
})
