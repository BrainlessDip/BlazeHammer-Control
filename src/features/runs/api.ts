import { api } from "@/lib/api"
import type {
  RunListResponse,
  RunLogResponse,
  RunStartRequest,
  RunSummary,
} from "@/types/api"

export const runsApi = {
  start(body: RunStartRequest) {
    return api.post<RunSummary>("/runs", { body })
  },
  list(signal?: AbortSignal) {
    return api.get<RunListResponse>("/runs", { signal })
  },
  get(runId: string, signal?: AbortSignal) {
    return api.get<RunSummary>(`/runs/${encodeURIComponent(runId)}`, {
      signal,
    })
  },
  stop(runId: string) {
    return api.post<{ ok: boolean }>(
      `/runs/${encodeURIComponent(runId)}/stop`
    )
  },
  clear() {
    return api.del<{ ok: boolean }>("/runs")
  },
  log(runId: string, offset: number, signal?: AbortSignal) {
    return api.get<RunLogResponse>(`/runs/${encodeURIComponent(runId)}/log`, {
      params: { offset },
      signal,
    })
  },
}
