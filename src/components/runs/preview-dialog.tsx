import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { RunOverridesFields } from "@/components/runs/run-overrides-fields"
import { useRunForm } from "@/components/runs/use-run-form"
import { usePreview } from "@/features/preview/hooks"
import { buildRunRequestBody } from "@/features/runs/run-form"
import type { PreviewPlan, PreviewResponse } from "@/types/api"
import { JsonBlock } from "@/components/common/json-block"
import { RequestBodyViewer } from "@/components/body/request-body-viewer"
import { Badge } from "@/components/ui/badge"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

const PREVIEW_COUNTS = [1, 3, 5, 10, 15, 20] as const

interface PreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PlanCard({
  plan,
  defaultOpen = false,
}: {
  plan: PreviewPlan
  defaultOpen?: boolean
}) {
  const [expanded, setExpanded] = React.useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-md border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <Badge variant="outline" className="font-mono">
          #{plan.index}
        </Badge>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
          {plan.method}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {plan.url}
        </span>
        {expanded ? (
          <ChevronUpIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <ChevronDownIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 border-t p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Headers
            </span>
          </div>
          <JsonBlock value={plan.headers} maxHeightClass="max-h-48" />
          <span className="mt-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Body
          </span>
          <RequestBodyViewer body={plan.body} postType={plan.post_type} />
        </div>
      )}
    </div>
  )
}

/** POST /api/v1/preview — backend resolves all placeholders. */
export function PreviewDialog({ open, onOpenChange }: PreviewDialogProps) {
  const { form, config, templates } = useRunForm(open)
  const preview = usePreview()
  const [count, setCount] = React.useState(3)
  const [result, setResult] = React.useState<PreviewResponse | null>(null)
  const [allExpanded, setAllExpanded] = React.useState(true)

  const handleOpenChange = (next: boolean) => {
    if (!next) setResult(null)
    onOpenChange(next)
  }

  const submit = form.handleSubmit((values) => {
    const body = buildRunRequestBody(values, { count })
    preview.mutate(body, {
      onSuccess: (data) => setResult(data),
    })
  })

  const loadingDefaults = open && (config.isPending || templates.isPending)
  const plans = result?.plans ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !preview.isPending && handleOpenChange(next)}
    >
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Preview requests</DialogTitle>
          <DialogDescription>
            The backend resolves Faker and placeholder values — this is exactly
            what a run would send.
          </DialogDescription>
        </DialogHeader>

        {loadingDefaults ? (
          <div className="flex items-center justify-center py-16 font-mono text-xs text-muted-foreground">
            Loading configuration…
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4 flex items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="preview-count">Count</Label>
                  <Select
                    value={String(count)}
                    onValueChange={(value) => {
                      const parsed = Number(value)
                      setCount(Number.isFinite(parsed) ? parsed : 3)
                    }}
                  >
                    <SelectTrigger id="preview-count" className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PREVIEW_COUNTS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => void submit()}
                  disabled={preview.isPending}
                >
                  {preview.isPending ? "Generating…" : "Generate"}
                </Button>
                {plans.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setAllExpanded((v) => !v)}
                  >
                    {allExpanded ? "Collapse all" : "Expand all"}
                  </Button>
                )}
              </div>

              {result && plans.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No plans returned.
                </p>
              )}

              {!result && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Configure overrides below and generate a preview.
                </p>
              )}

              {plans.length > 0 && (
                <div className="flex flex-col gap-2">
                  {plans.map((plan) => (
                    <PlanCard
                      // Remount on bulk expand/collapse to apply the new default.
                      key={`${plan.index}-${allExpanded ? "open" : "closed"}`}
                      plan={plan}
                      defaultOpen={allExpanded}
                    />
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="max-h-[38dvh] overflow-y-auto px-6 pt-4 pb-1">
              <RunOverridesFields form={form} />
            </div>

            <DialogFooter className="px-6 py-4">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
