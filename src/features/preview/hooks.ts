import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import type { PreviewRequest } from "@/types/api"
import { previewApi, validationApi } from "./api"

export function usePreview() {
  return useMutation({
    mutationFn: (body: PreviewRequest) => previewApi.run(body),
    onSuccess: (data) => {
      if (!data.plans.length) {
        toast.warning("Preview returned no plans")
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Preview failed"
      )
    },
  })
}

export function useValidateRequest() {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      validationApi.validate(body),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Validation request failed"
      )
    },
  })
}
