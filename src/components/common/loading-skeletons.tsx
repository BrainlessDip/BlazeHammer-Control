import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} size="sm" className="gap-2.5 py-3.5">
            <Skeleton className="mx-4 h-2.5 w-16" />
            <Skeleton className="mx-4 h-6 w-20" />
          </Card>
        ))}
      </div>
      <Skeleton className="h-44 w-full" />
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <Skeleton className="hidden w-full lg:block" />
    </div>
  )
}

export function ConfigSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} size="sm" className="gap-3">
          <Skeleton className="mx-4 h-3 w-24" />
          <div className="mx-4 mb-1 flex flex-col gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="min-h-[280px] w-full" />
      <Skeleton className="h-6 w-72" />
    </div>
  )
}
