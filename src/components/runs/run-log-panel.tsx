import * as React from "react"
import { CircleXIcon, GripVerticalIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { RequestBodyViewer } from "@/components/body/request-body-viewer"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EmptyState } from "@/components/common/states"
import { JsonBlock } from "@/components/common/json-block"
import { JsonViewer } from "@/components/common/json-viewer"
import { useRunLog } from "@/features/runs/hooks"
import type { NormalizedLogEntry } from "@/types/api"
import { formatInt, formatMs, formatTimestamp } from "@/lib/format"

const SHEET_WIDTH_KEY = "blaze-hammer:request-sheet-width"
const DEFAULT_SHEET_WIDTH = 480
const MIN_SHEET_WIDTH = 320
const MAX_SHEET_WIDTH = 900

type LogFilter = "all" | "success" | "errors"

const FILTERS: Array<{ value: LogFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "errors", label: "Errors" },
]

function statusTone(status: number): string {
  if (status >= 200 && status < 300) return "text-success"
  if (status >= 400 && status < 500) return "text-warning"
  if (status >= 500) return "text-destructive"
  return status === 0 ? "text-destructive" : "text-foreground"
}

function extractField(raw: NormalizedLogEntry["raw"], key: string): unknown {
  const obj = raw as unknown as Record<string, unknown>
  return obj[key]
}

