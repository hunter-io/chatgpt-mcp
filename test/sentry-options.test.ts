import type { CloudflareOptions } from "@sentry/cloudflare"
import * as Sentry from "@sentry/cloudflare"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { sentryOptions } from "../src/index"

// Leaving a `dataCollection` category unset makes the SDK collect it, and the
// /mcp body and URLs carry end-user PII while x-api-key is a credential. These
// tests pin the config and run it through the real SDK, so an SDK bump that opens
// a new sink fails here. See HUN-20813.

const env = { SENTRY_DSN: "https://public@o1.ingest.us.sentry.io/1", SENTRY_ENVIRONMENT: "test" } as Env

const API_KEY = "hunter-key-123"
const COOKIE = "cookie-value-456"
const CLIENT_IP = "203.0.113.7"
const BODY_EMAIL = "body-jane@acme.com"
const WORKER_QUERY_EMAIL = "worker-jane@acme.com"
const OUTGOING_QUERY_EMAIL = "outgoing-jane@acme.com"
const OUTGOING_FRAGMENT = "outgoing-fragment"
const SECRETS = [API_KEY, COOKIE, CLIENT_IP, BODY_EMAIL, WORKER_QUERY_EMAIL, OUTGOING_QUERY_EMAIL]

// Runs a failing request through the real SDK with `options` and returns what it
// would have sent to Sentry, serialized.
async function captureEnvelopes(options: CloudflareOptions): Promise<string> {
  const envelopes: unknown[] = []
  const waits: Promise<unknown>[] = []
  const worker = Sentry.withSentry(
    () => ({
      ...options,
      cacheClient: false,
      transport: () => ({
        send: async (envelope) => {
          envelopes.push(envelope)
          return {}
        },
        flush: async () => true,
      }),
    }),
    {
      async fetch() {
        await fetch(`https://api.hunter.io/v2/email-verifier?email=${OUTGOING_QUERY_EMAIL}#${OUTGOING_FRAGMENT}`)
        throw new Error("boom")
      },
    } satisfies ExportedHandler<Env>,
  )

  const request = new Request(`https://chatgpt.hunter.io/mcp?email=${WORKER_QUERY_EMAIL}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      authorization: `Bearer ${API_KEY}`,
      cookie: `session=${COOKIE}`,
      "cf-connecting-ip": CLIENT_IP,
      "x-forwarded-for": CLIENT_IP,
    },
    body: JSON.stringify({ params: { arguments: { email: BODY_EMAIL } } }),
  })
  const ctx = {
    waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    passThroughOnException: () => {},
  } as unknown as ExecutionContext

  await expect(worker.fetch(request as never, env, ctx)).rejects.toThrow("boom")
  await Promise.all(waits)
  return JSON.stringify(envelopes)
}

describe("sentryOptions", () => {
  // The SDK wraps the global fetch once, on first init, so every test has to share
  // this stub for fetch breadcrumbs to be recorded.
  beforeAll(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    )
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it("explicitly turns off every category the SDK collects when unset", () => {
    const { dataCollection, tracesSampleRate } = sentryOptions(env)

    expect(tracesSampleRate).toBe(0)
    expect(dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      graphQL: { document: false, variables: false },
    })
    expect(dataCollection?.httpHeaders).toMatchObject({
      request: { deny: expect.arrayContaining(["-ip", "forwarded"]) },
      response: { deny: expect.arrayContaining(["-ip", "forwarded"]) },
    })
  })

  it.each([
    ["dataCollection and beforeSend together", (options: CloudflareOptions) => options],
    ["dataCollection alone", (options: CloudflareOptions) => ({ ...options, beforeSend: undefined })],
  ])("sends no credential or PII through the real SDK with %s", async (_name, adjust) => {
    const sent = await captureEnvelopes(adjust(sentryOptions(env)))

    // The event was really sent, with the triage data intact.
    expect(sent).toContain("boom")
    expect(sent).toContain("https://chatgpt.hunter.io/mcp")
    expect(sent).toContain("https://api.hunter.io/v2/email-verifier")
    for (const secret of SECRETS) expect(sent).not.toContain(secret)
    expect(sent).not.toContain("ip_address")
  })

  it("removes the outgoing URL fragment, which only beforeSend covers", async () => {
    const sent = await captureEnvelopes(sentryOptions(env))

    expect(sent).toContain("https://api.hunter.io/v2/email-verifier")
    expect(sent).not.toContain(OUTGOING_FRAGMENT)
  })
})
