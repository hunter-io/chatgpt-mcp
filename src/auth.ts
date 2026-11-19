/**
 * Extract a Hunter API key from the supported request headers.
 *
 * HTTP authentication scheme names are case-insensitive, so every valid
 * casing of the Bearer scheme must be accepted. Keep X-API-Key precedence
 * unchanged for existing integrations.
 */
export function extractApiKey(request: Request): string | null {
  const explicit = request.headers.get("x-api-key")
  if (explicit) return explicit

  const authHeader = request.headers.get("authorization")
  const match = authHeader?.match(/^Bearer[ \t]+(\S+)$/i)
  return match?.[1] ?? null
}
