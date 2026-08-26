import * as React from "react"
import { AlertCircleIcon, CircleCheckIcon } from "lucide-react"

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { RunOverridesFields } from "@/components/runs/run-overrides-fields"
import { useRunForm } from "@/components/runs/use-run-form"
import { useValidateRequest } from "@/features/preview/hooks"
import { buildRunRequestBody } from "@/features/runs/run-form"
import type { ValidationIssue, ValidationResponse } from "@/types/api"

interface ValidateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function IssueItem({ issue }: { issue: ValidationIssue }) {
  const suggestions = issue.suggestions
    ? issue.suggestions.split("|").map((s) => s.trim()).filter(Boolean)
    : []

  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-destructive">
          <AlertCircleIcon className="size-3.5" aria-hidden="true" />
          {issue.problem ?? "Problem"}
        </span>
        {issue.location && (
          <Badge variant="outline" className="font-mono text-[10px]">
            {issue.location}
          </Badge>
        )}
      </div>
      {issue.message && (
        <p className="text-sm text-foreground/90">{issue.message}</p>
      )}
      {issue.token && (
        <p className="font-mono text-xs text-muted-foreground">
          token: <span className="text-foreground/80">{issue.token}</span>
        </p>
      )}
      {suggestions.length > 0 && (
        <div className="mt-0.5 rounded-sm border-l-2 border-success/60 bg-success/5 px-2.5 py-1.5">
          <p className="font-mono text-[11px] tracking-widest text-success uppercase">
            Suggestion
          </p>
          <ul className="mt-0.5 list-inside list-disc">
            {suggestions.map((s) => (
              <li key={s} className="font-mono text-xs">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ResultView({ result }: { result: ValidationResponse }) {
  const allIssues = [...(result.errors ?? []), ...(result.issues ?? [])]

  if (result.ok && allIssues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-4">
        <CircleCheckIcon className="size-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-success">Validation passed</p>
          <p className="text-xs text-muted-foreground">
            No issues found — the configuration is ready to run.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="alert"
        className={
          "flex items-center gap-2 rounded-md border p-4 " +
          (result.ok
            ? "border-warning/40 bg-warning/10"
            : "border-destructive/40 bg-destructive/10")
        }
      >
        <AlertCircleIcon
          className={
            "size-5 shrink-0 " +
            (result.ok ? "text-warning" : "text-destructive")
          }
          aria-hidden="true"
        />
        <div>
          <p
            className={
              "text-sm font-medium " + (result.ok ? "text-warning" : "text-destructive")
            }
          >
            {result.ok ? "Validation passed with warnings" : "Validation failed"}
          </p>
          <p className="text-xs text-muted-foreground">
            {result.errors?.length ?? 0} error(s), {result.issues?.length ?? 0} warning(s)
          </p>
        </div>
      </div>

      {allIssues.length > 1 ? (
        <Accordion>
          <AccordionItem value="issues">
            <AccordionTrigger>Show all issues ({allIssues.length})</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              {allIssues.map((issue, i) => (
                <IssueItem key={i} issue={issue} />
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        allIssues.map((issue, i) => <IssueItem key={i} issue={issue} />)
      )}
    </div>
  )
}

/** POST /api/v1/validate against the current overrides. */
export function ValidateDialog({ open, onOpenChange }: ValidateDialogProps) {
  const { form, config, templates } = useRunForm(open)
  const validate = useValidateRequest()
  const [result, setResult] = React.useState<ValidationResponse | null>(null)

  const handleOpenChange = (next: boolean) => {
    if (!next) setResult(null)
    onOpenChange(next)
  }

  const submit = form.handleSubmit((values) => {
    const body = buildRunRequestBody(values)
    validate.mutate(body, {
      onSuccess: (data) => setResult(data),
    })
  })

  const loadingDefaults = open && (config.isPending || templates.isPending)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !validate.isPending && handleOpenChange(next)}
    >
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Validate configuration</DialogTitle>
          <DialogDescription>
            Checks placeholders, templates, and load settings before a real run.
          </DialogDescription>
        </DialogHeader>

        {loadingDefaults ? (
          <div className="flex items-center justify-center py-16 font-mono text-xs text-muted-foreground">
            Loading configuration…
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {result && (
                <div className="mb-5">
                  <ResultView result={result} />
                  <Separator className="my-5" />
                </div>
              )}
              <RunOverridesFields form={form} showTemplates={false} />
            </div>

            <Separator />

            <DialogFooter className="px-6 py-4">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => void submit()} disabled={validate.isPending}>
                {validate.isPending ? "Validating…" : "Validate"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
