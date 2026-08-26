import { api } from "@/lib/api"
import type {
  HealthResponse,
  InfoResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  OkResponse,
} from "@/types/api"

export const authApi = {
  login(body: LoginRequest) {
    return api.post<LoginResponse>("/auth/login", { body })
  },
  logout() {
    return api.post<OkResponse>("/auth/logout")
  },
  me(signal?: AbortSignal) {
    return api.get<MeResponse>("/me", { signal })
  },
}

export const systemApi = {
  health(signal?: AbortSignal) {
    return api.get<HealthResponse>("/health", { signal, timeoutMs: 5_000 })
  },
  info(signal?: AbortSignal) {
    return api.get<InfoResponse>("/info", { signal })
  },
}
