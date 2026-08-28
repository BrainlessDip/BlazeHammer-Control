/**
 * Connection context and provider.
 *
 * Manages the full backend-connection lifecycle:
 * - Reads `?host=` query parameter and localStorage on mount
 * - Tests backend health via fetch()
 * - Gates app rendering until a backend is confirmed reachable
 * - Provides connect / disconnect / reconnect / changeBackend actions
 * - Integrates with the runtime URL override in connection-store
 */
/* eslint-disable react-refresh/only-export-components -- exports both component and hook */

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import {
  clearSavedBackendUrl,
  deriveApiBaseUrl,
  deriveWsUrlFromBackend,
  displayBackendUrl,
  loadSavedBackendUrl,
  normalizeBackendUrl,
  saveBackendUrl,
  setRuntimeBackendUrl,
  testBackendConnection,
  type ConnectionTestResult,
} from "@/lib/connection-store"
import { ONLY_USER_URL } from "@/app/config"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionStatus =
  | "idle"
  | "testing"
  | "connected"
  | "failed"
  | "disconnected"

export interface ConnectionContextValue {
  /** The confirmed backend URL, or null if using same-origin proxy. */
  backendUrl: string | null
  /** Derived API base URL (empty string = proxy mode). */
  apiBaseUrl: string
  /** Derived WebSocket URL. */
  wsUrl: string
  /** Human-readable backend display. */
  displayUrl: string
  /** Current connection status. */
  status: ConnectionStatus
  /** Error message when status is "failed". */
  error: string | null
  /** Whether CORS was detected as the likely failure cause. */
  corsBlocked: boolean
  /** Whether the initial auto-connect probe is still running. */
  isInitializing: boolean
  /** Whether we're connected (status === "connected"). */
  isConnected: boolean
  /** Whether a URL was successfully tested (but not yet connected). */
  isTested: boolean

