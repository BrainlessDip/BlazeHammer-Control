import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  CircleCheckIcon,
  CircleXIcon,
  LogOut,
  MonitorIcon,
  MoonIcon,
  Settings,
  SunIcon,
} from "lucide-react"

import { useSidebar } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { WebSocketStatus } from "@/components/common/connection-status"
import { ConnectionModal } from "@/components/connection/connection-modal"
import { useLogout, useMe, useHealth } from "@/features/auth/hooks"
import { useTheme } from "@/components/theme-provider"
import { useConnection } from "@/hooks/use-connection"
import type { LucideIcon } from "lucide-react"
import React from "react"

const TITLES: Array<{ match: (path: string) => boolean; title: string }> = [
  { match: (p) => p.startsWith("/dashboard"), title: "Dashboard" },
  { match: (p) => /^\/runs\/.+/.test(p), title: "Run details" },
  { match: (p) => p.startsWith("/runs"), title: "Runs" },
  { match: (p) => p.startsWith("/configuration"), title: "Configuration" },
  { match: (p) => p.startsWith("/payload"), title: "Payload template" },
  { match: (p) => p.startsWith("/headers"), title: "Headers template" },
  { match: (p) => /^\/profiles\/.+/.test(p), title: "Profile" },
  { match: (p) => p.startsWith("/profiles"), title: "Profiles" },
  { match: (p) => p.startsWith("/settings"), title: "System & settings" },
]

function pageTitle(pathname: string): string {
  for (const entry of TITLES) {
    if (entry.match(pathname)) return entry.title
  }
  return "Blaze Hammer"
}

function HealthIndicator() {
  const health = useHealth()

  if (health.isPending) {
    return (
      <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
        Backend …
      </span>
    )
  }

  if (health.isError || !health.data) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className="inline-flex items-center gap-1.5 font-mono text-xs text-destructive"
              role="status"
              aria-label="Backend unreachable"
            >
              <CircleXIcon className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Backend</span>
            </span>
          }
        />
        <TooltipContent>Backend is unreachable</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="inline-flex items-center gap-1.5 font-mono text-xs text-success"
            role="status"
            aria-label="Backend healthy"
          >
            <CircleCheckIcon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Backend</span>
          </span>
        }
      />
      <TooltipContent>
        Backend healthy ({String(health.data.service)})
      </TooltipContent>
    </Tooltip>
  )
}

const THEME_OPTIONS: Array<{
  value: "light" | "dark" | "system"
  label: string
  icon: LucideIcon
}> = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
]

function UserMenu() {
  const me = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { isMobile } = useSidebar()

  const username = me.data?.username ?? ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={isMobile ? "icon" : "sm"}
            aria-label="User menu"
            className="gap-2 font-mono text-xs"
          >
            <span
              className="flex size-5 items-center justify-center rounded-sm bg-primary/15 text-[10px] font-semibold text-primary uppercase"
              aria-hidden="true"
            >
              {(username[0] ?? "?").toUpperCase()}
            </span>
            {!isMobile && username}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        {/* Base UI: GroupLabel is only valid inside a Group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">
            {username}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as typeof theme)}
        >
          {THEME_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <option.icon aria-hidden="true" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void navigate("/settings")}>
          <Settings aria-hidden="true" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ConnectionIndicator({ onClick }: { onClick: () => void }) {
  const { displayUrl, isConnected } = useConnection()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs transition-colors hover:bg-muted"
            aria-label="Change backend connection"
          >
            <span
              className={`size-1.5 rounded-full ${isConnected ? "bg-success" : "bg-destructive"}`}
            />
            <span className="hidden sm:inline">{displayUrl}</span>
          </button>
        }
      />
      <TooltipContent>
        {isConnected ? `Connected to ${displayUrl}` : "Disconnected"}
      </TooltipContent>
    </Tooltip>
  )
}

export function Topbar() {
  const { pathname } = useLocation()
  const [connectionModalOpen, setConnectionModalOpen] = React.useState(false)

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3 md:px-4">
      <SidebarTrigger aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="h-4!" />
      <Link
        to="/dashboard"
        className="truncate text-sm font-medium tracking-tight hover:text-foreground/80"
      >
        {pageTitle(pathname)}
      </Link>

      <div className="ml-auto flex items-center gap-3 md:gap-4">
        <HealthIndicator />
        <ConnectionIndicator onClick={() => setConnectionModalOpen(true)} />
        <WebSocketStatus className="hidden sm:inline-flex" />
        <WebSocketStatus className="sm:hidden" showLabel={false} />
        <UserMenu />
      </div>

      <ConnectionModal
        open={connectionModalOpen}
        onOpenChange={setConnectionModalOpen}
      />
    </header>
  )
}
