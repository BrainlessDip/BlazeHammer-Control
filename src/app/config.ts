/**
 * Application configuration derived from environment variables.
 * The API base URL is normalized so values with or without a trailing slash
 * produce identical URLs.
 */

function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return ""
  // Strip all trailing slashes so base + path concatenation stays well-formed.
  return trimmed.replace(/\/+$/, "")
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)

export const IS_PROXY_MODE = API_BASE_URL === ""

/** Builds an absolute URL for an /api/v1 relative endpoint path. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}/api/v1${path}`
}

/**
 * Derives the WebSocket URL from the API base URL:
 *   http://host  -> ws://host/api/v1/ws
 *   https://host -> wss://host/api/v1/ws
 * Empty base means same-origin: derive scheme/host from window.location.
 */
export function deriveWsUrl(base: string): string {
  const suffix = "/api/v1/ws"
  if (!base) {
    if (typeof window === "undefined") return suffix
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${window.location.host}${suffix}`
  }
  if (base.startsWith("https://")) {
    return `wss://${base.slice("https://".length)}${suffix}`
  }
  if (base.startsWith("http://")) {
    return `ws://${base.slice("http://".length)}${suffix}`
  }
  return `wss://${base}${suffix}`
}

export const WS_URL = deriveWsUrl(API_BASE_URL)

/** Human-readable display form of the backend origin. */
export function backendOrigin(): string {
  if (API_BASE_URL) return API_BASE_URL
  if (typeof window === "undefined") return ""
  return window.location.origin
}
