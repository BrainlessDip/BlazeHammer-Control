import type * as React from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-1 text-muted-foreground/60 [&_svg]:size-8" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  error?: unknown
  retry?: () => void
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  error,
  retry,
  className,
}: ErrorStateProps) {
  const message =
    error instanceof Error ? error.message : "Unexpected error occurred."
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center",
        className
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-md font-mono text-xs break-all text-destructive">
        {message}
      </p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          Try again
        </button>
      )}
    </div>
  )
}
