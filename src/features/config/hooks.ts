import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { qk } from "@/lib/query-keys"
import type { SaveConfigRequest } from "@/types/api"
import { configApi } from "./api"

export function useConfig() {
  return useQuery({
    queryKey: qk.config,
    queryFn: ({ signal }) => configApi.get(signal),
    staleTime: 30_000,
  })
}

export function useTemplates() {
  return useQuery({
    queryKey: qk.templates,
    queryFn: ({ signal }) => configApi.templates(signal),
    staleTime: 60_000,
  })
}

export function useProjectInfo() {
  return useQuery({
    queryKey: qk.project,
    queryFn: ({ signal }) => configApi.project(signal),
    staleTime: 5 * 60_000,
  })
}

/**
 * Saves configuration. On success, invalidates the config and template queries.
 */
export function useSaveConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveConfigRequest) => configApi.save({ ...body }),
    onSuccess: () => {
      toast.success("Configuration saved")
      void queryClient.invalidateQueries({ queryKey: qk.config })
      void queryClient.invalidateQueries({ queryKey: qk.templates })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save configuration"
      )
    },
  })
}
