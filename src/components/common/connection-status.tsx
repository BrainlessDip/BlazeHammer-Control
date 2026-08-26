import { cn } from "@/lib/utils"
import type { WsConnectionState } from "@/lib/websocket"
import { useWebSocket } from "@/hooks/use-websocket"

const STATES: Record<
  WsConnectionState,
  { label: string; dot: string; text: string } | null
> = {
  connected: {
    label: "Connected",
    dot: "bg-success",
    text: "text-success",
  },
  reconnecting: {
    label: "Reconnecting…",
    dot: "bg-warning animate-pulse",
    text: "text-warning",
  },
  connecting: {
    label: "Connecting…",
    dot: "bg-warning animate-pulse",
    text: "text-warning",
  },
  disconnected: {
    label: "Disconnected",
    dot: "bg-destructive",
    text: "text-destructive",
  },
  idle: null,
}

interface ConnectionStatusProps {
  status: WsConnectionState
  /** Hide the text label (dot-only, still accessible via aria-label). */
  showLabel?: boolean
  className?: string
}

export function ConnectionStatus({
  status,
  showLabel = true,
  className,
}: ConnectionStatusProps) {
  const state = STATES[status] ?? STATES.idle

  if (!state) {
    // Not yet determined (boot): render placeholder to avoid layout shift.
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground",
          !showLabel && "sr-only",
          className
        )}
        aria-hidden="true"
      >
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
        —
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs",
        state.text,
        className
      )}
      role="status"
      aria-label={`WebSocket ${state.label}`}
    >
      <span className="relative flex size-1.5">
        <span className={cn("size-1.5 rounded-full", state.dot)} />
        {(status === "reconnecting" || status === "connecting") && (
          <span className="absolute size-1.5 animate-ping rounded-full bg-warning/70" />
        )}
      </span>
      {showLabel && state.label}
    </span>
  )
}

/** Context-connected status indicator for use anywhere in the app shell. */
export function WebSocketStatus(
  props: Omit<ConnectionStatusProps, "status">
) {
  const { status } = useWebSocket()
  return <ConnectionStatus status={status} {...props} />
}
