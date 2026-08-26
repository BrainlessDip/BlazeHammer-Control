import { CheckIcon, CloudUploadIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type SavePhase = "idle" | "saving" | "saved" | "error"

interface SaveButtonProps {
  dirty: boolean
  phase: SavePhase
  disabled?: boolean
  errorMessage?: string
  onSave: () => void
}

/**
 * The single save affordance. Communicates state explicitly instead of
 * being permanently enabled:
 *
 *   Saved → Save changes → Saving… → ✓ Saved / ⚠ Save failed
 */
export function SaveButton({
  dirty,
  phase,
  disabled = false,
  errorMessage,
  onSave,
}: SaveButtonProps) {
  const saving = phase === "saving"
  const justSaved = phase === "saved"
  const failed = phase === "error"
  const actionable = dirty && !saving && !justSaved && !disabled

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="sm"
            variant={
              failed ? "destructive" : justSaved ? "secondary" : actionable ? "default" : "outline"
            }
            disabled={!actionable}
            onClick={onSave}
            className="gap-1.5 font-mono text-xs"
          >
            {saving && <RotateCwIcon className="animate-spin" aria-hidden="true" />}
            {justSaved && <CheckIcon className="text-success" aria-hidden="true" />}
            {failed && <TriangleAlertIcon aria-hidden="true" />}
            {!saving && !justSaved && !failed && (
              <CloudUploadIcon aria-hidden="true" />
            )}
            {saving
              ? "Saving…"
              : justSaved
                ? "Saved"
                : failed
                  ? "Save failed"
                  : dirty
                    ? "Save changes"
                    : "Saved"}
          </Button>
        }
      >
        <TooltipContent>
          {failed
            ? (errorMessage ?? "Save failed — your edits are kept")
            : actionable
              ? "Save (Ctrl+S)"
              : dirty
                ? "Fix JSON errors before saving"
                : "No unsaved changes"}
        </TooltipContent>
      </TooltipTrigger>
    </Tooltip>
  )
}
