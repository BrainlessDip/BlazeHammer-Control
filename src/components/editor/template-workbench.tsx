import * as React from "react"
import { Editor } from "@monaco-editor/react"
import { useBlocker } from "react-router-dom"
import {
  BracesIcon,
  CopyIcon,
  EyeIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PreviewDialog } from "@/components/runs/preview-dialog"
import { ConflictDialog } from "@/components/editor/conflict-dialog"
import { EditorStatusBar } from "@/components/editor/editor-status-bar"
import { SaveButton } from "@/components/editor/save-button"
import {
  registerPlaceholderProviders,
} from "@/components/editor/monaco-placeholders"
import { defineDracula, EDITOR_THEME } from "@/lib/editor-theme"
import { useValidateRequest } from "@/features/preview/hooks"
import {
  diagnosePlaceholders,
  scanTokens,
} from "@/features/placeholders/completion"
import { getCatalogIndex } from "@/features/placeholders/catalog-store"
import {
  clearRunDraft,
  setRunDraft,
} from "@/hooks/use-run-draft"
import { usePlaceholderCatalog } from "@/hooks/use-placeholder-catalog"
import {
  useTemplateEditor,
  type TemplateKind,
} from "@/hooks/use-template-editor"
import type { ValidationResponse } from "@/types/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const KINDS: Array<{ value: TemplateKind; label: string }> = [
  { value: "payload", label: "Payload" },
  { value: "headers", label: "Headers" },
]

interface TemplateWorkbenchProps {
  /** Tab shown first; both editors remain independently editable. */
  initialTab: TemplateKind
}

