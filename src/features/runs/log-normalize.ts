import type {
  LegacyRunLogEntry,
  NormalizedLogEntry,
  ResponseSnapshot,
} from "@/types/api"
import { qk } from "@/lib/query-keys"
import type { QueryClient } from "@tanstack/react-query"
import type { WsEvent } from "@/types/ws"

export function normalizeLogEntries(payload: unknown): NormalizedLogEntry[] {
  if (Array.isArray(payload)) {
    return (payload as ResponseSnapshot[]).map(normalizeSnapshot)
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "entries" in payload &&
    Array.isArray((payload as Record<string, unknown>).entries)
  ) {
    return (payload as { entries: LegacyRunLogEntry[] }).entries.map(
      normalizeLegacy
    )
  }

  return []
}

function normalizeSnapshot(snap: ResponseSnapshot): NormalizedLogEntry {
  return {
    index: snap.request_index,
    ok: snap.ok,
    statusCode: snap.status_code ?? null,
    latencyMs: snap.response_time_ms ?? null,
    attempts: snap.attempts ?? 1,
    timestampMs: snap.timestamp_ms ?? null,
    errorCategory: snap.error_category ?? undefined,
    error: snap.error ?? undefined,
    raw: snap,
  }
}

function normalizeLegacy(legacy: LegacyRunLogEntry): NormalizedLogEntry {
  return {
    index: legacy.index,
    ok: legacy.ok,
    statusCode: legacy.status,
    latencyMs: legacy.latency_ms,
    attempts: legacy.attempts,
    timestampMs: legacy.ts,
    errorCategory: legacy.error_category ?? undefined,
    error: legacy.error ?? undefined,
    raw: legacy,
  }
}

export function appendProvisionalLog(
  queryClient: QueryClient,
  event: Extract<WsEvent, { type: "request.completed" }>
) {
  const runId = asString(event.run_id)
  if (!runId || typeof event.index !== "number") return

  const entry: NormalizedLogEntry = {
    index: event.index,
    ok: event.ok ?? false,
    statusCode: event.status ?? null,
    latencyMs: event.latency_ms ?? null,
    attempts: 1,
    timestampMs: Date.now(),
    errorCategory: event.error_category ?? undefined,
    raw: {
      request_index: event.index,
      status_code: event.status ?? null,
      response_time_ms: event.latency_ms ?? null,
      content_type: null,
      body_size: 0,
      response_body_excerpt: event.response_body_excerpt ?? null,
      response_body_truncated: event.response_body_truncated ?? false,
      headers: {},
      error: null,
      ok: event.ok ?? false,
      attempts: 1,
      timestamp_ms: Date.now(),
      error_category: event.error_category ?? null,
      request_headers: event.request_headers ?? null,
      request_body: event.request_body ?? null,
      response_headers: event.response_headers ?? null,
    } as ResponseSnapshot,
  }

  queryClient.setQueryData<NormalizedLogEntry[]>(qk.runLog(runId), (prev) => {
    if (!prev) return prev
    if (prev.some((existing) => existing.index === entry.index)) {
      return prev
    }
    return [...prev, entry]
  })
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}
