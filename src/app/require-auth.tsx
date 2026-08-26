import * as React from "react"
import { Navigate } from "react-router-dom"

import { useMe } from "@/features/auth/hooks"

function BootScreen() {
  return (
    <div
      className="flex min-h-svh items-center justify-center bg-background"
      role="status"
      aria-label="Loading session"
    >
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Blaze Hammer
        </span>
      </div>
    </div>
  )
}

/**
 * Route guard backed entirely by the backend session (`GET /api/v1/me`).
 * There is no client-side authentication state.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const me = useMe()

  if (me.isPending) {
    return <BootScreen />
  }

  if (me.isError || !me.data?.username) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
