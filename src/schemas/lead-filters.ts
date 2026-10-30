import { z } from "zod"

// The filters a dynamic leads list saves (HUN-24762). They are the filters of
// GET /v2/leads that the Leads page can also read back: Api::LeadsListsController
// rejects any other key, or a value it can't read, with invalid_input instead of
// saving a list broader than asked for. That excludes company_size, lead_city,
// lead_state, lead_country_code and a single id. Mirrored byte-for-byte in
// chatgpt-mcp.

const DATE_PRESETS = ["last1h", "today", "this_week", "last7d", "last30d", "current_year", "*", "~"] as const
const DEPARTMENTS = [
  "executive",
  "it",
  "finance",
  "management",
  "sales",
  "legal",
  "support",
  "hr",
  "marketing",
  "communication",
  "education",
  "design",
  "health",
  "operations",
] as const
const VERIFICATION_STATUSES = [
  "valid",
  "accept_all",
  "unknown",
  "invalid",
  "webmail",
  "disposable",
  "pending",
  "*",
  "~",
] as const
const SENDING_STATUSES = [
  "clicked",
  "opened",
  "sent",
  "pending",
  "error",
  "bounced",
  "unsubscribed",
  "replied",
  "*",
  "~",
] as const

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
const dateFilter = z.union([z.enum(DATE_PRESETS), z.strictObject({ from: isoDate, to: isoDate })]).optional()
const ids = z.array(z.number().int().positive())
const locationValues = z
  .strictObject({ include: z.array(z.string()).optional(), exclude: z.array(z.string()).optional() })
  .optional()

export const leadFiltersSchema = z.strictObject({
  leads_list_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter leads by list ID. It must be a static list: the dynamic list then holds only its leads."),
  query: z
    .string()
    .optional()
    .describe("Search first name, last name, company, website and email. Every word must match."),
  email: z.string().optional().describe("Filter leads by email address"),
  first_name: z.string().optional().describe("Filter leads by first name"),
  last_name: z.string().optional().describe("Filter leads by last name"),
  company: z.string().optional().describe("Filter leads by company name"),
  company_industry: z.string().optional().describe("Filter leads by company industry"),
  website: z.string().optional().describe("Filter leads by company website"),
  country_code: z.string().optional().describe("Filter leads by two-letter country code (e.g. US, FR)"),
  source: z.string().optional().describe("Filter leads by source"),
  phone_number: z.string().optional().describe("Filter leads by phone number"),
  linkedin_url: z.string().optional().describe("Filter leads by LinkedIn profile URL"),
  twitter: z.string().optional().describe("Filter leads by Twitter/X handle"),
  company_type: z.string().optional().describe("Filter leads by company type (e.g. public, private, non-profit)"),
  sync_status: z.enum(["pending", "error", "success"]).optional().describe("Filter leads by CRM sync status"),
  position: z.array(z.string()).optional().describe("Filter leads by job title. A lead matching any one matches."),
  department: z.array(z.enum(DEPARTMENTS)).optional().describe("Filter leads by department"),
  verification_status: z
    .array(z.enum(VERIFICATION_STATUSES))
    .optional()
    .describe("Filter leads by verification status, or * (any status) or ~ (no status)"),
  sending_status: z
    .array(z.enum(SENDING_STATUSES))
    .optional()
    .describe("Filter leads by sending status, or * (any status) or ~ (no status)"),
  tags: ids.optional().describe("Filter leads by tag IDs"),
  sequence_ids: z
    .union([z.array(z.union([z.number().int().positive(), z.literal("~")])), z.enum(["*", "~"])])
    .optional()
    .describe(
      "Filter leads by sequence IDs, or * (in any sequence) or ~ (in no sequence). Add ~ to the IDs to also keep leads in no sequence.",
    ),
  user_id: ids.optional().describe("Filter leads by the IDs of the team members who saved them"),
  confidence_score: z
    .union([
      z.strictObject({
        from: z.number().int().min(0).max(100).optional(),
        to: z.number().int().min(0).max(100).optional(),
      }),
      z.enum(["*", "~"]),
    ])
    .optional()
    .describe("A from/to range between 0 and 100, or * (any score) or ~ (no score)"),
  created_at: dateFilter.describe("When the lead was saved: a preset or a from/to date range"),
  updated_at: dateFilter,
  last_activity_at: dateFilter,
  last_contacted_at: dateFilter,
  last_exported_at: dateFilter,
  verification_date: dateFilter,
  location: z
    .strictObject({
      country: locationValues.describe("ISO 3166-1 alpha-2 codes, e.g. FR"),
      state: locationValues,
      city: locationValues,
      continent: locationValues,
      business_region: locationValues.describe("AMER, EMEA, APAC or LATAM"),
    })
    .optional()
    .describe("Locations to include or exclude"),
  custom_attributes: z
    .record(z.string(), z.string())
    .optional()
    .describe("Keyed by custom attribute slug. The value is text to match, * (any value) or ~ (empty)."),
})

export type LeadFilters = z.infer<typeof leadFiltersSchema>

export type FormValue = string | string[] | { [key: string]: FormValue }

/** The filters as nested `filters[...]` form params, which Rails reads like the query string of GET /v2/leads. */
export function leadFiltersFormParams(filters: LeadFilters | object): { [key: string]: FormValue } {
  const out: { [key: string]: FormValue } = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue
    if (Array.isArray(value)) out[key] = value.map(String)
    else if (typeof value === "object" && value !== null) out[key] = leadFiltersFormParams(value)
    else out[key] = String(value)
  }
  return out
}
