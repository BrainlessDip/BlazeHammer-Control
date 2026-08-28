/**
 * Connection store — manages the backend URL and connection lifecycle.
 *
 * Provides:
 * - URL normalization and validation
 * - localStorage persistence
 * - Runtime URL override for dynamic backend selection
 * - Connection health checking via fetch()
 */

const STORAGE_KEY = "blaze-hammer:backend-url"
const HEALTH_TIMEOUT_MS = 5_000

// ---------------------------------------------------------------------------
// URL normalization
// ---------------------------------------------------------------------------

const ALLOWED_SCHEMES = new Set(["http:", "https:"])

export function normalizeBackendUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error("Invalid URL: empty input")
  }

  // Reject dangerous schemes before parsing
  const probe = trimmed.toLowerCase()
  if (
    probe.startsWith("javascript:") ||
    probe.startsWith("file:") ||
    probe.startsWith("data:")
  ) {
    throw new Error(`Unsupported scheme: ${probe.split(":")[0]}:`)
  }

  let url: URL
  try {
    // If the input doesn't contain "://", it's likely a bare host:port
    if (!trimmed.includes("://")) {
      url = new URL(`http://${trimmed}`)
    } else {
      url = new URL(trimmed)
    }
  } catch {
    throw new Error(`Invalid URL: ${trimmed}`)
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    throw new Error(
      `Unsupported protocol: ${url.protocol} — only http: and https: are allowed`
    )
  }

  // Reject credentials in URL
  if (url.username || url.password) {
    throw new Error(
      "URLs with embedded credentials (user:password@host) are not allowed"
    )
  }

  // Normalize: preserve protocol, strip trailing slashes, strip default ports
  const isHttps = url.protocol === "https:"
  let normalized = url.origin + url.pathname
  normalized = normalized.replace(/\/+$/, "")

  // Strip default port (80 for http, 443 for https)
  if (isHttps) {
    normalized = normalized.replace(/:443$/, "")
  } else {
    normalized = normalized.replace(/:80$/, "")
  }

  return normalized
}

// ---------------------------------------------------------------------------
// Backend URL derivation from input
// ---------------------------------------------------------------------------

/** Derive the API base URL from a backend origin. Empty string = same-origin proxy. */
export function deriveApiBaseUrl(backendUrl: string | null): string {
  return backendUrl ?? ""
}

/** Derive WebSocket URL from a backend origin. */
export function deriveWsUrlFromBackend(backendUrl: string | null): string {
  if (!backendUrl) {
    // Same-origin: derive from window.location
    if (typeof window === "undefined") return "/api/v1/ws"
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${window.location.host}/api/v1/ws`
  }
  if (backendUrl.startsWith("https://")) {
    return `wss://${backendUrl.slice("https://".length)}/api/v1/ws`
  }
  if (backendUrl.startsWith("http://")) {
    return `ws://${backendUrl.slice("http://".length)}/api/v1/ws`
  }
  return `wss://${backendUrl}/api/v1/ws`
}

/** Human-readable display of a backend URL for the UI. */
export function displayBackendUrl(url: string | null): string {
  if (!url) return "same origin"
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

export function loadSavedBackendUrl(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved || null
  } catch {
    return null
  }
}

export function saveBackendUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url)
  } catch {
    // Storage full or unavailable — non-fatal.
  }
}

export function clearSavedBackendUrl(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}

// ---------------------------------------------------------------------------
// Connection health check
// ---------------------------------------------------------------------------

export interface ConnectionTestResult {
  ok: boolean
  error?: string
  corsBlocked?: boolean
  version?: string
}

/**
 * Test connectivity to a Blaze Hammer backend via GET /api/v1/health.
 *
 * Returns a result distinguishing:
 * - Network failure / backend unreachable
 * - CORS blocked (browser received opaque response or CORS error)
 * - HTTP error
 * - Success with optional version info
 */
export async function testBackendConnection(
  backendUrl: string
): Promise<ConnectionTestResult> {
  const healthUrl = `${backendUrl}/api/v1/health`

  let response: Response
  try {
    response = await fetch(healthUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })
  } catch (error) {
    // TypeError from fetch usually means CORS or network failure.
    // AbortError means timeout.
    const isTimeout =
      error instanceof DOMException && error.name === "AbortError"
    const msg = isTimeout
      ? "Connection timed out"
      : "Unable to reach the Blaze Hammer backend"

    // Detect CORS: a CORS failure often produces a TypeError because
    // the browser blocks the response entirely. A truly unreachable
    // server also produces a TypeError. We flag both as potentially
    // CORS-related when the error is a TypeError (not AbortError).
    const corsBlocked = !isTimeout && error instanceof TypeError

    return { ok: false, error: msg, corsBlocked }
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `Backend returned HTTP ${response.status}`,
    }
  }

  try {
    const data = (await response.json()) as Record<string, unknown>
    return {
      ok: true,
      version: typeof data.version === "string" ? data.version : undefined,
    }
  } catch {
    return { ok: true }
  }
}

// ---------------------------------------------------------------------------
// Runtime URL override (module-level, set by ConnectionProvider)
// ---------------------------------------------------------------------------

let runtimeBackendUrl: string | null = null

/** Set the runtime backend URL. Called by ConnectionProvider on connect. */
export function setRuntimeBackendUrl(url: string | null): void {
  runtimeBackendUrl = url
}

/** Get the current runtime backend URL. */
export function getRuntimeBackendUrl(): string | null {
  return runtimeBackendUrl
}