function RequestDetailsSheet({
  entry,
  target,
  method,
  onClose,
}: {
  entry: NormalizedLogEntry | null
  target?: string
  method?: string
  onClose: () => void
}) {
  const [sheetWidth, setSheetWidth] = React.useState(() => {
    try {
      const saved = localStorage.getItem(SHEET_WIDTH_KEY)
      return saved ? Number(saved) : DEFAULT_SHEET_WIDTH
    } catch {
      return DEFAULT_SHEET_WIDTH
    }
  })
  const dragging = React.useRef(false)
  const startX = React.useRef(0)
  const startWidth = React.useRef(0)

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true
      startX.current = e.clientX
      startWidth.current = sheetWidth
      e.preventDefault()

      const handleMouseMove = (e: MouseEvent) => {
        if (!dragging.current) return
        const delta = startX.current - e.clientX
        const newWidth = Math.min(
          MAX_SHEET_WIDTH,
          Math.max(MIN_SHEET_WIDTH, startWidth.current + delta)
        )
        setSheetWidth(newWidth)
      }

      const handleMouseUp = () => {
        dragging.current = false
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        try {
          localStorage.setItem(SHEET_WIDTH_KEY, String(sheetWidth))
        } catch {
          // Ignore
        }
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [sheetWidth]
  )

  // Persist width on change
  React.useEffect(() => {
    try {
      localStorage.setItem(SHEET_WIDTH_KEY, String(sheetWidth))
    } catch {
      // Ignore
    }
  }, [sheetWidth])

  return (
    <Sheet open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="flex flex-col gap-4 overflow-y-auto"
        style={{ width: sheetWidth, maxWidth: sheetWidth }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute inset-y-0 left-0 z-10 flex w-1.5 cursor-col-resize items-center justify-center hover:bg-primary/10 active:bg-primary/20"
        >
          <GripVerticalIcon className="size-4 text-muted-foreground/50" />
        </div>

        <SheetHeader className="pl-4">
          <SheetTitle className="font-mono text-base">
            Request #{entry?.index ?? "—"}
          </SheetTitle>
          <SheetDescription>
            Redacted as recorded by the backend at execution time.
          </SheetDescription>
        </SheetHeader>

        {entry && (
          <div className="flex min-h-0 flex-col gap-5 pb-6 pl-4">
            <section className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div>
                <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                  Method
                </p>
                {method ?? "—"}
              </div>
              <div>
                <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                  Status
                </p>
                <span className={statusTone(entry.statusCode ?? 0)}>
                  {entry.statusCode === null ? "—" : entry.statusCode}
                </span>
              </div>
              <div>
                <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                  Latency
                </p>
                {formatMs(entry.latencyMs)}
              </div>
            </section>

            {target && (
              <section className="min-w-0">
                <p className="mb-1 text-[10px] tracking-widest text-muted-foreground uppercase">
                  URL
                </p>
                <p className="font-mono text-xs break-all">{target}</p>
              </section>
            )}

            <section>
              <p className="mb-1.5 text-[10px] tracking-widest text-muted-foreground uppercase">
                Response Headers
              </p>
              {(() => {
                const hdrs =
                  extractField(entry.raw, "response_headers") ??
                  extractField(entry.raw, "response_headers")
                return hdrs ? (
                  <JsonViewer value={hdrs} maxHeightClass="max-h-72" />
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">—</p>
                )
              })()}
            </section>

            <section>
              <p className="mb-1.5 text-[10px] tracking-widest text-muted-foreground uppercase">
                Request body / Payload
              </p>
              {(() => {
                const body = extractField(entry.raw, "request_body")
                const postType = extractField(entry.raw, "post_type") as string | null | undefined
                return body !== null && body !== undefined ? (
                  <RequestBodyViewer body={body} postType={postType} />
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">—</p>
                )
              })()}
            </section>

            <section>
              <p className="mb-1.5 text-[10px] tracking-widest text-muted-foreground uppercase">
                Response body (excerpt)
              </p>
              {(() => {
                const excerpt = extractField(entry.raw, "response_body_excerpt")
                return excerpt ? (
                  <JsonBlock value={excerpt} maxHeightClass="max-h-64" />
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">—</p>
                )
              })()}
            </section>

            {(entry.errorCategory || entry.error) && (
              <section
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 p-3"
              >
                <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <CircleXIcon className="size-3.5" aria-hidden="true" />
                  {entry.errorCategory ?? "Error"}
                </p>
                {entry.error && (
                  <p className="mt-1 font-mono text-xs break-all text-destructive/90">
                    {entry.error}
                  </p>
                )}
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

interface RunLogPanelProps {
  runId: string
  active: boolean
  target?: string
  method?: string
}

export function RunLogPanel({
  runId,
  active,
  target,
  method,
}: RunLogPanelProps) {
  const logQuery = useRunLog(runId, { active })
  const [filter, setFilter] = React.useState<LogFilter>("all")
  const [selected, setSelected] = React.useState<NormalizedLogEntry | null>(
    null
  )

  const filtered = React.useMemo(() => {
    const entries = logQuery.data ?? []
    switch (filter) {
      case "success":
        return entries.filter((e) => e.ok)
      case "errors":
        return entries.filter((e) => !e.ok)
      default:
        return entries
    }
  }, [logQuery.data, filter])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as LogFilter)}
        >
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {formatInt(filtered.length)} entr{filtered.length === 1 ? "y" : "ies"}
          {active && (
            <Badge
              variant="outline"
              className="ml-2 font-mono text-[10px] text-primary"
            >
              LIVE
            </Badge>
          )}
        </span>
      </div>

      {logQuery.isPending ? (
        <div className="h-40 animate-pulse rounded-lg border bg-muted/40" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No request logs available"
          description={
            filter === "all"
              ? "Requests will appear here while the run executes."
              : `No ${filter === "success" ? "successful" : "failed"} requests recorded.`
          }
          className="py-8"
        />
      ) : (
        <div className="max-h-[26rem] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-14 pl-4">#</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow
                  key={`${entry.index}-${entry.timestampMs}`}
                  onClick={() => setSelected(entry)}
                  className="cursor-pointer"
                  aria-label={`Request ${entry.index}`}
                >
                  <TableCell className="pl-4 font-mono text-xs tabular-nums">
                    {entry.index}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {formatTimestamp(entry.timestampMs)}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span
                            className={`font-mono text-xs font-semibold tabular-nums ${statusTone(entry.statusCode ?? 0)}`}
                          >
                            {entry.statusCode ?? "ERR"}
                          </span>
                        }
                      />
                      <TooltipContent>
                        {entry.ok ? "Success" : "Failed"}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {formatMs(entry.latencyMs)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {formatInt(entry.attempts)}
                  </TableCell>
                  <TableCell
                    className="max-w-[18rem] truncate font-mono text-xs text-destructive"
                    title={entry.error ?? entry.errorCategory}
                  >
                    {entry.errorCategory ?? entry.error ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RequestDetailsSheet
        entry={selected}
        target={target}
        method={method}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
