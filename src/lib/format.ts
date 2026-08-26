const intFormatter = new Intl.NumberFormat("en-US")
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatInt(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—"
  }
  return intFormatter.format(value)
}

export function formatCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—"
  }
  return compactFormatter.format(value)
}

/** Formats a latency in milliseconds, e.g. "124 ms" or "1.24 s". */
export function formatMs(ms: number | undefined | null): string {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) return "—"
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`
  if (ms >= 10) return `${Math.round(ms)} ms`
  return `${ms.toFixed(1)} ms`
}

/** Formats requests-per-second, e.g. "82 req/s". */
export function formatRps(rps: number | undefined | null): string {
  if (rps === undefined || rps === null || !Number.isFinite(rps)) return "—"
  if (rps >= 100) return `${Math.round(rps)} req/s`
  return `${rps.toFixed(1)} req/s`
}

/** Formats an elapsed duration in seconds, e.g. "12.5s" or "3m 04s". */
export function formatElapsed(seconds: number | undefined | null): string {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds)) {
    return "—"
  }
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m < 60) return `${m}m ${String(s).padStart(2, "0")}s`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, "0")}m`
}

/** Formats epoch milliseconds as local HH:MM:SS. */
export function formatTimestamp(ts: number | undefined | null): string {
  if (ts === undefined || ts === null || !Number.isFinite(ts)) return "—"
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/** Percentage of completed vs requested, clamped to 0–100. */
export function percentComplete(
  completed: number | undefined | null,
  requested: number | undefined | null
): number {
  if (
    !completed ||
    !requested ||
    !Number.isFinite(completed) ||
    !Number.isFinite(requested) ||
    requested <= 0
  ) {
    return 0
  }
  return Math.min(100, Math.max(0, (completed / requested) * 100))
}

/** Shortens long identifiers/URLs in the middle, keeping both ends. */
export function truncateMiddle(
  value: string,
  max = 48,
  separator = "…"
): string {
  if (value.length <= max) return value
  const keep = Math.floor((max - separator.length) / 2)
  return `${value.slice(0, keep)}${separator}${value.slice(-keep)}`
}
