import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  GaugeCircle,
  ListChecks,
  Square,
  XCircle,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/common/states"
import { MetricCard } from "@/components/common/metric-card"
import { StatusBadge } from "@/components/common/status-badge"
import { RunLogPanel } from "@/components/runs/run-log-panel"
import { useRun, useStopRun } from "@/features/runs/hooks"
import type { RunWithStats } from "@/types/api"
import { formatCompact, formatInt, formatMs, truncateMiddle } from "@/lib/format"

export function RunDetails() {
  const { runId = "" } = useParams()
  const runQuery = useRun(runId)
  const stopRun = useStopRun()

  if (runQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (runQuery.isError || !runQuery.data) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorState
          title={runQuery.isError ? "Failed to load run" : "Run not found"}
          error={runQuery.error}
          retry={() => void runQuery.refetch()}
        />
      </div>
    )
  }

  const run: RunWithStats = runQuery.data
  const isRunning = run.status === "running"

  return (
    <div className="flex flex-col gap-4">
      <BackLink />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1
          className="font-mono text-sm font-semibold tracking-tight"
          title={run.run_id}
        >
          {truncateMiddle(run.run_id, 24)}
        </h1>
        <StatusBadge status={run.status} />
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
          {run.method}
        </span>
        <span className="min-w-0 truncate font-mono text-sm text-muted-foreground">
          {run.target}
        </span>

        {isRunning && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            onClick={() => stopRun.mutate(run.run_id)}
            disabled={stopRun.isPending}
          >
            <Square aria-hidden="true" />
            {stopRun.isPending ? "Stopping…" : "Stop Run"}
          </Button>
        )}
      </div>

      {run.error && (
        <Alert variant="destructive">
          <AlertDescription className="font-mono text-xs">
            {run.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Requested"
          value={formatInt(run.requested)}
          icon={ListChecks}
        />
        <MetricCard
          label="Completed"
          value={
            <>
              {formatCompact(run.stats?.completed ?? run.completed)}
              {isRunning && (
                <span className="text-muted-foreground">
                  {" "}
                  / {formatCompact(run.requested)}
                </span>
              )}
            </>
          }
          sub={
            isRunning ? `${((run.stats?.completed ?? 0) / Math.max(1, run.requested) * 100).toFixed(0)}%` : undefined
          }
          icon={ListChecks}
        />
        <MetricCard
          label="Success"
          value={
            <span className="text-success">
              {formatCompact(run.stats?.success ?? run.success)}
            </span>
          }
          icon={CheckCircle2}
        />
        <MetricCard
          label="Failed"
          value={
            <span className="text-destructive">
              {formatCompact(run.stats?.failed ?? run.failed)}
            </span>
          }
          icon={XCircle}
        />
        <MetricCard
          label="Requests/sec"
          value={run.stats?.rps !== undefined ? run.stats.rps.toFixed(1) : "—"}
          icon={GaugeCircle}
        />
        <MetricCard
          label="Avg latency"
          value={formatMs(run.stats?.latency_ms?.mean)}
          sub={
            run.stats && !isRunning
              ? `p95 ${formatMs(run.stats.latency_ms?.p95)}`
              : undefined
          }
          icon={Clock3}
        />
      </div>

      <Separator />

      {/* Log */}
      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Request log
        </h2>
        <RunLogPanel
          runId={run.run_id}
          active={isRunning}
          target={run.target}
          method={run.method}
        />
      </section>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/runs"
      className="inline-flex w-fit items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      All runs
    </Link>
  )
}
