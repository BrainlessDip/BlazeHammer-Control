import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { TemplateKind } from "@/hooks/use-template-editor"
import type { TemplateErrorDetails } from "@/types/api"

interface ConflictDialogProps {
  open: boolean
  kindLabel: string
  details: TemplateErrorDetails | null
  onReloadRemote: () => void
  onKeepMine: () => void
  onCancel: () => void
}

export interface ConflictActions {
  reloadKind: (kind: TemplateKind) => void
  keepMine: () => void
}

/**
 * Optimistic-concurrency resolution. Never overwrites anything silently:
 * the user either adopts the remote version or explicitly re-saves their own.
 */
export function ConflictDialog({
  open,
  kindLabel,
  details,
  onReloadRemote,
  onKeepMine,
  onCancel,
}: ConflictDialogProps) {
  const current = details?.current_revision
    ? ` (${details.current_revision.slice(0, 12)}…)`
    : ""

  return (
    <AlertDialog open={open}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{kindLabel} changed externally</AlertDialogTitle>
          <AlertDialogDescription>
            The {kindLabel.toLowerCase()} file was modified after you loaded it
            {current ? "" : "."} Your local edits are still intact and were not
            written to disk.
            <br />
            <br />
            Reload to adopt the remote version, or keep your changes and save
            again to intentionally overwrite it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-start">
          <Button variant="default" size="sm" onClick={onReloadRemote}>
            Reload remote version
          </Button>
          <Button variant="outline" size="sm" onClick={onKeepMine}>
            Keep my changes
          </Button>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
