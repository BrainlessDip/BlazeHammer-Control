/**
 * WebSocket service for the Blaze Hammer event stream.
 *
 * Owns connection lifecycle, authentication-aware reconnection, heartbeat,
 * and frame parsing. Emits typed events to a single consumer (the React
 * provider) which fans them out to query-cache updates and UI state.
 *
 * The service never touches React or TanStack Query directly.
 */

import { parseWsEvent, type WsEvent } from "@/types/ws"

export type WsConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"

export interface WebSocketServiceCallbacks {
  onEvent: (event: WsEvent) => void
  onStateChange: (state: WsConnectionState) => void
}

const HEARTBEAT_INTERVAL_MS = 25_000
/** If nothing arrives for two heartbeat intervals, force a reconnect. */
const STALE_THRESHOLD_MS = HEARTBEAT_INTERVAL_MS * 2
const MAX_BACKOFF_MS = 15_000
const BASE_BACKOFF_MS = 1_000

/** Close codes meaning the session is gone; reconnecting cannot fix these. */
const AUTH_CLOSE_CODES = new Set([4401, 4402])

function computeBackoff(attempt: number): number {
  const exponential = Math.min(
    MAX_BACKOFF_MS,
    BASE_BACKOFF_MS * Math.pow(2, attempt)
  )
  // Add jitter so multiple clients don't sync their retries.
  return exponential / 2 + Math.random() * (exponential / 2)
}

export class WebSocketService {
  private readonly url: string
  private readonly callbacks: WebSocketServiceCallbacks

  private socket: WebSocket | null = null
  private state: WsConnectionState = "idle"
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private lastMessageAt = 0
  private manuallyClosed = false

  constructor(url: string, callbacks: WebSocketServiceCallbacks) {
    this.url = url
    this.callbacks = callbacks
  }

  getState(): WsConnectionState {
    return this.state
  }

  connect(): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    this.manuallyClosed = false
    this.clearReconnectTimer()
    this.setState(
      this.reconnectAttempt > 0 ? "reconnecting" : "connecting"
    )

    let socket: WebSocket
    try {
      socket = new WebSocket(this.url)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.socket = socket

    socket.onopen = () => {
      if (this.socket !== socket) return
      this.reconnectAttempt = 0
      this.lastMessageAt = Date.now()
      this.setState("connected")
      this.startHeartbeat()
    }

    socket.onmessage = (event: MessageEvent) => {
      if (this.socket !== socket) return
      this.lastMessageAt = Date.now()
      if (typeof event.data !== "string") return
      const wsEvent = parseWsEvent(event.data)
      this.callbacks.onEvent(wsEvent)
    }

    socket.onerror = () => {
      // The close event follows; nothing to do here.
    }

    socket.onclose = (event: CloseEvent) => {
      if (this.socket !== socket) return
      this.stopHeartbeat()
      this.socket = null

      if (AUTH_CLOSE_CODES.has(event.code)) {
        // Session invalid/expired: surface it and stop retrying until the
        // user authenticates again (login triggers connect()). The backend
        // also sends an auth.expired message before close 4402.
        this.manuallyClosed = true
        this.setState("disconnected")
        this.callbacks.onEvent({ type: "auth.expired" })
        return
      }

      if (this.manuallyClosed) {
        this.setState("disconnected")
        return
      }

      this.scheduleReconnect()
    }
  }

  disconnect(): void {
    this.manuallyClosed = true
    this.clearReconnectTimer()
    this.stopHeartbeat()
    if (this.socket) {
      const socket = this.socket
      this.socket = null
      try {
        socket.close(1000, "client disconnect")
      } catch {
        // Already closing/closed.
      }
    }
    this.setState("disconnected")
  }

  /** Manual reconnect: resets backoff and connects immediately. */
  reconnect(): void {
    this.disconnect()
    this.manuallyClosed = false
    this.reconnectAttempt = 0
    this.connect()
  }

  sendText(data: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(data)
      } catch {
        // Ignore transient send failures; heartbeat/reconnect handles liveness.
      }
    }
  }

  private setState(state: WsConnectionState): void {
    if (this.state === state) return
    this.state = state
    this.callbacks.onStateChange(state)
  }

  private scheduleReconnect(): void {
    if (this.manuallyClosed) return
    this.setState("reconnecting")
    const delay = computeBackoff(this.reconnectAttempt)
    this.reconnectAttempt += 1
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
      if (Date.now() - this.lastMessageAt > STALE_THRESHOLD_MS) {
        // Connection looks dead (no traffic): force-close to trigger reconnect.
        try {
          this.socket.close()
        } catch {
          // Ignore.
        }
        return
      }
      this.sendText("ping") // Backend replies with {"type":"pong"}.
    }, HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
