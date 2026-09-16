import { AsyncLocalStorage } from "node:async_hooks"

// Carries the calling MCP host's User-Agent from the fetch handler down to
// `callHunterApi`, which forwards it to Rails as `X-MCP-USER-AGENT`.
//
// This worker deliberately does NOT decide what the User-Agent means. Rails owns
// that mapping (`Mcp::Client` in app/), for two reasons:
//
//   1. The value is clamped to a closed vocabulary before it reaches a PostHog
//      property, because `Cms::Posthog::AggregatedEventsJob` builds its Redis key
//      from the whole property set. That bound is what stops an authenticated
//      caller minting unbounded keys, and it has to hold for callers who skip this
//      worker and hit api.hunter.io directly with `X-SOURCE: hunter-mcp`. Rails has
//      to own the clamp either way, so putting a second copy here would be a
//      vocabulary that can drift from the one that actually protects anything.
//   2. A new MCP client then gets named once, in Ruby, rather than in two
//      TypeScript bundles that each need a Cloudflare deploy to take effect.
//
// The raw string also keeps the client's VERSION, which a slug throws away —
// `claude-code/2.1.271 (claude-desktop, agent-sdk/0.3.271)` answers "which Claude
// Code release" as well as "which surface".
//
// AsyncLocalStorage rather than a module-level variable: a Workers isolate serves
// concurrent requests, so a global would be read by whichever request happened to
// be mid-await and would cross-attribute traffic. It is also why the value is not
// threaded through `createServer` — that would mean touching every tool
// registration to carry something one function reads.
//
// `nodejs_compat` is enabled (wrangler.jsonc) and, at a compatibility date past
// 2024-09-23, guarantees AsyncLocalStorage — @sentry/cloudflare already depends on
// that same guarantee for its request scope.

// Long enough for every User-Agent observed in production (the longest is a
// ~90-character Claude build string) with room to spare, short enough that a
// hostile client cannot push a large header through to Rails. Matches the cap
// Rails already applies when it stores `request.user_agent` on a Request row.
export const MAX_USER_AGENT_LENGTH = 250

const userAgentStorage = new AsyncLocalStorage<string>()

// Public: run `fn` with `userAgent` as the ambient client User-Agent for this
// request. A missing or blank User-Agent establishes no scope at all, so
// `currentClientUserAgent` reports undefined and no header is sent — Rails tells
// an absent header (which it records as `unknown`) apart from one it cannot name.
export function withClientUserAgent<T>(userAgent: string | null | undefined, fn: () => T): T {
  const trimmed = userAgent?.trim()
  if (!trimmed) return fn()

  return userAgentStorage.run(trimmed.slice(0, MAX_USER_AGENT_LENGTH), fn)
}

// Public: the ambient client User-Agent, or undefined outside a scope.
export function currentClientUserAgent(): string | undefined {
  return userAgentStorage.getStore()
}
