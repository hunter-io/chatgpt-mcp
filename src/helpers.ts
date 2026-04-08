export const BASE_API_URL_PRODUCTION = "https://api.hunter.io/v2"
export const BASE_API_URL_DEVELOPMENT = "http://localhost:3000/v2"
export const HUNTER_BASE = "https://hunter.io"

export interface McpTextResult {
  [key: string]: unknown
  content: { type: "text"; text: string }[]
  isError?: boolean
}

export function withDeepLink(result: McpTextResult, path: string): McpTextResult {
  if (result.isError) return result
  const url = `${HUNTER_BASE}${path}`
  const text = result.content[0]?.text ?? ""
  return {
    content: [{ type: "text" as const, text: `${text}\n\nView in Hunter: ${url}` }],
  }
}

export function withDeepLinkFromId(result: McpTextResult, pathFn: (id: number) => string): McpTextResult {
  try {
    const raw = result.content[0]?.text ?? ""
    const jsonText = raw.split("\n\nSource:")[0]
    const id = JSON.parse(jsonText).data?.id
    if (typeof id === "number" && id > 0) return withDeepLink(result, pathFn(id))
  } catch (e) {
    console.warn("withDeepLinkFromId: failed to extract ID", e)
  }
  return result
}

interface FormParamsMap {
  [key: string]: string | string[] | FormParamsMap
}
type FormParams = FormParamsMap

type QueryParams = Record<string, string>

interface GetOptions {
  path: string
  apiKey: string
  baseUrl: string
  params?: QueryParams
}

interface MutateOptions {
  path: string
  apiKey: string
  baseUrl: string
  method: "POST" | "PUT" | "DELETE"
  params?: FormParams
}

type CallOptions = GetOptions | MutateOptions

function buildRailsFormBody(params: FormParams, prefix = ""): URLSearchParams {
  const result = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    const paramKey = prefix ? `${prefix}[${key}]` : key

    if (typeof value === "string") {
      result.append(paramKey, value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        result.append(`${paramKey}[]`, item)
      }
    } else {
      const nested = buildRailsFormBody(value, paramKey)
      for (const [k, v] of nested.entries()) {
        result.append(k, v)
      }
    }
  }

  return result
}

export async function callHunterApi(options: CallOptions): Promise<McpTextResult> {
  const isGet = !("method" in options)
  const method = isGet ? "GET" : options.method

  let url: string
  let body: string | undefined

  if (isGet) {
    const search = options.params ? new URLSearchParams(options.params).toString() : ""
    url = search ? `${options.baseUrl}${options.path}?${search}` : `${options.baseUrl}${options.path}`
  } else {
    if (options.params && Object.keys(options.params).length > 0) {
      const formBody = buildRailsFormBody(options.params)
      url = `${options.baseUrl}${options.path}`
      body = formBody.toString()
    } else {
      url = `${options.baseUrl}${options.path}`
    }
  }

  const headers: Record<string, string> = {
    "X-SOURCE": "hunter-chatgpt",
    Authorization: `Bearer ${options.apiKey}`,
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded"
  }

  const response = await fetch(url, { method, headers, body })

  if (!response.ok) {
    let errorText: string
    try {
      const errorJson = await response.json()
      errorText = JSON.stringify(errorJson)
    } catch {
      errorText = `HTTP ${response.status}`
    }
    return {
      content: [{ type: "text" as const, text: errorText }],
      isError: true,
    }
  }

  if (response.status === 204) {
    return {
      content: [{ type: "text" as const, text: "Success (no content)\n\nSource: Hunter.io (https://hunter.io)" }],
    }
  }

  const json = await response.json()
  return {
    content: [{ type: "text" as const, text: `${JSON.stringify(json)}\n\nSource: Hunter.io (https://hunter.io)` }],
  }
}

export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const

export const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const

export const DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: true,
} as const
