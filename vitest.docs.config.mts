import { defineConfig } from "vitest/config"

// The published-surface test behind docs/tool-surface.json, kept apart from
// the unit suite so the Cloudflare build never runs it.
export default defineConfig({
  test: {
    include: ["test-docs/**/*.test.ts"],
  },
})
