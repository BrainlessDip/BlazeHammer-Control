/**
 * React binding for the WebSocket service.
 *
 * - Owns a single WebSocketService instance per app.
 * - Connects when authenticated, disconnects when not.
 * - Routes events into targeted TanStack Query cache updates (the bridge)
 *   and connection-transition toasts.
 * - Exposes status + manual controls via context, and per-component event
 *   subscriptions via useWsEvent().
 */
/* eslint-disable react-refresh/only-export-components */

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { WS_URL } from "@/app/config"
import { useMe } from "@/features/auth/hooks"
import { redirectToLogin } from "@/lib/auth-redirect"
import { qk } from "@/lib/query-keys"
import {
  WebSocketService,
  type WsConnectionState,
} from "@/lib/websocket"
import type { RunLogEntry, RunLogResponse, RunWithStats } from "@/types/api"
import {
  extractLiveStats,
  type WsEvent,
} from "@/types/ws"

type WsListener = (event: WsEvent) => void

interface WebSocketContextValue {
  status: WsConnectionState
  reconnect: () => void
  disconnect: () => void
  subscribe: (listener: WsListener) => () => void
}

const WebSocketContext = React.createContext<WebSocketContextValue | null>(
  null
)

const LOG_BUFFER_CAP = 200

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

/** Appends a provisional log entry from request.completed (dedup by index). */
function appendProvisionalLog(
  queryClient: ReturnType<typeof useQueryClient>,
  event: Extract<WsEvent, { type: "request.completed" }>
) {
  const runId = asString(event.run_id)
  if (!runId || typeof event.index !== "number") return

  const entry: RunLogEntry = {
    index: event.index,
    ok: event.ok ?? false,
    status: event.status ?? 0,
    latency_ms: event.latency_ms ?? 0,
    attempts: 1,
    ts: Date.now(),
    ...(typeof event.error_category === "string"
      ? { error_category: event.error_category }
      : {}),
  }

  queryClient.setQueryData<RunLogResponse>(qk.runLog(runId), (prev) => {
    if (!prev) return prev // Not fetched yet; polling reconciles later.
    if (prev.entries.some((existing) => existing.index === entry.index)) {
      return prev
    }
    return { entries: [...prev.entries, entry].slice(-LOG_BUFFER_CAP) }
  })
}

/** Bridges WS events into TanStack Query caches. Targeted, no global refetch. */
function applyWsEvent(
  queryClient: ReturnType<typeof useQueryClient>,
  event: WsEvent
) {
  // Frames are defensively shaped: the union includes a catch-all member,
  // so every field is re-validated before use.
  const runId = asString((event as Record<string, unknown>).run_id)

  switch (event.type) {
    case "hello": {
      // Fresh session/reconnect: reconcile run history.
      void queryClient.invalidateQueries({ queryKey: qk.runs })
      break
    }

    case "run.started": {
      void queryClient.invalidateQueries({ queryKey: qk.runs })
      if (runId) {
        void queryClient.invalidateQueries({ queryKey: qk.run(runId) })
      }
      break
    }

    case "stats.updated": {
      if (!runId) break
      const stats = extractLiveStats(event as Record<string, unknown>)
      queryClient.setQueryData<RunWithStats>(qk.run(runId), (prev) =>
        prev ? { ...prev, stats } : prev
      )
      break
    }

    case "request.completed": {
      if (event.index !== undefined || event.seq !== undefined) {
        appendProvisionalLog(
          queryClient,
          event as Extract<WsEvent, { type: "request.completed" }>
        )
      }
      break
    }

    case "run.completed":
    case "run.stopped": {
      const status = event.type === "run.completed" ? "completed" : "stopped"
      const stats = extractLiveStats(event as Record<string, unknown>)
      if (runId) {
        queryClient.setQueryData<RunWithStats>(qk.run(runId), (prev) =>
          prev ? { ...prev, status, stats } : prev
        )
        void queryClient.invalidateQueries({ queryKey: qk.run(runId) })
        void queryClient.invalidateQueries({ queryKey: qk.runLog(runId) })
      }
      void queryClient.invalidateQueries({ queryKey: qk.runs })
      break
    }

    case "run.error": {
      const message = asString(event.message)
      if (runId) {
        queryClient.setQueryData<RunWithStats>(qk.run(runId), (prev) =>
          prev ? { ...prev, status: "error", error: message ?? prev.error } : prev
        )
        void queryClient.invalidateQueries({ queryKey: qk.runLog(runId) })
      }
      void queryClient.invalidateQueries({ queryKey: qk.runs })
      toast.error("Run failed", {
        description: message ?? "The backend reported a run error.",
      })
      break
    }

    case "auth.expired": {
      toast.warning("Session expired", {
        description: "Please sign in again.",
      })
      queryClient.clear()
      redirectToLogin()
      break
    }

    case "placeholder.catalog":
    case "placeholder.catalog.updated": {
      // Editor metadata refresh: swap the cached catalog wholesale.
      const { type: _type, ...catalog } = event as Record<string, unknown>
      void _type
      if (typeof catalog.version === "number") {
        queryClient.setQueryData(qk.catalog, catalog)
      }
      break
    }

    default:
      // Unknown or protocol-level frames (pong etc.) are safely ignored.
      break
  }
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const me = useMe()
  const authenticated = me.isSuccess

  const serviceRef = React.useRef<WebSocketService | null>(null)
  const listenersRef = React.useRef(new Set<WsListener>())
  const stateRef = React.useRef<WsConnectionState>("idle")
  const everConnectedRef = React.useRef(false)
  const [status, setStatus] = React.useState<WsConnectionState>("idle")

  React.useEffect(() => {
    const service = new WebSocketService(WS_URL, {
      onEvent: (event) => {
        applyWsEvent(queryClient, event)
        for (const listener of listenersRef.current) {
          try {
            listener(event)
          } catch {
            // Listener errors must never break the socket pipeline.
          }
        }
      },
      onStateChange: (next) => {
        const prev = stateRef.current
        stateRef.current = next
        setStatus(next)

        if (next === "connected") {
          if (everConnectedRef.current && prev !== "idle") {
            toast.success("Connection restored")
          }
          everConnectedRef.current = true
        } else if (
          prev === "connected" &&
          next === "reconnecting"
        ) {
          toast.warning("WebSocket connection lost", {
            description: "Attempting to reconnect…",
          })
        }
      },
    })
    serviceRef.current = service
    return () => {
      service.disconnect()
      serviceRef.current = null
    }
  }, [queryClient])

  React.useEffect(() => {
    const service = serviceRef.current
    if (!service) return
    if (authenticated) {
      service.connect()
    } else {
      service.disconnect()
    }
  }, [authenticated])

  const reconnect = React.useCallback(() => {
    serviceRef.current?.reconnect()
  }, [])

  const disconnect = React.useCallback(() => {
    serviceRef.current?.disconnect()
  }, [])

  const subscribe = React.useCallback((listener: WsListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const value = React.useMemo<WebSocketContextValue>(
    () => ({ status, reconnect, disconnect, subscribe }),
    [status, reconnect, disconnect, subscribe]
  )

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = React.useContext(WebSocketContext)
  if (!ctx) {
    throw new Error("useWebSocket must be used within <WebSocketProvider>")
  }
  return ctx
}

/** Subscribes a component to individual WebSocket events. */
export function useWsEvent(listener: WsListener) {
  const { subscribe } = useWebSocket()
  const ref = React.useRef(listener)
  React.useInsertionEffect(() => {
    ref.current = listener
  })
  React.useEffect(() => {
    return subscribe((event) => ref.current(event))
  }, [subscribe])
}
