import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { TOOL_NAMES } from "../src/helpers"

// Guards the OpenAI-submission artifacts in TESTING_PLAYBOOK.md against drift:
//   - the Section 6 autofill-script test cases stay within the submission form's
//     field-length limits and reference only real tools, and
//   - every registered tool is documented somewhere in the playbook.
// Counts are explicit so adding/removing a test case (or a tool) is a deliberate
// edit — bump the constant below when you change the script or the tool surface.
const EXPECTED_POSITIVE_CASES = 12
const EXPECTED_NEGATIVE_CASES = 3

// OpenAI submission form field-length caps (mirrored from the Section 6 script's MAX).
const FIELD_MAX = { description: 200, user_prompt: 500, tools_triggered: 200, expected_output: 300 } as const

const PLAYBOOK_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../TESTING_PLAYBOOK.md")
const playbook = readFileSync(PLAYBOOK_PATH, "utf8")

type AutofillCase = { description: string; user_prompt: string; tools_triggered?: string; expected_output?: string }

// Pull the `const DATA = {...}` literal out of the Section 6 ```js block. The
// literal holds only plain strings/arrays, so evaluating it is safe here.
function extractAutofillData(): { test_cases: AutofillCase[]; negative_test_cases: AutofillCase[] } {
  const match = playbook.match(/const DATA = (\{[\s\S]*?\n {2}\});/)
  if (!match) throw new Error("Section 6 `const DATA = {...}` autofill block not found in TESTING_PLAYBOOK.md")
  // eslint-disable-next-line no-new-func
  return new Function(`return (${match[1]})`)() as { test_cases: AutofillCase[]; negative_test_cases: AutofillCase[] }
}

const DATA = extractAutofillData()
const TOOL_VALUES = new Set<string>(Object.values(TOOL_NAMES))

describe("TESTING_PLAYBOOK.md — OpenAI submission autofill script (Section 6)", () => {
  it(`has exactly ${EXPECTED_POSITIVE_CASES} positive + ${EXPECTED_NEGATIVE_CASES} negative test cases`, () => {
    expect(DATA.test_cases.length).toBe(EXPECTED_POSITIVE_CASES)
    expect(DATA.negative_test_cases.length).toBe(EXPECTED_NEGATIVE_CASES)
  })

  it("keeps every positive test-case field within the OpenAI form length limit", () => {
    DATA.test_cases.forEach((tc, i) => {
      ;(["description", "user_prompt", "tools_triggered", "expected_output"] as const).forEach((key) => {
        const value = tc[key]
        expect(typeof value, `test_cases[${i}].${key} must be a string`).toBe("string")
        expect(value!.length, `test_cases[${i}].${key} is ${value!.length}/${FIELD_MAX[key]}`).toBeLessThanOrEqual(
          FIELD_MAX[key],
        )
      })
    })
  })

  it("keeps every negative test-case field within the limit", () => {
    DATA.negative_test_cases.forEach((tc, i) => {
      ;(["description", "user_prompt"] as const).forEach((key) => {
        expect(tc[key].length, `negative_test_cases[${i}].${key} is ${tc[key].length}/${FIELD_MAX[key]}`).toBeLessThanOrEqual(
          FIELD_MAX[key],
        )
      })
    })
  })

  it("references only registered tools in tools_triggered", () => {
    const referenced = new Set<string>()
    DATA.test_cases.forEach((tc) => (tc.tools_triggered ?? "").split(",").forEach((n) => referenced.add(n.trim())))
    referenced.delete("")
    const unknown = [...referenced].filter((name) => !TOOL_VALUES.has(name))
    expect(unknown, `tools_triggered names not in TOOL_NAMES: ${unknown.join(", ")}`).toEqual([])
  })
})

describe("TESTING_PLAYBOOK.md — tool coverage", () => {
  it(`documents all ${TOOL_VALUES.size} registered tools`, () => {
    const missing = [...TOOL_VALUES].filter((name) => !playbook.includes(name))
    expect(missing, `tools missing from TESTING_PLAYBOOK.md: ${missing.join(", ")}`).toEqual([])
  })
})
