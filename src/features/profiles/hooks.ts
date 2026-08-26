import { useQuery } from "@tanstack/react-query"

import { qk } from "@/lib/query-keys"
import { profilesApi } from "./api"

export function useProfiles() {
  return useQuery({
    queryKey: qk.profiles,
    queryFn: ({ signal }) => profilesApi.list(signal),
    staleTime: 60_000,
  })
}

export function useProfile(name: string | undefined) {
  return useQuery({
    queryKey: qk.profile(name ?? ""),
    queryFn: ({ signal }) => profilesApi.get(name ?? "", signal),
    enabled: !!name,
    staleTime: 60_000,
  })
}
