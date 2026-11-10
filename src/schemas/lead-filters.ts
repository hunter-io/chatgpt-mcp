import { z } from "zod"

// The filters a dynamic leads list saves (HUN-24762). They are the filters of
// GET /v2/leads that the Leads page can also read back: Api::LeadsListsController
// rejects any other key, or a value it can't read, with invalid_input instead of
// saving a list broader than asked for. That excludes company_size, lead_city,
// lead_state, lead_country_code and a single id. Byte-identical in chatgpt-mcp:
// scripts/check-tool-names-aligned.mjs fails CI when the copies differ.

// Domain::COMPANY_TYPE_LIST (app/app/models/domain.rb). Lead validates company_type
// against it, so any other value fails the whole write (HUN-24656, HUN-24703).
// services/remote-mcp/test/tools.test.ts checks the lead write tools against Rails.
export const COMPANY_TYPES = [
  "educational",
  "educational institution",
  "government agency",
  "non profit",
  "partnership",
  "privately held",
  "public company",
  "self employed",
  "self owned",
  "sole proprietorship",
] as const

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
  "product",
  "research",
  "consulting",
  "administrative",
  "procurement",
] as const
const VERIFICATION_STATUSES = [
  "valid",
  "accept_all",
  "unknown",
  "invalid",
  "webmail",
  "disposable",
  "error",
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
  "canceled",
  "*",
  "~",
] as const
// Email::Seniority::LEVELS.
const SENIORITY_LEVELS = [
  "owner",
  "partner",
  "cxo",
  "vp",
  "director",
  "manager",
  "senior",
  "entry",
  "training",
  "*",
  "~",
] as const
// Lead::EMAIL_TYPES.
const EMAIL_TYPES = ["generic", "personal", "*", "~"] as const
// BusinessRegion::REGIONS. Lead::LeadSearch raises on any other region.
const BUSINESS_REGIONS = ["AMER", "EMEA", "APAC", "LATAM"] as const
// HunterAi::LeadFilterSchema::CONTINENTS.
const CONTINENTS = [
  "Africa",
  "Antarctica",
  "Asia",
  "Australia",
  "Oceania",
  "Europe",
  "North America",
  "South America",
] as const

// Api::LeadsSearchFilters::MAX_FILTER_VALUES.
const MAX_VALUES = 100

// Rails drops a blank value or an invalid date range instead of rejecting it,
// which widens the result to every lead.
const nonBlank = z.string().trim().min(1)
const isoDate = z.iso.date()
const dateFilter = z.union([z.enum(DATE_PRESETS), z.strictObject({ from: isoDate, to: isoDate })]).optional()
// An empty list encodes to nothing, so it would search without the filter.
const list = <T extends z.ZodType>(value: T) => z.array(value).min(1).max(MAX_VALUES)
// Elasticsearch stores IDs as integers; Rails drops a larger one.
const id = z.number().int().positive().max(2_147_483_647)
const ids = list(id)
// Rails reads a city value as city,state,country. It drops a value with no part and ignores a part
// after the third. Like Ruby's String#split, the parts leave out trailing empty ones.
const cityName = nonBlank.refine((city) => {
  const parts = city.replace(/,+$/, "").split(",")
  return parts.length <= 3 && parts.some((part) => part.trim() !== "")
}, "Give a city as city, city,state or city,state,country")
// Rails rejects a country or state code that no lead can hold, as excluding it would exclude
// nothing. These checks catch the usual mistakes before the call.
const countryCode = nonBlank.refine(
  (code) => /^[A-Za-z]{2}$/.test(code) && code.toUpperCase() !== "UK",
  "Give an ISO 3166-1 alpha-2 code, such as FR or GB (not UK)",
)
const stateCode = nonBlank.refine(
  (code) => /^([A-Za-z]{2}-)?[A-Za-z0-9]{1,3}$/.test(code) && !/^US-/i.test(code),
  "Give a US state code such as CA, or an ISO 3166-2 code such as DE-BY",
)
// A range or location bound with no value encodes to nothing, so it would search without the filter.
const locationValues = <T extends z.ZodType>(value: T) =>
  z
    .strictObject({ include: list(value).optional(), exclude: list(value).optional() })
    .refine(
      (bounds) => (bounds.include?.length ?? 0) + (bounds.exclude?.length ?? 0) > 0,
      "Give at least one value in include or exclude",
    )
    .optional()
