// Minimal ambient declaration for the sliver of `node:async_hooks` that
// mcp-client.ts uses.
//
// The module exists at runtime — `nodejs_compat` is on (wrangler.jsonc) and, at
// a compatibility date past 2024-09-23, workerd guarantees AsyncLocalStorage;
// @sentry/cloudflare already relies on that same guarantee. Only the TYPES are
// missing, because this project deliberately carries no `@types/node`:
// `tsconfig.json` sets `lib: ["es2021"]` and takes its globals from the
// wrangler-generated `worker-configuration.d.ts`.
//
// Declaring the two methods we call, rather than adding `@types/node`, is the
// smaller change and the safer one. `@types/node` installs Node's global
// environment — `fetch`, `Response`, `Headers`, `crypto`, `process` — over a
// Workers project whose runtime types define those same names differently, and
// the resulting conflicts would land across the whole codebase rather than in
// this one import. If this file ever needs to grow past a couple of members,
// that is the signal to revisit the `@types/node` decision properly instead of
// extending the stub.
declare module "node:async_hooks" {
  export class AsyncLocalStorage<T> {
    getStore(): T | undefined
    run<R>(store: T, callback: () => R): R
  }
}
