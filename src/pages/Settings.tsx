import {
  CircleCheckIcon,
  CircleXIcon,
  Database,
  Flame,
  MonitorSmartphone,
  MoonIcon,
  PlugZap,
  SunIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { WebSocketStatus } from "@/components/common/connection-status"
import { PageHeader } from "@/components/common/page-header"
import { useHealth, useInfo, useMe } from "@/features/auth/hooks"
import { useProjectInfo } from "@/features/config/hooks"
import { useTheme } from "@/components/theme-provider"
import { backendOrigin } from "@/app/config"

function FeatureBadge({ label, supported }: { label: string; supported: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs">
      {supported ? (
        <CircleCheckIcon className="size-3.5 text-success" aria-hidden="true" />
      ) : (
        <CircleXIcon className="size-3.5 text-destructive" aria-hidden="true" />
      )}
      <span className={supported ? "" : "text-muted-foreground"}>{label}</span>
    </span>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className="min-w-0 truncate text-right font-mono text-xs"
        title={typeof value === "string" ? value : undefined}
      >
        {value ?? "—"}
      </span>
    </div>
  )
}

export function Settings() {
  const info = useInfo()
  const health = useHealth()
  const me = useMe()
  const project = useProjectInfo()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <PageHeader
        title="System & settings"
        description="Backend information, connection state, and console preferences."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Blaze Hammer info */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flame className="size-4 text-primary" aria-hidden="true" />
              Blaze Hammer
            </CardTitle>
            <CardDescription>Reported by GET /api/v1/info</CardDescription>
          </CardHeader>
          <CardContent>
            {info.isPending ? (
              <div className="flex flex-col gap-2 py-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : info.isError ? (
              <p className="font-mono text-xs text-destructive">Unavailable</p>
            ) : (
              <>
                <div className="divide-y">
                  <InfoRow label="Name" value={info.data.name} />
                  <InfoRow label="Version" value={info.data.version} />
                  <InfoRow label="API version" value={info.data.api_version} />
                  <InfoRow label="Status" value={info.data.status} />
                </div>

                <Separator className="my-3" />
                <p className="mb-2 text-[11px] tracking-widest text-muted-foreground uppercase">
                  Features
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <FeatureBadge
                    label="websocket"
                    supported={!!info.data.features?.websocket}
                  />
                  <FeatureBadge
                    label="profiles"
                    supported={!!info.data.features?.profiles}
                  />
                  <FeatureBadge
                    label="faker"
                    supported={!!info.data.features?.faker}
                  />
                  <FeatureBadge
                    label="preview"
                    supported={!!info.data.features?.preview}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Connection */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PlugZap className="size-4 text-muted-foreground" aria-hidden="true" />
              Connection
            </CardTitle>
            <CardDescription>This browser session to the backend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              <InfoRow label="Backend URL" value={backendOrigin() || "same-origin"} />
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">WebSocket</span>
                <WebSocketStatus />
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">Backend health</span>
                {health.isPending ? (
                  <Skeleton className="h-4 w-16" />
                ) : health.isError ? (
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-destructive">
                    <CircleXIcon className="size-3.5" aria-hidden="true" /> Unreachable
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-success">
                    <CircleCheckIcon className="size-3.5" aria-hidden="true" /> Healthy
                  </span>
                )}
              </div>
              <InfoRow label="Logged-in user" value={me.data?.username ?? "—"} />
            </div>
          </CardContent>
        </Card>

        {/* Project */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="size-4 text-muted-foreground" aria-hidden="true" />
              Project
            </CardTitle>
            <CardDescription>Server-side project location (read-only)</CardDescription>
          </CardHeader>
          <CardContent>
            {project.isPending ? (
              <div className="flex flex-col gap-2 py-1">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-5 w-48" />
              </div>
            ) : project.isError ? (
              <p className="font-mono text-xs text-destructive">
                Unavailable — is a blazehammer project initialized?
              </p>
            ) : (
              <div className="divide-y">
                <InfoRow label="Directory" value={project.data.project_dir} />
                <InfoRow label="Config file" value={project.data.project_file} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MonitorSmartphone className="size-4 text-muted-foreground" aria-hidden="true" />
              Appearance
            </CardTitle>
            <CardDescription>Stored locally in this browser</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            {(
              [
                { value: "light", label: "Light", icon: SunIcon },
                { value: "dark", label: "Dark", icon: MoonIcon },
                { value: "system", label: "System", icon: MonitorSmartphone },
              ] as const
            ).map((option) => (
              <Button
                key={option.value}
                variant={theme === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(option.value)}
                aria-pressed={theme === option.value}
              >
                <option.icon aria-hidden="true" />
                {option.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        The frontend never displays or stores backend secrets. Credentials are
        verified exclusively by the server; sessions live in an HttpOnly cookie.
      </p>
    </div>
  )
}
