import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api"

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            // Never retry client errors except request timeouts.
            if (
              error.status >= 400 &&
              error.status < 500 &&
              error.status !== 408
            ) {
              return false
            }
          }
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/** App-wide singleton used by providers and bootstrap handlers. */
export const queryClient = createQueryClient()
