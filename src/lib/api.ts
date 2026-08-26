/**
 * Centralized API client for the Blaze Hammer backend.
 *
 * Responsibilities:
 * - Base URL handling (same-origin proxy mode or absolute URL)
 * - JSON encoding/decoding
 * - Cookie credentials + CSRF header (X-Requested-With)
 * - Request timeout via AbortController
 * - Error normalization into a single ApiError shape
 */

import { apiUrl } from "@/app/config"

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, message: string, code: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }
}

export type HttpMethod = "GET" | "POST" | "DELETE"

export interface RequestOptions {
  body?: unknown
  params?: Record<string, string | number | undefined>
  signal?: AbortSignal
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 15_000

type UnauthorizedHandler = (error: ApiError) => void

let onUnauthorized: UnauthorizedHandler | null = null

/** Registers the global 401 handler (wired to auth redirect in app bootstrap). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler
}

function buildUrl(
  path: string,
  params: Record<string, string | number | undefined> | undefined
): string {
  const url = apiUrl(path)
  if (!params) return url
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${url}?${qs}` : url
}

interface BackendErrorEnvelope {
  error?: { code?: unknown; message?: unknown }
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let code = `HTTP_${response.status}`
  let message = response.statusText || `Request failed (${response.status})`
  let details: unknown

  try {
    const data: unknown = await response.json()
    if (typeof data === "object" && data !== null && "error" in data) {
      const envelope = data as BackendErrorEnvelope
      const err = envelope.error
      if (err && typeof err === "object") {
        if (typeof err.code === "string") code = err.code
        if (typeof err.message === "string") message = err.message
      }
      details = data
    }
  } catch {
    // Non-JSON error body; keep defaults.
  }

  return new ApiError(response.status, message, code, details)
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const abortFromExternal = () => controller.abort()
  signal?.addEventListener("abort", abortFromExternal)

  try {
    let response: Response
    try {
      response = await fetch(buildUrl(path, params), {
        method,
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        credentials: "include",
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
    } catch (error) {
      throw new ApiError(
        0,
        "Could not reach the Blaze Hammer backend.",
        "NETWORK_ERROR",
        error
      )
    }

    if (!response.ok) {
      const apiError = await parseErrorResponse(response)
      if (apiError.status === 401 && onUnauthorized) {
        onUnauthorized(apiError)
      }
      throw apiError
    }

    if (response.status === 204) {
      return undefined as T
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener("abort", abortFromExternal)
  }
}

export const api = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, options)
  },
  post<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, options)
  },
  del<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, options)
  },
}
