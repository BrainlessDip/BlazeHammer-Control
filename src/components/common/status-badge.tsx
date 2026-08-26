import { cn } from "@/lib/utils"

export type RunStatusKind =
  | "running"
  | "completed"
  | "stopped"
  | "failed"
  | "error"
  | "unknown"

function runStatusKind(status: string | null | undefined): RunStatusKind {
  switch (status) {
    case "running":
    case "completed":
    case "stopped":
      return status
    case "failed":
    case "error":
      return status === "failed" ? "failed" : "error"
    default:
      return "unknown"
  }
}

const STYLES: Record<RunStatusKind, { dot: string; label: string; badge: string }> = {
  running: {
    dot: "bg-primary",
    label: "Running",
    badge:
      "border-primary/30 bg-primary/10 text-primary dark:border-primary/40",
  },
  completed: {
    dot: "bg-success",
    label: "Completed",
    badge:
      "border-success/30 bg-success/10 text-success dark:border-success/40",
  },
  stopped: {
    dot: "bg-muted-foreground",
    label: "Stopped",
    badge: "border-border bg-muted text-muted-foreground",
  },
  failed: {
    dot: "bg-destructive",
    label: "Failed",
    badge:
      "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40",
  },
  error: {
    dot: "bg-destructive",
    label: "Error",
    badge:
      "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40",
  },
  unknown: {
    dot: "bg-muted-foreground",
    label: "Unknown",
    badge: "border-border bg-muted text-muted-foreground",
  },
}

interface StatusBadgeProps {
  status: string | null | undefined
  className?: string
}

/** Subtle status pill with an always-visible dot + text (not color-only). */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const kind = runStatusKind(status)
  const style = STYLES[kind]
  const isRunning = kind === "running"

  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-md border px-1.5 py-0 font-mono text-[11px] font-medium tracking-wide whitespace-nowrap",
        style.badge,
        className
      )}
    >
      <span className="relative flex size-1.5 items-center justify-center">
        <span className={cn("size-1.5 rounded-full", style.dot)} />
        {isRunning && (
          <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-primary opacity-60" />
        )}
      </span>
      {style.label}
    </span>
  )
}
