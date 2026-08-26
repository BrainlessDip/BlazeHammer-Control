import type { Query } from "@tanstack/react-query"

/** Centralized TanStack Query key factory. */
export const qk = {
  me: ["me"] as const,
  health: ["health"] as const,
  info: ["info"] as const,
  config: ["config"] as const,
  templates: ["config", "templates"] as const,
  project: ["config", "project"] as const,
  catalog: ["placeholders", "catalog"] as const,
  profiles: ["profiles"] as const,
  profile: (name: string) => ["profiles", name] as const,
  runs: ["runs"] as const,
  run: (runId: string) => ["runs", runId] as const,
  runLog: (runId: string) => ["runs", runId, "log"] as const,
}

export function isQueryByKey(query: unknown, key: readonly unknown[]): boolean {
  const q = query as Pick<Query, "queryKey"> | null
  if (!q || !Array.isArray(q.queryKey)) return false
  if (q.queryKey.length < key.length) return false
  return key.every((part, i) => q.queryKey[i] === part)
}
