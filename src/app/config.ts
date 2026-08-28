/**
 * Application configuration derived from environment variables.
 *
 * VITE_ONLY_USER_URL:
 *   "true"  → ignore all env backend URLs, require user to provide via modal.
 *   "false" → use VITE_API_BASE_URL / proxy mode as fallback (default).
 */

import { getRuntimeBackendUrl } from "@/lib/connection-store"

// ---------------------------------------------------------------------------
// Static fallbacks from env (used before connection is established)
// ---------------------------------------------------------------------------

function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return ""
  return trimmed.replace(/\/+$/, "")
}

export const ONLY_USER_URL =
  import.meta.env.VITE_ONLY_USER_URL === "true"

const ENV_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)

export const IS_PROXY_MODE = !ONLY_USER_URL && ENV_BASE_URL === ""

// ---------------------------------------------------------------------------
// Dynamic API URL — delegates to the runtime backend URL
// ---------------------------------------------------------------------------

/**
 * Builds an absolute URL for an /api/v1 relative endpoint path.
 *
 * Uses the runtime backend URL when connected, falling back to the
 * env-configured base URL (which may be empty for proxy mode).
 */
export function apiUrl(path: string): string {
  const runtime = getRuntimeBackendUrl()
  const base = runtime ?? ENV_BASE_URL
  return `${base}/api/v1${path}`
}

// ---------------------------------------------------------------------------
// WebSocket URL
// ---------------------------------------------------------------------------

/**
 * Derives the WebSocket URL from a backend origin.
 * Empty base means same-origin: derive scheme/host from window.location.
 */
export function deriveWsUrl(base: string | null): string {
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

/** Legacy static WS_URL — derived from env fallback. Prefer useConnection().wsUrl. */
export const WS_URL = deriveWsUrl(ENV_BASE_URL || null)

// ---------------------------------------------------------------------------
// Backend origin display
// ---------------------------------------------------------------------------

/** Human-readable display form of the backend origin. */
export function backendOrigin(): string {
  const runtime = getRuntimeBackendUrl()
  if (runtime) return runtime
  if (ENV_BASE_URL) return ENV_BASE_URL
  if (typeof window === "undefined") return ""
  return window.location.origin
}
