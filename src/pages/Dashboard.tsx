import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  Activity,
  CheckCircle2,
  Clock3,
  FlaskConical,
  GaugeCircle,
  ListChecks,
  Play,
  ShieldCheck,
  Square,
  Timer,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { MetricCard } from "@/components/common/metric-card"
import { StartRunDialog } from "@/components/runs/start-run-dialog"
import { PreviewDialog } from "@/components/runs/preview-dialog"
import { ValidateDialog } from "@/components/runs/validate-dialog"
import { useRuns, useStopRun } from "@/features/runs/hooks"
import type { RunWithStats } from "@/types/api"
import {
  formatCompact,
  formatElapsed,
  formatInt,
  formatMs,
  formatRps,
  percentComplete,
  truncateMiddle,
} from "@/lib/format"

function ActiveRunCard({ run }: { run: RunWithStats }) {
  const stopRun = useStopRun()
  const pct = percentComplete(
    run.stats?.completed ?? run.completed,
    run.requested
  )

  return (
    <Card className="gap-4 ring-primary/25">
      <div className="flex flex-wrap items-center gap-2 px-5 pt-1">
        <Badge className="bg-primary/15 font-mono tracking-widest text-primary">
          RUNNING
        </Badge>
        <span
          className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground"
          title={run.run_id}
        >
          {truncateMiddle(run.run_id, 40)}
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="destructive"
                size="sm"
                onClick={() => stopRun.mutate(run.run_id)}
                disabled={stopRun.isPending}
              >
                <Square aria-hidden="true" />
                {stopRun.isPending ? "Stopping…" : "Stop Run"}
              </Button>
            }
          />
          <TooltipContent>Interrupt the running request plan</TooltipContent>
        </Tooltip>
      </div>

      <Separator />

      <div className="flex items-center gap-2.5 px-5">
        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
          {run.method}
        </span>
        <span className="min-w-0 truncate font-mono text-sm">{run.target}</span>
      </div>

      <div className="flex flex-col gap-2 px-5">
        <Progress value={pct} aria-label="Run progress" />
        <div className="flex items-baseline justify-between font-mono text-xs tabular-nums">
          <span>
            {formatInt(run.stats?.completed ?? run.completed)} /{" "}
            {formatInt(run.requested)} requests
          </span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-5 pb-1 sm:grid-cols-4">
        <div>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">
            Throughput
          </p>
          <p className="font-mono text-sm tabular-nums">
            {formatRps(run.stats?.rps)}
          </p>
        </div>
        <div>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">
            Avg latency
          </p>
          <p className="font-mono text-sm tabular-nums">
            {formatMs(run.stats?.latency_ms?.mean ?? run.average_response_time_ms)}
          </p>
        </div>
        <div>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">
            Success / Failed
          </p>
          <p className="font-mono text-sm tabular-nums">
            <span className="text-success">
              {formatInt(run.stats?.success ?? run.success)}
            </span>
            {" / "}
            <span className="text-destructive">
              {formatInt(run.stats?.failed ?? run.failed)}
            </span>
          </p>
        </div>
        <div>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">
            Elapsed
          </p>
          <p className="font-mono text-sm tabular-nums">
            {formatElapsed(run.stats?.elapsed_s)}
          </p>
        </div>
      </div>
    </Card>
  )
}

