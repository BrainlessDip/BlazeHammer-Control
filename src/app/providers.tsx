import { QueryClientProvider } from "@tanstack/react-query"

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { WebSocketProvider } from "@/hooks/use-websocket"
import { queryClient } from "@/lib/query-client"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="blazehammer-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delay={300}>
          <WebSocketProvider>{children}</WebSocketProvider>
          <Toaster position="bottom-right" closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
