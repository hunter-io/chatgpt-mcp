import { describe, expect, it } from "vitest"
import * as workerEntrypoint from "../src/worker"

describe("Worker entrypoint", () => {
  it("exports only the default Worker handler", () => {
    expect(Object.keys(workerEntrypoint)).toEqual(["default"])
    expect(typeof workerEntrypoint.default.fetch).toBe("function")
  })
})
