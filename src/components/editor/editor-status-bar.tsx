import { CheckCircle2, CircleX, CloudUpload } from "lucide-react"

import type { JsonCheckResult } from "@/lib/json-check"
import type { SavePhase } from "@/components/editor/save-button"

interface EditorStatusBarProps {
  kind: "payload" | "headers"
  json: JsonCheckResult
  lineCount: number
  dirty: boolean
  savePhase: SavePhase
}

/** Subtle VS Code-style strip under the editor. */
export function EditorStatusBar({
  kind,
  json,
  lineCount,
  dirty,
  savePhase,
}: EditorStatusBarProps) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t bg-muted/40 px-3 font-mono text-[11px] text-muted-foreground">
      {json.ok ? (
        <span className="inline-flex items-center gap-1 text-success" role="status" aria-label="JSON valid">
          <CheckCircle2 className="size-3" aria-hidden="true" />
          JSON ✓
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1 text-destructive"
          role="alert"
          title={`${json.message} (line ${json.line}, column ${json.column})`}
        >
          <CircleX className="size-3" aria-hidden="true" />
          JSON ✕ {json.line}:{json.column}
        </span>
      )}

      <span aria-hidden="true">·</span>
      <span>{lineCount.toLocaleString()} lines</span>
      <span aria-hidden="true">·</span>
      <span>UTF-8</span>
      <span aria-hidden="true">·</span>
      <span className="capitalize">{kind}</span>

      <span className="ml-auto inline-flex items-center gap-1.5">
        {dirty && savePhase !== "saving" && (
          <span className="inline-flex items-center gap-1 text-warning">
            <CloudUpload className="size-3 rotate-180" aria-hidden="true" />
            Unsaved changes
          </span>
        )}
        {!dirty && savePhase === "saved" && (
          <span className="text-success">Saved just now</span>
        )}
        {!dirty && savePhase !== "saved" && <span>Saved</span>}
      </span>
    </div>
  )
}
