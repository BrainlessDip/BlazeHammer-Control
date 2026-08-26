import { api } from "@/lib/api"
import type {
  PreviewRequest,
  PreviewResponse,
  ValidationResponse,
} from "@/types/api"

export const previewApi = {
  run(body: PreviewRequest) {
    return api.post<PreviewResponse>("/preview", { body })
  },
}

export const validationApi = {
  validate(body: Record<string, unknown>) {
    return api.post<ValidationResponse>("/validate", { body })
  },
}