  /** Test a candidate backend URL. */
  testConnection(url: string): Promise<ConnectionTestResult>
  /** Accept a tested URL as the active backend. */
  connect(url: string): void
  /** Disconnect from the current backend. */
  disconnect(): void
  /** Alias for disconnect + reconnect flow. */
  reconnect(): void
  /** Change to a new backend URL (test + connect). */
  changeBackend(url: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ConnectionContext = React.createContext<ConnectionContextValue | null>(null)

export function useConnection(): ConnectionContextValue {
  const ctx = React.useContext(ConnectionContext)
  if (!ctx) {
    throw new Error("useConnection must be used within <ConnectionProvider>")
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ConnectionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const queryClient = useQueryClient()

  const [backendUrl, setBackendUrlState] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<ConnectionStatus>("idle")
  const [error, setError] = React.useState<string | null>(null)
  const [corsBlocked, setCorsBlocked] = React.useState(false)
  const [isInitializing, setIsInitializing] = React.useState(true)
  const [isTested, setIsTested] = React.useState(false)

  const testUrlRef = React.useRef<string | null>(null)

  // Derived values
  const apiBaseUrl = deriveApiBaseUrl(backendUrl)
  const wsUrl = deriveWsUrlFromBackend(backendUrl)
  const displayUrl = displayBackendUrl(backendUrl)
  const isConnected = status === "connected"

  // ---- Test a candidate URL ----
  const testConnection = React.useCallback(
    async (url: string): Promise<ConnectionTestResult> => {
      setStatus("testing")
      setError(null)
      setCorsBlocked(false)
      setIsTested(false)
      testUrlRef.current = url

      const result = await testBackendConnection(url)

      // Ignore stale results
      if (testUrlRef.current !== url) return result

      if (result.ok) {
        // Mark as tested but DON'T set "connected" — only connect() does that
        setIsTested(true)
        setError(null)
        setCorsBlocked(false)
      } else {
        setStatus("failed")
        setIsTested(false)
        setError(result.error ?? "Connection failed")
        setCorsBlocked(result.corsBlocked ?? false)
      }

      return result
    },
    [],
  )

  // ---- Accept a URL as the active backend ----
  const connect = React.useCallback(
    (url: string) => {
      const normalized = normalizeBackendUrl(url)
      setBackendUrlState(normalized)
      setRuntimeBackendUrl(normalized)
      saveBackendUrl(normalized)
      setStatus("connected")
      setIsTested(false)
      setError(null)
      setCorsBlocked(false)
      void queryClient.invalidateQueries()
    },
    [queryClient],
  )

  // ---- Disconnect ----
  const disconnect = React.useCallback(() => {
    setBackendUrlState(null)
    setRuntimeBackendUrl(null)
    clearSavedBackendUrl()
    setStatus("disconnected")
    setError(null)
    setCorsBlocked(false)
    void queryClient.clear()
  }, [queryClient])

  // ---- Reconnect ----
  const reconnect = React.useCallback(() => {
    disconnect()
    setIsInitializing(true)
  }, [disconnect])

  // ---- Change to a new backend ----
  const changeBackend = React.useCallback(
    async (url: string) => {
      const result = await testConnection(url)
      if (result.ok) {
        connect(url)
      }
    },
    [testConnection, connect],
  )

  // ---- Bootstrap: resolve backend URL on mount ----
  React.useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      // Priority: ?host= (base64) > localStorage > default (null = proxy)
      const params = new URLSearchParams(window.location.search)
      const hostParam = params.get("host")
      const savedUrl = loadSavedBackendUrl()

      let candidate: string | null = null
      let autoConnect = false

      if (hostParam) {
        // Clean the query parameter immediately
        try {
          const cleanUrl = new URL(window.location.href)
          cleanUrl.searchParams.delete("host")
          window.history.replaceState(
            {},
            "",
            cleanUrl.pathname + cleanUrl.hash,
          )
        } catch {
          // Ignore — non-critical.
        }

        // Decode base64-encoded URL from the ?host= param
        try {
          const decoded = atob(hostParam)
          candidate = normalizeBackendUrl(decoded)
          autoConnect = false // let user review and click Connect
          saveBackendUrl(candidate)
        } catch {
          if (!cancelled) {
            setStatus("failed")
            setError(`Invalid host URL (could not decode): ${hostParam}`)
            setIsInitializing(false)
          }
          return
        }
      } else if (savedUrl) {
        candidate = savedUrl
        autoConnect = true
      }

      if (!cancelled && candidate) {
        setBackendUrlState(candidate)
        setRuntimeBackendUrl(candidate)
      }

      if (candidate && autoConnect) {
        // Auto-connect: test the candidate and connect if reachable
        const result = await testBackendConnection(candidate)
        if (cancelled) return

        if (result.ok) {
          setBackendUrlState(candidate)
          setRuntimeBackendUrl(candidate)
          saveBackendUrl(candidate)
          setStatus("connected")
          setError(null)
          setCorsBlocked(false)
        } else {
          setRuntimeBackendUrl(null)
          setStatus("failed")
          setError(result.error ?? "Connection failed")
          setCorsBlocked(result.corsBlocked ?? false)
        }
      } else if (!candidate && !ONLY_USER_URL) {
        // Proxy mode: no URL to test, assume reachable
        setRuntimeBackendUrl(null)
        setStatus("connected")
        setError(null)
      }
      // else: ?host= param or ONLY_USER_URL with no saved URL → modal will appear

      setIsInitializing(false)
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  const value = React.useMemo<ConnectionContextValue>(
    () => ({
      backendUrl,
      apiBaseUrl,
      wsUrl,
      displayUrl,
      status,
      error,
      corsBlocked,
      isInitializing,
      isConnected,
      isTested,
      testConnection,
      connect,
      disconnect,
      reconnect,
      changeBackend,
    }),
    [
      backendUrl,
      apiBaseUrl,
      wsUrl,
      displayUrl,
      status,
      error,
      corsBlocked,
      isInitializing,
      isConnected,
      isTested,
      testConnection,
      connect,
      disconnect,
      reconnect,
      changeBackend,
    ],
  )

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  )
}
