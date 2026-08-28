import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { qk } from "@/lib/query-keys"
import type { RunStartRequest } from "@/types/api"
import { runsApi } from "./api"
import { normalizeLogEntries } from "./log-normalize"

const ACTIVE_POLL_MS = 5_000

function hasRunningRun(
  data: { runs: Array<{ status: string }> } | undefined
): boolean {
  return !!data?.runs.some((run) => run.status === "running")
}

export function useRuns() {
  return useQuery({
    queryKey: qk.runs,
    queryFn: ({ signal }) => runsApi.list(signal),
    staleTime: 10_000,
    refetchInterval: (query) =>
      hasRunningRun(query.state.data as
        | { runs: Array<{ status: string }> }
        | undefined)
        ? ACTIVE_POLL_MS
        : false,
  })
}

export function useRun(runId: string) {
  return useQuery({
    queryKey: qk.run(runId),
    queryFn: ({ signal }) => runsApi.get(runId, signal),
    staleTime: 5_000,
    enabled: !!runId,
  })
}

export function useRunLog(runId: string, options: { active?: boolean } = {}) {
  return useQuery({
    queryKey: qk.runLog(runId),
    queryFn: ({ signal }) =>
      runsApi.log(runId, 0, signal).then(normalizeLogEntries),
    staleTime: 0,
    enabled: !!runId,
    // While a run is active, periodically reconcile the optimistic log
    // appended from WebSocket events with the authoritative backend log.
    refetchInterval: options.active ? ACTIVE_POLL_MS : false,
  })
}

export function useStartRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RunStartRequest) => runsApi.start(body),
    onSuccess: (run) => {
      toast.success("Run started")
      void queryClient.invalidateQueries({ queryKey: qk.runs })
      if (run?.run_id) {
        void queryClient.invalidateQueries({ queryKey: qk.run(run.run_id) })
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to start run"
      )
    },
  })
}

export function useStopRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => runsApi.stop(runId),
    onSuccess: () => {
      toast.success("Run stopped")
      void queryClient.invalidateQueries({ queryKey: qk.runs })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to stop run")
    },
  })
}

export function useClearRuns() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => runsApi.clear(),
    onSuccess: () => {
      toast.success("Run history cleared")
      void queryClient.invalidateQueries({ queryKey: qk.runs })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to clear history"
      )
    },
  })
}
