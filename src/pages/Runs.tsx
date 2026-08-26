import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  Copy,
  ListTree,
  MoreHorizontal,
  Play,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState, ErrorState } from "@/components/common/states"
import { StatusBadge } from "@/components/common/status-badge"
import { PageHeader } from "@/components/common/page-header"
import { TableSkeleton } from "@/components/common/loading-skeletons"
import { StartRunDialog } from "@/components/runs/start-run-dialog"
import { useClearRuns, useRuns, useStopRun } from "@/features/runs/hooks"
import type { RunSummary } from "@/types/api"
import { formatCompact, formatInt, truncateMiddle } from "@/lib/format"

export function Runs() {
  const runsQuery = useRuns()
  const clearRuns = useClearRuns()
  const stopRun = useStopRun()
  const navigate = useNavigate()

  const [clearOpen, setClearOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)

  const runs = runsQuery.data?.runs ?? []

  const copyId = async (runId: string) => {
    try {
      await navigator.clipboard.writeText(runId)
    } catch {
      // Clipboard unavailable; non-critical.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Runs"
        description="Request execution history from this backend session."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runsQuery.refetch()}
              disabled={runsQuery.isRefetching}
            >
              <RefreshCw
                className={runsQuery.isRefetching ? "animate-spin" : undefined}
                aria-hidden="true"
              />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStartOpen(true)}>
              <Play aria-hidden="true" /> Start Run
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={runs.length === 0 || clearRuns.isPending}
              onClick={() => setClearOpen(true)}
            >
              <Trash2 aria-hidden="true" /> Clear History
            </Button>
          </>
        }
      />

      {runsQuery.isPending ? (
        <TableSkeleton />
      ) : runsQuery.isError ? (
        <ErrorState
          title="Failed to load runs"
          error={runsQuery.error}
          retry={() => void runsQuery.refetch()}
        />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={<ListTree />}
          title="No runs yet"
          description="Configure your first API test."
          action={
            <Button size="sm" onClick={() => setStartOpen(true)}>
              <Play aria-hidden="true" /> Start Run
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Success</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="w-10 pr-3" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <RunRow
                  key={run.run_id}
                  run={run}
                  onOpen={() =>
                    void navigate(`/runs/${encodeURIComponent(run.run_id)}`)
                  }
                  onStop={() => stopRun.mutate(run.run_id)}
                  onCopy={() => void copyId(run.run_id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear run history?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes all recorded runs from the backend. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                clearRuns.mutate(undefined, {
                  onSuccess: () => setClearOpen(false),
                })
              }}
              disabled={clearRuns.isPending}
            >
              {clearRuns.isPending ? "Clearing…" : "Clear History"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StartRunDialog open={startOpen} onOpenChange={setStartOpen} />
    </div>
  )
}

function RunRow({
  run,
  onOpen,
  onStop,
  onCopy,
}: {
  run: RunSummary
  onOpen: () => void
  onStop: () => void
  onCopy: () => void
}) {
  const isRunning = run.status === "running"
  return (
    <TableRow
      className="cursor-pointer"
      onClick={onOpen}
      aria-label={`Open run ${truncateMiddle(run.run_id, 12)}`}
    >
      <TableCell className="max-w-[10rem] pl-4 font-mono text-xs">
        <Link
          to={`/runs/${encodeURIComponent(run.run_id)}`}
          className="hover:text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
          title={run.run_id}
        >
          {truncateMiddle(run.run_id, 14)}
        </Link>
      </TableCell>
      <TableCell>
        <StatusBadge status={run.status} />
      </TableCell>
      <TableCell className="max-w-[16rem] truncate font-mono text-xs" title={run.target}>
        {truncateMiddle(run.target, 42)}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-[11px]">
          {run.method}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        {formatInt(run.requested)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        {formatInt(run.completed)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums text-success">
        {formatCompact(run.success)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums text-destructive">
        {formatCompact(run.failed)}
      </TableCell>
      <TableCell
        className="pr-3"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Actions for run ${truncateMiddle(run.run_id, 8)}`}
              >
                <MoreHorizontal aria-hidden="true" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onOpen}>
              <ArrowRight aria-hidden="true" /> View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopy}>
              <Copy aria-hidden="true" /> Copy ID
            </DropdownMenuItem>
            {isRunning && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onStop}>
                  <Square aria-hidden="true" /> Stop run
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
