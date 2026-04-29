import "./main.css"
import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { Button } from "@openai/apps-sdk-ui/components/Button"
import { TextLink } from "@openai/apps-sdk-ui/components/TextLink"

type OpenAiGlobals = {
  toolInput?: unknown

  toolOutput?: any
}

type GlobalsState = {
  toolInput: unknown

  toolOutput: any
}

type OpenAiWithTools = {
  openai?: {
    callTool?: (name: string, input: unknown) => Promise<unknown>
  }
}

type CompanyData = {
  id?: string
  name?: string
  domain?: string
  logo?: string
  location?: string
  description?: string
  alreadySaved?: boolean
  emailsCount?: {
    personal?: number
    generic?: number
    total?: number
  }
  metrics?: {
    employees?: string
  }
  site?: {
    emailAddresses?: string[]
  }
}

// Helper to normalize company data from globals (handles snake_case -> camelCase)
function extractCompanyFromGlobals(globals: GlobalsState): CompanyData {
  const raw =
    (globals.toolOutput?.data as CompanyData | undefined) || (globals.toolOutput as CompanyData | undefined) || {}

  const alreadySaved =
    (raw as unknown as { already_saved?: boolean }).already_saved ?? (raw as CompanyData).alreadySaved

  return {
    ...raw,
    alreadySaved,
  }
}

function readGlobals(): GlobalsState {
  const openai = (window as unknown as { openai?: OpenAiGlobals }).openai ?? {}
  return {
    toolInput: openai.toolInput ?? null,
    toolOutput: openai.toolOutput ?? null,
  }
}

// Logo component that handles image load errors with React state
function CompanyLogo({ logo, companyName }: { logo?: string; companyName: string }) {
  const [imageError, setImageError] = useState(false)

  if (!logo || imageError) {
    return <div className="text-neutral-400 text-4xl font-bold">{companyName[0] || "?"}</div>
  }

  return (
    <>
      {/* Blurred background */}
      <img
        src={logo}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-20 filter blur-xl"
        aria-hidden="true"
      />
      {/* Centered logo */}
      <img
        src={logo}
        alt={`${companyName} logo`}
        className="max-h-20 max-w-20 object-contain rounded-md z-10"
        onError={() => setImageError(true)}
      />
    </>
  )
}

function handleViewInHunterClick(domain?: string) {
  if (!domain) return
  // Prefer the Apps SDK helper in ChatGPT, fall back to window.open in plain browser dev
  const openai = (window as any).openai
  const url = new URL(`https://hunter.io/search/${domain}`)
  url.searchParams.set("utm_source", "hunter-chatgpt")
  if (openai?.openExternal) {
    openai.openExternal({ href: url.toString() })
  } else {
    window.open(url.toString(), "_blank", "noopener,noreferrer")
  }
}

function App() {
  const [globals, setGlobals] = useState<GlobalsState>(readGlobals)

  // Derive initial saved state from the initial globals to keep UI in sync
  const initialCompany = extractCompanyFromGlobals(globals)

  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(Boolean(initialCompany.alreadySaved))

  // NOTE:
  // This effect keeps the widget in sync with live updates from ChatGPT / the Apps SDK.
  // It listens for the `openai:set_globals` event and refreshes `toolOutput`
  // whenever ChatGPT updates `window.openai`.
  useEffect(() => {
    function handleSetGlobals() {
      const updatedGlobals = readGlobals()
      setGlobals(updatedGlobals)
      const updatedCompany = extractCompanyFromGlobals(updatedGlobals)
      setIsSaved(Boolean(updatedCompany.alreadySaved))
    }

    window.addEventListener("openai:set_globals", handleSetGlobals)
    return () => {
      window.removeEventListener("openai:set_globals", handleSetGlobals)
    }
  }, [])

  const isLoading = !globals.toolOutput

  // The tool returns structuredContent: json.data, so toolOutput is the data object directly
  const company = extractCompanyFromGlobals(globals)
  const emailCount = company.emailsCount?.total ?? company.site?.emailAddresses?.length ?? 0

  async function handleSaveClick() {
    if (isSaving || isSaved || !company.domain) return

    const openai = (window as unknown as OpenAiWithTools).openai
    if (!openai?.callTool) return

    setIsSaving(true)
    try {
      await openai.callTool("Save-Company", { domain: company.domain })
      setIsSaved(true)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error), { cause: error })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[0.5px] border-[var(--color-border-primary-outline)] shadow-[var(--shadow-300)]">
        <div className="m-2 rounded-xl bg-neutral-100 min-h-[232px] animate-pulse" />

        <div className="p-4 space-y-3 pt-2 animate-pulse">
          <div className="flex justify-between items-baseline gap-4">
            <div className="h-4 w-32 rounded bg-neutral-200" />
            <div className="h-3 w-20 rounded bg-neutral-200" />
          </div>

          <div className="h-3 w-40 rounded bg-neutral-200" />

          <div className="border-t border-dashed border-black/10" />

          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-neutral-200" />
            <div className="h-3 w-5/6 rounded bg-neutral-200" />
          </div>

          <div className="flex gap-3 pt-4">
            <div className="h-10 flex-1 rounded-full bg-neutral-200" />
            <div className="h-10 flex-1 rounded-full bg-neutral-200" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[0.5px] border-[var(--color-border-primary-outline)] shadow-[var(--shadow-300)]">
      {/* Logo area */}
      <div className="relative h-48 rounded-xl overflow-hidden bg-neutral-100 m-2 min-h-[232px]">
        <div className="relative flex h-full items-center justify-center">
          <CompanyLogo logo={company.logo} companyName={company.name || "Company"} />
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 space-y-3 pt-2">
        {/* Header with name and email count */}
        <div className="flex justify-between items-baseline">
          <h1 className="text-xl font-medium text">{company.name || "Unknown Company"}</h1>
          {emailCount > 0 && (
            <span className="text-sm whitespace-nowrap ml-4 text-secondary">
              {emailCount} email {emailCount === 1 ? "address" : "addresses"}
            </span>
          )}
        </div>

        {/* URL, employees, location */}
        <span className="block text-sm text-secondary">
          {company.domain && (
            <>
              <TextLink href={`https://${company.domain}`} target="_blank">
                {company.domain}
              </TextLink>
              {(company.metrics?.employees || company.location) && " · "}
            </>
          )}
          {company.metrics?.employees && (
            <>
              {company.metrics.employees} employees
              {company.location && " · "}
            </>
          )}
          {company.location && <>{company.location}</>}
        </span>

        {/* Divider */}
        <div className="border-t border-dashed border-black/10" />

        {/* Description */}
        {company.description && <p className="text-sm text-secondary">{company.description}</p>}

        {/* Action buttons */}
        <div className="flex gap-3 py-2">
          <Button
            className="before:bg-hunter-600 hover:before:bg-hunter-700"
            color="primary"
            size="lg"
            variant="solid"
            loading={isSaving}
            inert={isSaved}
            onClick={handleSaveClick}
          >
            {isSaved ? "Saved" : "Save in Hunter"}
          </Button>
          <Button color="secondary" size="lg" variant="soft" onClick={() => handleViewInHunterClick(company.domain)}>
            View in Hunter
          </Button>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
