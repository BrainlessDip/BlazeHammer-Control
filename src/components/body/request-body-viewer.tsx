/**
 * RequestBodyViewer — renders a request body in log/details views.
 *
 * Handles all post_type values gracefully, including null/undefined.
 * Used in RunDetails, RunLogPanel request details sheet, and WebSocket events.
 */

import { JsonBlock } from "@/components/common/json-block"
import { FileIcon } from "lucide-react"

interface RequestBodyViewerProps {
  body: unknown
  postType?: string | null
}

export function RequestBodyViewer({ body, postType }: RequestBodyViewerProps) {
  // Null / undefined / empty
  if (body === null || body === undefined) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        {postType === "none" ? "No request body" : "—"}
      </p>
    )
  }

  // String body (raw, XML, HTML, or serialized JSON)
  if (typeof body === "string") {
    if (!body.trim()) {
      return (
        <p className="font-mono text-xs text-muted-foreground">
          Empty body
        </p>
      )
    }

    // Try to detect JSON strings
    if (postType === "json" || looksLikeJson(body)) {
      return <JsonBlock value={body} maxHeightClass="max-h-64" />
    }

    // Raw / XML / HTML
    return (
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
        {body}
      </pre>
    )
  }

  // Binary metadata
  if (postType === "binary") {
    const meta = body as Record<string, unknown>
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
        <FileIcon className="size-4 shrink-0" />
        <span>
          Binary payload
          {typeof meta.size === "number" && ` (${formatBytes(meta.size)})`}
          {typeof meta.filename === "string" && ` — ${meta.filename}`}
        </span>
      </div>
    )
  }

  // Object / array — render as JSON
  return <JsonBlock value={body} maxHeightClass="max-h-64" />
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function looksLikeJson(str: string): boolean {
  const trimmed = str.trim()
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}
