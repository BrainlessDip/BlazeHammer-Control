import { z } from "zod"
import type { LiveStats } from "@/types/api"

/**
 * WebSocket frame schemas. Parsing is defensive: unknown event types and
 * malformed frames never throw — they degrade to a generic event the UI
 * safely ignores.
 */

const optionalNumber = z.number().optional()
const nullableNumber = z.number().nullable().optional()

const liveStatsFields = {
  elapsed_s: optionalNumber,
  rps: optionalNumber,
  completed: optionalNumber,
  requested: optionalNumber,
  success: optionalNumber,
  failed: optionalNumber,
  retries: optionalNumber,
  interrupted: optionalNumber,
  latency_ms: z
    .object({
      min: nullableNumber,
      mean: nullableNumber,
      p50: nullableNumber,
      p90: nullableNumber,
      p95: nullableNumber,
      p99: nullableNumber,
      max: nullableNumber,
    })
    .optional(),
  status_codes: z.record(z.string(), z.number()).optional(),
  error_counts: z.record(z.string(), z.number()).optional(),
} as const

const helloFrame = z.object({
  type: z.literal("hello"),
  username: z.string().optional(),
  runs: z.array(z.unknown()).optional(),
})

const runStartedFrame = z.object({
  type: z.literal("run.started"),
  run_id: z.string().optional(),
  requested: optionalNumber,
})

const statsUpdatedFrame = z.object({
  type: z.literal("stats.updated"),
  run_id: z.string().optional(),
  ...liveStatsFields,
})

const requestCompletedFrame = z.object({
  type: z.literal("request.completed"),
  run_id: z.string().optional(),
  index: optionalNumber,
  seq: optionalNumber,
  ok: z.boolean().optional(),
  status: optionalNumber,
  latency_ms: optionalNumber,
  error_category: z.string().optional(),
})

const runCompletedFrame = z.object({
  type: z.literal("run.completed"),
  run_id: z.string().optional(),
  ...liveStatsFields,
})

/** Not currently emitted by the backend, but tolerated for forward compat. */
const runStoppedFrame = z.object({
  type: z.literal("run.stopped"),
  run_id: z.string().optional(),
})

const runErrorFrame = z.object({
  type: z.literal("run.error"),
  run_id: z.string().optional(),
  message: z.string().optional(),
})

const authExpiredFrame = z.object({ type: z.literal("auth.expired") })
const pongFrame = z.object({ type: z.literal("pong") })

export const knownWsEventSchema = z.union([
  helloFrame,
  runStartedFrame,
  statsUpdatedFrame,
  requestCompletedFrame,
  runCompletedFrame,
  runStoppedFrame,
  runErrorFrame,
  authExpiredFrame,
  pongFrame,
])

export type KnownWsEvent = z.infer<typeof knownWsEventSchema>

export type WsEvent =
  | KnownWsEvent
  | { type: string; [key: string]: unknown }

/** Extracts the LiveStats subset from a flat stats-bearing frame. */
export function extractLiveStats(frame: Record<string, unknown>): LiveStats {
  return {
    elapsed_s: typeof frame.elapsed_s === "number" ? frame.elapsed_s : undefined,
    rps: typeof frame.rps === "number" ? frame.rps : undefined,
    completed: typeof frame.completed === "number" ? frame.completed : undefined,
    requested: typeof frame.requested === "number" ? frame.requested : undefined,
    success: typeof frame.success === "number" ? frame.success : undefined,
    failed: typeof frame.failed === "number" ? frame.failed : undefined,
    retries: typeof frame.retries === "number" ? frame.retries : undefined,
    interrupted:
      typeof frame.interrupted === "number" ? frame.interrupted : undefined,
    latency_ms:
      typeof frame.latency_ms === "object" && frame.latency_ms !== null
        ? (frame.latency_ms as LiveStats["latency_ms"])
        : undefined,
    status_codes:
      typeof frame.status_codes === "object" && frame.status_codes !== null
        ? (frame.status_codes as Record<string, number>)
        : undefined,
    error_counts:
      typeof frame.error_counts === "object" && frame.error_counts !== null
        ? (frame.error_counts as Record<string, number>)
        : undefined,
  }
}

/**
 * Parses a raw WebSocket text frame into a typed event.
 * Never throws; unrecognized types pass through with their original `type`.
 */
export function parseWsEvent(raw: string): WsEvent {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { type: "client.parse_error" }
  }

  const result = knownWsEventSchema.safeParse(parsed)
  if (result.success) {
    return result.data
  }

  if (typeof parsed === "object" && parsed !== null && "type" in parsed) {
    const candidate = parsed as Record<string, unknown>
    if (typeof candidate.type === "string") {
      return { ...candidate, type: candidate.type }
    }
  }
  return { type: "client.unknown_frame" }
}
