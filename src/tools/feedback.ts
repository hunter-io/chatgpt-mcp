import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { callHunterApi, FEEDBACK_ANNOTATIONS, TOOL_NAMES } from "../helpers"
import { buildResponseSchema } from "../schemas/common"

// Mirrors ApiFeedback::FEEDBACK_TYPES / SEVERITIES in the Hunter Rails app
// (app/app/models/api_feedback.rb). Kept in sync manually — if the Rails enum
// changes, update this list.
const FEEDBACK_TYPES = [
  "missing_endpoint",
  "incorrect_documentation",
  "unexpected_response",
  "bug",
  "data_quality",
  "confusing_behavior",
  "feature_request",
  "other",
] as const

const SEVERITIES = ["low", "medium", "high", "blocking"] as const

const feedbackDataSchema = z.object({
  id: z.number().int().optional(),
  status: z.string().optional(),
  feedback_type: z.string().optional(),
  severity: z.string().optional(),
  message: z.string().optional(),
})

const feedbackOutputSchema = buildResponseSchema(feedbackDataSchema)

export function registerFeedbackTools(server: McpServer, apiKey: string, baseUrl: string) {
  server.registerTool(
    TOOL_NAMES.reportFeedback,
    {
      description:
        "Report any problem you hit while using Hunter's API or tools — use this PROACTIVELY and liberally. " +
        "Call it whenever: a tool or endpoint you expected doesn't exist, an input or its documentation was " +
        "missing or misleading, a response errored or didn't match its documented shape, returned data looked " +
        "wrong or incomplete, or a workflow was confusing or harder than it should be. Reporting is FREE, never " +
        "consumes credits, and never blocks the user — you do not need to ask the user for permission. When in " +
        "doubt, report. Always include the endpoint or tool name and concrete expected-vs-actual details so the " +
        "Hunter team can act on it.",
      inputSchema: {
        feedback_type: z
          .enum(FEEDBACK_TYPES)
          .describe(
            "The kind of problem. Use 'missing_endpoint' when a capability is absent, " +
              "'incorrect_documentation' for wrong/misleading docs or inputs, 'unexpected_response' for a " +
              "schema/shape mismatch, 'bug' for errors or wrong behavior, 'data_quality' for wrong/incomplete " +
              "data, 'confusing_behavior' when it worked but was hard to use, 'feature_request' for an " +
              "enhancement, or 'other'.",
          ),
        summary: z.string().max(200).describe("A short one-line title for the issue (required)."),
        details: z.string().max(5000).describe("What happened and what you were trying to do (required)."),
        endpoint: z
          .string()
          .max(500)
          .optional()
          .describe("The API path or tool involved, e.g. '/v2/domain-search' or 'Domain-Search'."),
        expected: z.string().max(5000).optional().describe("What you expected to happen."),
        actual: z.string().max(5000).optional().describe("What actually happened (error text, wrong field, etc.)."),
        request_example: z
          .string()
          .max(5000)
          .optional()
          .describe("A sanitized example of the request that triggered the issue."),
        response_example: z
          .string()
          .max(5000)
          .optional()
          .describe("A sanitized example of the response or error you received."),
        severity: z.enum(SEVERITIES).optional().describe("How impactful the issue is. Defaults to 'low'."),
        agent: z.string().max(500).optional().describe("The name of the model or agent reporting, e.g. 'gpt-4o'."),
      },
      outputSchema: feedbackOutputSchema.shape,
      annotations: FEEDBACK_ANNOTATIONS,
    },
    async (fields) => {
      // Drop undefined optionals so the Rails form body only carries supplied keys.
      const params: Record<string, string> = {}
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null) params[key] = String(value)
      }

      return callHunterApi({ path: "/feedback", apiKey, baseUrl, method: "POST", params })
    },
  )
}
