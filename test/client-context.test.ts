import { describe, expect, it } from "vitest"
import { MAX_USER_AGENT_LENGTH, currentClientUserAgent, withClientUserAgent } from "../src/client-context"

// This module carries the caller's User-Agent, verbatim, from the fetch handler to
// `callHunterApi`. It deliberately does not interpret it — Rails owns that mapping
// (`Mcp::Client`), and the reasoning is in client-context.ts.
describe("withClientUserAgent / currentClientUserAgent", () => {
  it("exposes the User-Agent inside the scope", () => {
    withClientUserAgent("claude-code/2.1.272 (cli)", () => {
      expect(currentClientUserAgent()).toBe("claude-code/2.1.272 (cli)")
    })
  })

  it("returns undefined outside any scope", () => {
    expect(currentClientUserAgent()).toBeUndefined()
  })

  // The version is the whole reason this forwards the raw string rather than a
  // slug: it answers "which Claude Code release" as well as "which surface".
  it("keeps the version and the surface intact", () => {
    const ua = "claude-code/2.1.271 (claude-desktop, agent-sdk/0.3.271)"

    withClientUserAgent(ua, () => {
      expect(currentClientUserAgent()).toBe(ua)
    })
  })

  it("trims surrounding whitespace", () => {
    withClientUserAgent("  cursor/3.20.23 (darwin arm64)  ", () => {
      expect(currentClientUserAgent()).toBe("cursor/3.20.23 (darwin arm64)")
    })
  })

  // A hostile client must not be able to push an arbitrarily large header through
  // to Rails on the back of an ordinary tool call.
  it("truncates an overlong User-Agent", () => {
    withClientUserAgent("x".repeat(5000), () => {
      expect(currentClientUserAgent()).toHaveLength(MAX_USER_AGENT_LENGTH)
    })
  })

  // No scope at all rather than an empty string: Rails records an absent header as
  // `unknown`, which is a different fact from a User-Agent it could not name.
  it.each([
    ["", "empty string"],
    ["   ", "whitespace only"],
  ])("establishes no scope for %s (%s)", (ua) => {
    withClientUserAgent(ua, () => {
      expect(currentClientUserAgent()).toBeUndefined()
    })
  })

  it("establishes no scope for a missing User-Agent", () => {
    withClientUserAgent(null, () => {
      expect(currentClientUserAgent()).toBeUndefined()
    })
    withClientUserAgent(undefined, () => {
      expect(currentClientUserAgent()).toBeUndefined()
    })
  })

  it("survives an await, so a tool call mid-dispatch still sees it", async () => {
    await withClientUserAgent("codex-mcp-client/0.154.0", async () => {
      await Promise.resolve()
      expect(currentClientUserAgent()).toBe("codex-mcp-client/0.154.0")
    })
  })

  // The reason this is AsyncLocalStorage and not a module-level variable: a Workers
  // isolate interleaves concurrent requests, and a global would let one request
  // read another's client.
  it("keeps concurrent scopes isolated", async () => {
    const seen: (string | undefined)[] = []

    await Promise.all([
      withClientUserAgent("claude-code/2.1.272 (cli)", async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        seen.push(currentClientUserAgent())
      }),
      withClientUserAgent("cursor/3.20.23 (darwin arm64)", async () => {
        seen.push(currentClientUserAgent())
      }),
    ])

    expect(seen.toSorted()).toEqual(["claude-code/2.1.272 (cli)", "cursor/3.20.23 (darwin arm64)"])
  })

  it("returns the callback's value", () => {
    expect(withClientUserAgent("goose/1.39.0", () => 42)).toBe(42)
  })
})
