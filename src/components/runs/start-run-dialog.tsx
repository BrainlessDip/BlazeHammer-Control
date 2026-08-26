import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { RunOverridesFields } from "@/components/runs/run-overrides-fields"
import { useRunForm } from "@/components/runs/use-run-form"
import { buildRunRequestBody } from "@/features/runs/run-form"
import { useStartRun } from "@/features/runs/hooks"
import type { RunStartRequest } from "@/types/api"

interface StartRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** POST /api/v1/runs with exact RunStartRequest semantics. */
export function StartRunDialog({ open, onOpenChange }: StartRunDialogProps) {
  const { form, config, templates } = useRunForm(open)
  const startRun = useStartRun()
  const navigate = useNavigate()

  const submit = form.handleSubmit((values) => {
    const body = buildRunRequestBody(values)
    startRun.mutate(body as RunStartRequest, {
      onSuccess: (run) => {
        onOpenChange(false)
        if (run?.run_id) void navigate(`/runs/${encodeURIComponent(run.run_id)}`)
      },
    })
  })

  const loadingDefaults = open && (config.isPending || templates.isPending)

  return (
    <Dialog open={open} onOpenChange={(next) => !startRun.isPending && onOpenChange(next)}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Start run</DialogTitle>
          <DialogDescription>
            Single-run overrides. Saved configuration is not modified.
          </DialogDescription>
        </DialogHeader>

        {loadingDefaults ? (
          <div className="flex items-center justify-center py-16 font-mono text-xs text-muted-foreground">
            Loading configuration…
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <RunOverridesFields form={form} />
            </div>

            <Separator className="shrink-0" />

            <DialogFooter className="shrink-0 px-6 py-4">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={startRun.isPending}
              >
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={startRun.isPending}>
                {startRun.isPending ? "Starting…" : "Start Run"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
