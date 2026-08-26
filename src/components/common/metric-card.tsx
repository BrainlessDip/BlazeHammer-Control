import type { LucideIcon } from "lucide-react"
import type * as React from "react"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: LucideIcon
  className?: string
}

/** Compact high-density metric tile used on the dashboard and run details. */
export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  className,
}: MetricCardProps) {
  return (
    <Card size="sm" className={cn("gap-2 py-3.5", className)}>
      <div className="flex items-center justify-between gap-2 px-4">
        <span className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
        {Icon && (
          <Icon className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
        )}
      </div>
      <div className="px-4">
        <div className="font-mono text-xl leading-none font-semibold tabular-nums">
          {value}
        </div>
        {sub !== undefined && (
          <div className="mt-1.5 font-mono text-xs text-muted-foreground tabular-nums">
            {sub}
          </div>
        )}
      </div>
    </Card>
  )
}

export function MetricCardSkeleton() {
  return (
    <Card size="sm" className="gap-2.5 py-3.5">
      <Skeleton className="mx-4 h-2.5 w-16" />
      <Skeleton className="mx-4 h-6 w-20" />
    </Card>
  )
}