export function TemplateWorkbench({ initialTab }: TemplateWorkbenchProps) {
  const editor = useTemplateEditor()
  const catalogState = usePlaceholderCatalog()
  const validateMutation = useValidateRequest()

  const [active, setActive] = React.useState<TemplateKind>(initialTab)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [resetConfirm, setResetConfirm] = React.useState(false)
  const [backendIssues, setBackendIssues] = React.useState<
    Awaited<ReturnType<typeof validateMutation.mutateAsync>> | null
  >(null)

  const editorRef = React.useRef<Parameters<
    NonNullable<React.ComponentProps<typeof Editor>["onMount"]>
  >[0] | null>(null)
  const knownDecorations = React.useRef<ReturnType<
    NonNullable<typeof editorRef.current>["createDecorationsCollection"]
  > | null>(null)
  const unknownDecorations = React.useRef<ReturnType<
    NonNullable<typeof editorRef.current>["createDecorationsCollection"]
  > | null>(null)
  // Latest formatter, wired into the editor's Shift+Alt+F command at mount.
  const formatHandler = React.useRef<() => void>(() => {})

  const activeDoc = editor.state[active]

  // -- placeholder decorations ---------------------------------------------------

  React.useEffect(() => {
    const instance = editorRef.current
    if (!instance || activeDoc.text === null) return
    const model = instance.getModel()
    if (!model) return

    const text = activeDoc.text
    const unknown = diagnosePlaceholders(text, getCatalogIndex())
    const knownSpans = scanTokens(text).filter(
      (span) => !unknown.some((d) => d.start === span.start),
    )

    const toDecoration = (
      span: { start: number; end: number },
      className: string,
      hover?: string,
    ) => ({
      range: {
        startLineNumber: model.getPositionAt(span.start).lineNumber,
        startColumn: model.getPositionAt(span.start).column,
        endLineNumber: model.getPositionAt(span.end).lineNumber,
        endColumn: model.getPositionAt(span.end).column,
      },
      options: {
        inlineClassName: className,
        ...(hover ? { hoverMessage: { value: hover } } : {}),
      },
    })

    if (!knownDecorations.current) {
      knownDecorations.current = instance.createDecorationsCollection()
    }
    if (!unknownDecorations.current) {
      unknownDecorations.current = instance.createDecorationsCollection()
    }
    knownDecorations.current.set(
      knownSpans.map((span) => toDecoration(span, "blaze-placeholder-token")),
    )
    unknownDecorations.current.set(
      unknown.map((d) => toDecoration(d, "blaze-placeholder-unknown", `⚠ ${d.message}`)),
    )
  }, [activeDoc.text, catalogState.catalog])

  // -- keyboard ------------------------------------------------------------------

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        if (editor.canSave && editor.dirty[active]) editor.save()
        else if (editor.dirty[active] && !editor.jsonCheck[active].ok) {
          const check = editor.jsonCheck[active]
          toast.error(`Cannot save — invalid JSON at ${check.ok ? "" : `${check.line}:${check.column}`}`, {
            description: check.ok ? undefined : check.message,
          })
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [editor, active])

  // -- unsaved-change guards -------------------------------------------------------

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      editor.anyDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  React.useEffect(() => {
    if (!editor.anyDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [editor.anyDirty])

  // -- actions ---------------------------------------------------------------------

  // Keep the latest formatter reachable from the editor command bound at mount
  // (assignment-only effect; runs after every render by design).
  React.useEffect(() => {
    formatHandler.current = () => {
      const check = editor.jsonCheck[active]
      if (!check.ok) {
        toast.error(
          `Cannot format — invalid JSON at line ${check.line}, column ${check.column}`,
          { description: check.message },
        )
        return
      }
      const raw = editor.state[active].text
      if (!raw?.trim()) return
      try {
        const parsed: unknown = JSON.parse(raw)
        editor.setText(active, `${JSON.stringify(parsed, null, 2)}\n`)
      } catch {
        // Status bar already reports this race with fast typing.
      }
    }
  })

  const openPreview = () => {
    const draft: Record<string, string> = {}
    const payload = editor.state.payload.text ?? ""
    const headers = editor.state.headers.text ?? ""
    if (payload.trim()) draft.payload_text = payload
    if (headers.trim()) draft.headers_text = headers
    clearRunDraft()
    setRunDraft(draft)
    setPreviewOpen(true)
  }

  const runValidate = () => {
    const body: Record<string, string> = {}
    const payload = editor.state.payload.text ?? ""
    const headers = editor.state.headers.text ?? ""
    if (payload.trim()) body.payload_text = payload
    if (headers.trim()) body.headers_text = headers
    if (Object.keys(body).length === 0) return
    validateMutation.mutate(body, {
      onSuccess: (result) => {
        setBackendIssues(result)
        const count = (result.errors?.length ?? 0) + (result.issues?.length ?? 0)
        if (count === 0) toast.success("Validation passed — no issues found")
      },
    })
  }

  const copyActive = async () => {
    try {
      await navigator.clipboard.writeText(editor.state[active].text ?? "")
      toast.success(`${KINDS.find((k) => k.value === active)?.label} copied`)
    } catch {
      toast.error("Clipboard access was denied")
    }
  }

  const handleEditorMount = (
    editorInstance: Parameters<NonNullable<React.ComponentProps<typeof Editor>["onMount"]>>[0],
    monacoInstance: Parameters<NonNullable<React.ComponentProps<typeof Editor>["onMount"]>>[1],
  ) => {
    editorRef.current = editorInstance
    registerPlaceholderProviders(monacoInstance)
    editorInstance.addCommand(
      // biome-ignore lint: numeric chord is the documented Monaco pattern
      (monacoInstance.KeyMod?.Shift ?? 0) | (monacoInstance.KeyMod?.Alt ?? 0) | (monacoInstance.KeyCode?.KeyF ?? 0),
      () => formatHandler.current(),
    )
    monacoInstance.editor.setTheme(EDITOR_THEME)
  }

  // -- render ------------------------------------------------------------------------

  if (editor.state.status === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="min-h-[420px] w-full" />
        <p className="font-mono text-xs text-muted-foreground">Loading templates…</p>
      </div>
    )
  }

  if (editor.state.status === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-5"
      >
        <p className="text-sm font-medium text-destructive">Failed to load templates</p>
        <p className="font-mono text-xs text-muted-foreground">{editor.state.error}</p>
        <Button size="sm" variant="outline" onClick={editor.retry}>
          Retry
        </Button>
      </div>
    )
  }

  const activeLabel = KINDS.find((k) => k.value === active)?.label ?? active
  const localDiagnostics = diagnosePlaceholders(activeDoc.text ?? "", getCatalogIndex())
  const backendCount =
    (backendIssues?.errors?.length ?? 0) + (backendIssues?.issues?.length ?? 0)
  const externalStale = editor.externalChanges.includes(active)

  return (
    <div className="flex flex-col gap-3">
      {/* Tabs + toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Tabs value={active} onValueChange={(value) => setActive(value as TemplateKind)}>
          <TabsList>
            {KINDS.map((kind) => (
              <TabsTrigger key={kind.value} value={kind.value}>
                {kind.label}
                {editor.dirty[kind.value] && (
                  <span
                    className="ml-1.5 inline-block size-1.5 rounded-full bg-warning align-middle"
                    title="Unsaved changes"
                    aria-label={`${kind.label} has unsaved changes`}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <ToolbarButton
            icon={<BracesIcon aria-hidden="true" />}
            label="Format"
            title="Format JSON (Shift+Alt+F)"
            onClick={() => formatHandler.current()}
          />
          <ToolbarButton
            icon={<ShieldCheckIcon aria-hidden="true" />}
            label="Validate"
            title="Validate with backend"
            loading={validateMutation.isPending}
            onClick={runValidate}
          />
          <ToolbarButton
            icon={<EyeIcon aria-hidden="true" />}
            label="Preview"
            title="Preview generated requests"
            onClick={openPreview}
          />
          <ToolbarButton
            icon={<CopyIcon aria-hidden="true" />}
            label=""
            title="Copy contents"
            onClick={() => void copyActive()}
            disabled={!activeDoc.text}
          />
          <ToolbarButton
            icon={<RotateCcwIcon aria-hidden="true" />}
            label=""
            title="Reset to last saved version"
            disabled={!editor.dirty[active]}
            onClick={() => setResetConfirm(true)}
          />
          <SaveButton
            dirty={editor.dirty[active]}
            phase={editor.saveState.phase}
            disabled={!editor.canSave}
            errorMessage={editor.saveState.message}
            onSave={editor.save}
          />
        </div>
      </div>

      {externalStale && (
        <ExternalChangeBanner
          label={activeLabel}
          onReload={() => editor.reloadKind(active)}
          onDismiss={() => editor.clearExternalChange(active)}
        />
      )}

      {backendIssues && backendCount > 0 && <BackendIssues result={backendIssues} />}

      {/* Editor surface */}
      <div className="overflow-hidden rounded-lg border bg-card ring-1 ring-foreground/5">
        {!catalogState.fromBackend && !catalogState.isLoading && (
          <p className="border-b bg-muted/30 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
            Offline placeholder catalog — start the Blaze Hammer backend for full
            Faker autocomplete.
          </p>
        )}
        <MonacoPane
          kind={active}
          value={activeDoc.text ?? ""}
          onChange={(value) => editor.setText(active, value ?? "")}
          onMount={handleEditorMount}
        />
        <EditorStatusBar
          kind={active}
          json={editor.jsonCheck[active]}
          lineCount={(activeDoc.text ?? "").split("\n").length}
          dirty={editor.dirty[active]}
          savePhase={editor.saveState.phase}
        />
        {(localDiagnostics.length > 0 || backendCount > 0) && (
          <ProblemsStrip local={localDiagnostics.length} backend={backendCount} issues={localDiagnostics} />
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Placeholders like <code className="font-mono">{"{faker.email}"}</code> are
        highlighted and checked against the backend catalog; resolution happens
        server-side at run time. Saving writes{" "}
        <code className="font-mono">{activeDoc.path ?? `${active}.json`}</code> behind
        revision checks (409 on external edits).
      </p>

      {/* Conflict */}
      <ConflictDialog
        open={!!editor.conflict}
        kindLabel={
          editor.conflict?.kind === "both"
            ? "Payload and headers"
            : (editor.conflict?.kind ?? active)
        }
        details={editor.conflict?.details ?? null}
        onReloadRemote={() => {
          if (!editor.conflict) return
          const kinds =
            editor.conflict.kind === "both"
              ? (["payload", "headers"] as TemplateKind[])
              : [editor.conflict.kind]
          kinds.forEach((kind) => editor.reloadKind(kind))
        }}
        onKeepMine={() => {
          if (!editor.conflict) return
          if (editor.conflict.kind !== "both") {
            editor.forceRevision(
              editor.conflict.kind,
              editor.conflict.details.current_revision ?? null,
            )
            toast.info(
              "Keeping your changes — save again to intentionally overwrite the remote version.",
            )
          }
        }}
        onCancel={editor.dismissConflict}
      />

      {/* Reset confirm */}
      <Dialog open={resetConfirm} onOpenChange={(next) => !next && setResetConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              This will restore the last saved version of{" "}
              {activeLabel.toLowerCase()}. Your current edits will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setResetConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                editor.discardKind(active)
                setBackendIssues(null)
                setResetConfirm(false)
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />

      {/* Route guard */}
      {blocker.state === "blocked" && (
        <Dialog open onOpenChange={(next) => !next && void blocker.reset()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unsaved changes</DialogTitle>
              <DialogDescription>
                Your changes haven&apos;t been saved. Leaving this page now will
                discard them.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => void blocker.reset()}>
                Stay and keep editing
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void blocker.proceed()}>
                Discard and leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// subcomponents
// ---------------------------------------------------------------------------

function ToolbarButton({
  icon,
  label,
  title,
  disabled,
  loading,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  title?: string
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}) {
  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5 font-mono text-xs", !label && "px-2")}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={title ?? label}
    >
      {loading ? <RotateCcwIcon className="animate-spin" aria-hidden="true" /> : icon}
      {label}
    </Button>
  )
  if (!title) return button
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}

function ExternalChangeBanner({
  label,
  onReload,
  onDismiss,
}: {
  label: string
  onReload: () => void
  onDismiss: () => void
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs"
    >
      <TriangleAlertIcon className="size-4 shrink-0 text-warning" aria-hidden="true" />
      <span>
        {label} changed externally while you had unsaved edits. Nothing was overwritten.
      </span>
      <Button size="xs" variant="outline" className="ml-auto" onClick={onReload}>
        Reload remote
      </Button>
      <Button size="xs" variant="ghost" onClick={onDismiss}>
        Keep editing
      </Button>
    </div>
  )
}

function BackendIssues({ result }: { result: ValidationResponse }) {
  const all = [...(result.errors ?? []), ...(result.issues ?? [])]
  return (
    <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-3">
      <p className="mb-1.5 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        Backend validation
      </p>
      <ul className="flex flex-col gap-1">
        {all.map((issue, i) => (
          <li key={i} className="font-mono text-xs">
            <span className="text-destructive">{issue.problem ?? issue.message ?? "Issue"}</span>
            {issue.location && (
              <Badge variant="outline" className="ml-1.5 font-mono text-[10px]">
                {issue.location}
              </Badge>
            )}
            {issue.suggestions && (
              <span className="ml-1 text-success">
                did you mean {issue.suggestions.split("|")[0]}?
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProblemsStrip({
  local,
  backend,
  issues,
}: {
  local: number
  backend: number
  issues: Array<{ message: string }>
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 border-t bg-muted/20 px-3 py-1.5 font-mono text-[11px]"
      title={issues.map((i) => i.message).join("\n")}
    >
      <TriangleAlertIcon className="size-3 shrink-0 text-warning" aria-hidden="true" />
      {local > 0 && <span>{local} unknown placeholder{local === 1 ? "" : "s"}</span>}
      {local > 0 && backend > 0 && <span aria-hidden="true">·</span>}
      {backend > 0 && (
        <span>{backend} backend issue{backend === 1 ? "" : "s"}</span>
      )}
    </div>
  )
}

function MonacoPane({
  kind,
  value,
  onChange,
  onMount,
}: {
  kind: TemplateKind
  value: string
  onChange: (value: string | undefined) => void
  onMount: NonNullable<React.ComponentProps<typeof Editor>["onMount"]>
}) {
  return (
    <Editor
      key={kind}
      height="480px"
      defaultLanguage="json"
      language="json"
      value={value}
      theme={EDITOR_THEME}
      beforeMount={defineDracula}
      onChange={onChange}
      onMount={onMount}
      options={{
        fontSize: 13,
        fontFamily:
          "'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        renderLineHighlight: "line",
        smoothScrolling: true,
        padding: { top: 10, bottom: 10 },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        quickSuggestions: { other: false, comments: false, strings: true },
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: "off",
        fixedOverflowWidgets: true,
      }}
      loading={
        <div className="flex h-full min-h-[480px] items-center justify-center bg-card font-mono text-xs text-muted-foreground">
          Loading editor…
        </div>
      }
    />
  )
}
