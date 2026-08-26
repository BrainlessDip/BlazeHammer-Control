import { cn } from "@/lib/utils"
import { maskSensitiveObject } from "@/lib/redact"

interface JsonViewerProps {
  value: unknown
  className?: string
  /** Mask values whose keys look sensitive (default: true). */
  mask?: boolean
  maxHeightClass?: string
}

function stringify(value: unknown): string {
  if (value === undefined) return "—"
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** Read-only pretty JSON block with monospace typography. */
export function JsonViewer({
  value,
  className,
  mask = true,
  maxHeightClass,
}: JsonViewerProps) {
  const display =
    mask && value && typeof value === "object" && !Array.isArray(value)
      ? maskSensitiveObject(value as Record<string, unknown>)
      : value

  return (
    <pre
      className={cn(
        "overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground/90",
        maxHeightClass,
        className
      )}
    >
      {stringify(display)}
    </pre>
  )
}