// Lead::LeadSearch searches the first 100 characters of a text value, so a longer one would match
// more leads than asked.
const MAX_TEXT_LENGTH = 100
const tooLong = `Give at most ${MAX_TEXT_LENGTH} characters: Hunter searches only the first ${MAX_TEXT_LENGTH}`
// Rails splits a value on | and reads a leading ! as "exclude".
const oneValue = (noun: string) =>
  nonBlank.refine(
    (value) => !value.includes("|") && !value.startsWith("!"),
    `Give one ${noun} per value, without | or a leading !`,
  )
// Lead::LeadSearch matches a job title whole: only the other text filters keep 100 characters.
const jobTitle = oneValue("job title")
const companyName = oneValue("company name").max(MAX_TEXT_LENGTH, tooLong)
// Elasticsearch::Query#sanitize turns + into a space, removes ()[]{}<>, escapes an odd " and keeps
// the first 100 characters.
const sanitized = (text: string) =>
  text
    .replace(/[()[\]{}<>]/g, "")
    .replace(/\+/g, " ")
    .trim()
const withinLength = (text: string) => {
  const value = sanitized(text)
  return value.length + ((value.split('"').length - 1) % 2) <= MAX_TEXT_LENGTH
}
// Lead::LeadSearch then reads a leading ! as "does not contain", | as "or", and * or ~ only as the
// whole value. It skips the filter for a value with no term after !, and an empty term around |
// matches every lead.
const searchable = (text: string) => {
  const value = sanitized(text)
  if (value === "*" || value === "~") return true
  const terms = (value.startsWith("!") ? value.slice(1) : value).split("|").map((term) => term.trim())
  return terms.every((term) => term !== "" && term !== "*" && term !== "~")
}
const notSearchable = "Give text Hunter can search: a term on each side of |, a term after !, and * or ~ only alone"
// Lead::LeadSearch builds an unescaped Elasticsearch regexp (.*value.*) from most text filters and
// from custom attribute values. The regexp reads * ? @ & ~ # and \ as operators, so ".*" or "@" would
// match every lead with a value. A term with no letter or digit, such as ".", matches almost as much.
const plainTerms = (text: string) => {
  const value = sanitized(text)
  if (value === "" || value === "*" || value === "~") return true
  const terms = (value.startsWith("!") ? value.slice(1) : value).split("|")
  return terms.every((term) => /[\p{L}\p{N}]/u.test(term) && !/[*?@&~#\\]/.test(term))
}
const notPlain =
  "Give plain text: Hunter reads * ? @ & ~ # and \\ in a value as search operators, and each term needs a letter or a digit"
const searchText = nonBlank.refine(searchable, notSearchable).refine(withinLength, tooLong).refine(plainTerms, notPlain)
// List-Leads does not send a blank text filter, so only a value Hunter can't search is rejected.
const textFilter = z.string().refine((text) => text.trim() === "" || searchable(text), notSearchable)
const scalarText = textFilter.refine(withinLength, tooLong)
const regexpText = scalarText.refine(plainTerms, notPlain)
// Lead::LeadSearch looks up a query that is one email address as a whole, without the 100-character cut.
// Email::EMAIL_REGEX, which Email.valid_format? applies to a value with one @.
const EMAIL_REGEX = /^[a-z0-9_][a-z0-9._'%+-]{0,63}@(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.){1,8}[a-z]{2,63}$/i
const emailShaped = (text: string) => EMAIL_REGEX.test(text.trim())
// query is free text: Lead::LeadSearch searches * and ~ as text, not as "any value" or "no value".
const notPresence = (text: string) => text.trim() !== "*" && text.trim() !== "~"
const presenceNotHere = "* and ~ don't work here: give text to search"
const queryText = textFilter
  .refine((text) => emailShaped(text) || withinLength(text), tooLong)
  .refine(notPresence, presenceNotHere)
// Lead::LeadSearch reads ~ (no value) before the other values of position and company, and drops them.
const unsetAlone = (values: string[]) => !values.includes("~") || values.every((value) => value === "~")
const unsetAloneMessage = "Send ~ (no value) alone: Hunter ignores the values next to it"
const titleKeyword = nonBlank
  .max(MAX_TEXT_LENGTH, tooLong)
  .refine((keyword) => !keyword.includes("|"), "Give one keyword per value, without |")
  .refine(notPresence, presenceNotHere)

export const leadFiltersSchema = z.strictObject({
  leads_list_id: id.optional().describe("ID of a static list. Only its leads match."),
  query: queryText.optional().describe("Text to search in first name, last name, company, website and email"),
  email: scalarText.optional().describe("Email address"),
  first_name: regexpText.optional().describe("First name"),
  last_name: regexpText.optional().describe("Last name"),
  company: z
    .union([regexpText, list(companyName).refine(unsetAlone, unsetAloneMessage)])
    .optional()
    .describe("A company name, or a list of names: a lead at any one of them matches"),
  company_industry: regexpText.optional().describe("Company industry"),
  website: regexpText.optional().describe("Company website"),
  country_code: z
    .string()
    .trim()
    .regex(/^([A-Za-z]{2}|\*|~)?$/, "Give a two-letter country code such as US or FR, or * or ~")
    .optional()
    .describe(
      "The company's two-letter country code, e.g. US or FR, or * (any country) or ~ (no country). For where the person is, use location.",
    ),
  source: regexpText.optional().describe("Source of the lead"),
  phone_number: regexpText.optional().describe("Phone number"),
  linkedin_url: regexpText.optional().describe("LinkedIn profile URL"),
  twitter: regexpText.optional().describe("Twitter/X handle"),
  company_type: z
    .enum([...COMPANY_TYPES, "*", "~"])
    .optional()
    .describe("Company type, or * (any type) or ~ (no type)"),
  sync_status: z
    .enum(["pending", "error", "success", "*", "~"])
    .optional()
    .describe("CRM sync status, or * (any status) or ~ (no status)"),
  position: list(jobTitle)
    .refine(unsetAlone, unsetAloneMessage)
    .optional()
    .describe("Job titles. A lead matching any one matches."),
  position_keywords: list(titleKeyword)
    .optional()
    .describe(
      "Keywords to find in the job title, at most 64 words in all. Each keyword also matches its synonyms, e.g. cto matches Chief Technology Officer. The synonyms count toward the same 64 words: past them, a keyword matches only as typed. With position, a lead matching any title or keyword matches.",
    ),
  seniority_level: list(z.enum(SENIORITY_LEVELS))
    .optional()
    .describe("Seniority levels, or * (any level) or ~ (no level)"),
  email_type: list(z.enum(EMAIL_TYPES))
    .optional()
    .describe("generic (a shared address such as contact@) or personal, or * (any type) or ~ (no type)"),
  decision_maker: z.literal(true).optional().describe("true keeps only the leads marked as decision makers"),
  department: list(z.enum([...DEPARTMENTS, "*", "~"]))
    .optional()
    .describe("Departments, or * (any department) or ~ (no department). A lead in any one matches."),
  verification_status: list(z.enum(VERIFICATION_STATUSES))
    .optional()
    .describe("Email verification statuses, or * (any status) or ~ (no status)"),
  sending_status: list(z.enum(SENDING_STATUSES))
    .optional()
    .describe("Sending statuses, or * (any status) or ~ (no status)"),
  tags: ids.optional().describe("Tag IDs from List-Lead-Tags"),
  sequence_ids: z
    .union([list(z.union([id, z.literal("~")])), z.enum(["*", "~"])])
    .optional()
    .describe(
      "Sequence IDs from List-Sequences, or * (in any sequence) or ~ (in no sequence). Add ~ to the IDs to also keep leads in no sequence.",
    ),
  user_id: ids.optional().describe("IDs of the team members who saved the leads. A lead's created_by holds this ID."),
  confidence_score: z
    .union([
      z
        .strictObject({
          from: z.number().int().min(0).max(100).optional(),
          to: z.number().int().min(0).max(100).optional(),
        })
        .refine((range) => range.from !== undefined || range.to !== undefined, "Give from, to, or both"),
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
      country: locationValues(countryCode).describe("ISO 3166-1 alpha-2 codes, e.g. FR or GB"),
      state: locationValues(stateCode).describe(
        "US state codes such as CA, or ISO 3166-2 codes such as DE-BY for other countries",
      ),
      city: locationValues(cityName),
      continent: locationValues(z.enum(CONTINENTS)),
      business_region: locationValues(z.enum(BUSINESS_REGIONS)),
    })
    .refine((location) => Object.values(location).some((bounds) => bounds !== undefined), "Give at least one location")
    .optional()
    .describe("Where the person is: locations to include or exclude. For the company's country, use country_code."),
  custom_attributes: z
    .record(z.string(), searchText)
    .refine((values) => Object.keys(values).length > 0, "Give at least one custom attribute")
    .optional()
    .describe(
      "Keyed by a custom attribute slug from List-Custom-Attributes. The value is text to match, * (any value) or ~ (empty).",
    ),
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
