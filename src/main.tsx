import { StrictMode, useEffect, useRef } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"

import "./index.css"
import { AppProviders } from "@/app/providers"
import { ConnectionProvider, useConnection } from "@/hooks/use-connection"
import { queryClient } from "@/lib/query-client"
import { router } from "@/app/router"

/* eslint-disable react-refresh/only-export-components -- file has createRoot call, no exports needed */

/** Invalidates all React Query caches when the backend URL changes. */
function ConnectionSync() {
  const qc = useQueryClient()
  const { isConnected, backendUrl } = useConnection()
  const prevUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (isConnected && backendUrl && prevUrlRef.current !== backendUrl) {
      void qc.invalidateQueries()
    }
    prevUrlRef.current = backendUrl
  }, [isConnected, backendUrl, qc])

  return null
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider>
        <ConnectionSync />
        <AppProviders>
          <RouterProvider router={router} />
        </AppProviders>
      </ConnectionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
