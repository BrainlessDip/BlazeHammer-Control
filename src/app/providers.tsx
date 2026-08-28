/**
 * Application provider tree.
 *
 * QueryClientProvider lives in main.tsx (above ConnectionProvider).
 * This component provides: Theme, Tooltip, WebSocket, Toaster, and the
 * connection gate + modal that controls app rendering.
 */
/* eslint-disable react-hooks/set-state-in-effect -- legitimate async state init in effects */

import * as React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { WebSocketProvider } from "@/hooks/use-websocket"
import { ConnectionModal } from "@/components/connection/connection-modal"
import { useConnection } from "@/hooks/use-connection"

// ---------------------------------------------------------------------------
// ConnectionGate — controls app rendering based on connection state
// ---------------------------------------------------------------------------

function ConnectionGate({ children }: { children: React.ReactNode }) {
  const { isInitializing, isConnected, status } = useConnection()
  const [modalOpen, setModalOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isInitializing && !isConnected) {
      setModalOpen(true)
    }
  }, [isInitializing, isConnected])

  React.useEffect(() => {
    if (isConnected) {
      setModalOpen(false)
    }
  }, [isConnected])

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Connecting…</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <>
        <ConnectionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          dismissible={status === "disconnected"}
        />
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
            <p className="text-sm text-muted-foreground">Connecting…</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <ConnectionModal open={modalOpen} onOpenChange={setModalOpen} />
      {children}
    </>
  )
}

// ---------------------------------------------------------------------------
// AppProviders
// ---------------------------------------------------------------------------

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="blazehammer-theme">
      <ConnectionGate>
        <TooltipProvider delay={300}>
          <WebSocketProvider>{children}</WebSocketProvider>
          <Toaster position="bottom-right" closeButton />
        </TooltipProvider>
      </ConnectionGate>
    </ThemeProvider>
  )
}
