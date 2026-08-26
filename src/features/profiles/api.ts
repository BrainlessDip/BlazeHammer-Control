import { api } from "@/lib/api"
import type { ProfileDetail, ProfileSummary } from "@/types/api"

export const profilesApi = {
  list(signal?: AbortSignal) {
    return api.get<ProfileSummary[]>("/profiles", { signal })
  },
  get(name: string, signal?: AbortSignal) {
    return api.get<ProfileDetail>(
      `/profiles/${encodeURIComponent(name)}`,
      { signal }
    )
  },
}