export function Dashboard() {
  const runsQuery = useRuns()
  const location = useLocation()
  const navigate = useNavigate()

  // Editors hand off templates via an in-memory draft + navigation state.
  // Opening is decided once at mount; the effect only clears the flag.
  const [startOpen, setStartOpen] = useState(
    () =>
      !!location.state &&
      typeof location.state === "object" &&
      "startRun" in location.state
  )
  const [previewOpen, setPreviewOpen] = useState(false)
  const [validateOpen, setValidateOpen] = useState(false)

  useEffect(() => {
    if (
      location.state &&
      typeof location.state === "object" &&
      "startRun" in location.state
    ) {
      void navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  const runs = useMemo(() => runsQuery.data?.runs ?? [], [runsQuery.data])

  const activeRuns = useMemo<RunWithStats[]>(
    () => runs.filter((run) => run.status === "running"),
    [runs]
  )

  const totals = useMemo(() => {
    let completed = 0
    let requested = 0
    let success = 0
    let failed = 0
    for (const run of runs) {
      completed += run.completed ?? 0
      requested += run.requested ?? 0
      success += run.success ?? 0
      failed += run.failed ?? 0
    }
    return { completed, requested, success, failed }
  }, [runs])

  const combinedStats = useMemo(() => {
    if (activeRuns.length === 0) return null
    let totalRps = 0
    let weightedLatency = 0
    let totalWeight = 0
    for (const run of activeRuns) {
      const s = run.stats
      if (s?.rps != null) totalRps += s.rps
      if (s?.latency_ms?.mean != null) {
        const w = s.completed ?? run.completed ?? 0
        weightedLatency += s.latency_ms.mean * w
        totalWeight += w
      }
    }
    return {
      rps: totalRps,
      latencyMs: totalWeight > 0 ? weightedLatency / totalWeight : null,
    }
  }, [activeRuns])

  return (
    <div className="flex min-h-svh flex-col gap-4 pb-6 md:min-h-0 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Blaze Hammer</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            API testing and request execution console
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setStartOpen(true)}>
            <Play aria-hidden="true" /> Start Run
          </Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <FlaskConical aria-hidden="true" /> Preview
          </Button>
          <Button variant="outline" onClick={() => setValidateOpen(true)}>
            <ShieldCheck aria-hidden="true" /> Validate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {runsQuery.isPending ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} size="sm" className="gap-2.5 py-3.5">
              <Skeleton className="mx-4 h-2.5 w-16" />
              <Skeleton className="mx-4 h-6 w-20" />
            </Card>
          ))
        ) : runsQuery.isError ? (
          <div className="col-span-full rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load runs:{" "}
            {runsQuery.error instanceof Error
              ? runsQuery.error.message
              : "unknown error"}
          </div>
        ) : (
          <>
            <MetricCard
              label="Requests"
              value={formatCompact(totals.completed)}
              sub={`of ${formatCompact(totals.requested)} requested`}
              icon={ListChecks}
            />
            <MetricCard
              label="Success"
              value={
                <span className="text-success">
                  {formatCompact(totals.success)}
                </span>
              }
              icon={CheckCircle2}
            />
            <MetricCard
              label="Failed"
              value={
                <span className="text-destructive">
                  {formatCompact(totals.failed)}
                </span>
              }
              icon={XCircle}
            />
            <MetricCard
              label="Requests/sec"
              value={
                combinedStats?.rps != null ? combinedStats.rps.toFixed(1) : "—"
              }
              icon={GaugeCircle}
            />
            <MetricCard
              label="Avg latency"
              value={formatMs(combinedStats?.latencyMs)}
              icon={Clock3}
            />
            <MetricCard
              label="Active runs"
              value={String(activeRuns.length)}
              sub={
                activeRuns.length > 0 ? (
                  <Link
                    to="/runs"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    view in Runs
                  </Link>
                ) : (
                  "idle"
                )
              }
              icon={Activity}
            />
          </>
        )}
      </div>

      {activeRuns.length > 0 ? (
        <div className="flex flex-col gap-4">
          {activeRuns.map((run) => (
            <ActiveRunCard key={run.run_id} run={run} />
          ))}
        </div>
      ) : runsQuery.isPending ? (
        <Skeleton className="h-44 w-full" />
      ) : (
        <Card className="items-center justify-center gap-1 py-10 text-center ring-border/60">
          <Timer
            className="mx-auto mb-2 size-8 text-muted-foreground/50"
            aria-hidden="true"
          />
          <p className="text-sm font-medium">No active run</p>
          <p className="text-sm text-muted-foreground">
            Configure your request and start a run.
          </p>
          <div className="mt-4">
            <Button size="sm" variant="outline" onClick={() => setStartOpen(true)}>
              <Play aria-hidden="true" /> Start Run
            </Button>
          </div>
        </Card>
      )}

      <StartRunDialog open={startOpen} onOpenChange={setStartOpen} />
      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
      <ValidateDialog open={validateOpen} onOpenChange={setValidateOpen} />
    </div>
  )
}
