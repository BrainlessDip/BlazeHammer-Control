import { api } from "@/lib/api"
import type {
  ConfigView,
  PlaceholderCatalog,
  ProjectInfo,
  SaveTemplatesRequest,
  SaveTemplatesResponse,
  SaveConfigRequest,
  TemplatesResponse,
} from "@/types/api"

export const configApi = {
  get(signal?: AbortSignal) {
    return api.get<ConfigView>("/config", { signal })
  },
  templates(signal?: AbortSignal) {
    return api.get<TemplatesResponse>("/config/templates", { signal })
  },
  saveTemplates(body: SaveTemplatesRequest, signal?: AbortSignal) {
    return api.post<SaveTemplatesResponse>("/config/templates/save", {
      body,
      signal,
    })
  },
  project(signal?: AbortSignal) {
    return api.get<ProjectInfo>("/config/project", { signal })
  },
  save(body: SaveConfigRequest) {
    return api.post<{ ok: boolean }>("/config/save", { body })
  },
}

export const placeholdersApi = {
  catalog(signal?: AbortSignal) {
    return api.get<PlaceholderCatalog>("/placeholders/catalog", {
      signal,
      timeoutMs: 20_000,
    })
  },
}
