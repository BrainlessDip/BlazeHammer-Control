import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { qk } from "@/lib/query-keys"
import type { PlaceholderCatalog } from "@/types/api"
import { placeholdersApi } from "@/features/config/api"
import {
  indexCatalog,
} from "@/features/placeholders/completion"
import { LOCAL_FALLBACK_CATALOG } from "@/features/placeholders/local-catalog"
import {
  getCatalog,
  setCatalog,
  subscribeCatalog,
} from "@/features/placeholders/catalog-store"

/**
 * Placeholder metadata for the editors.
 *
 * Source of truth is GET /placeholders/catalog; the local fallback keeps the
 * editor usable against backends that predate the endpoint. The catalog
 * store mirrors query state so Monaco providers always read fresh data.
 */
export function usePlaceholderCatalog() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: qk.catalog,
    queryFn: ({ signal }) => placeholdersApi.catalog(signal),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 1,
  })

  // Mirror into the module-level store for Monaco providers.
  if (query.data && getCatalog()?.version !== query.data.version) {
    setCatalog(query.data)
  }

  const effective = query.isError ? LOCAL_FALLBACK_CATALOG : (query.data ?? null)

  return {
    catalog: effective,
    /** Null when serving the offline fallback. */
    fromBackend: query.isSuccess,
    isLoading: query.isPending,
    refresh: () => query.refetch(),
    /** Used by the WS bridge to push refreshed metadata. */
    apply: (catalog: PlaceholderCatalog) => {
      queryClient.setQueryData(qk.catalog, catalog)
      setCatalog(catalog)
    },
  }
}

export function useCatalogIndex(catalog: PlaceholderCatalog | null | undefined) {
  return useMemo(() => indexCatalog(catalog ?? undefined), [catalog])
}

export { subscribeCatalog }
