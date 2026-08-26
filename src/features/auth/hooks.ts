import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { qk } from "@/lib/query-keys"
import type { LoginRequest } from "@/types/api"
import { authApi, systemApi } from "./api"

/** Current session user. Backend is authoritative; never cached long. */
export function useMe(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.me,
    queryFn: ({ signal }) => authApi.me(signal),
    enabled: options.enabled ?? true,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}

export function useHealth() {
  return useQuery({
    queryKey: qk.health,
    queryFn: ({ signal }) => systemApi.health(signal),
    staleTime: 15_000,
    // Gentle polling keeps the topbar indicator honest without hammering.
    refetchInterval: 30_000,
    retry: 0,
  })
}

export function useInfo() {
  return useQuery({
    queryKey: qk.info,
    queryFn: ({ signal }) => systemApi.info(signal),
    staleTime: 5 * 60_000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: (data) => {
      queryClient.clear()
      // Seed `me` immediately so protected routes render without a flash.
      queryClient.setQueryData(qk.me, { username: data.username ?? "" })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      queryClient.cancelQueries()
      queryClient.clear()
    },
  })
}
