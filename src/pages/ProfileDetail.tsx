import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, FileCode2, Play } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/common/states"
import { JsonViewer } from "@/components/common/json-viewer"
import { StartRunDialog } from "@/components/runs/start-run-dialog"
import { useProfile } from "@/features/profiles/hooks"
import { setRunDraft } from "@/hooks/use-run-draft"

export function ProfileDetailPage() {
  const { name = "" } = useParams()
  const profileQuery = useProfile(name)
  const [runOpen, setRunOpen] = useState(false)

  if (profileQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    )
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink name={name} />
        <ErrorState
          title="Failed to load profile"
          error={profileQuery.error}
          retry={() => void profileQuery.refetch()}
        />
      </div>
    )
  }

  const profile = profileQuery.data

  return (
    <div className="flex flex-col gap-4">
      <BackLink name={name} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-mono text-lg font-semibold tracking-tight">
          {profile.name}
        </h1>
        <Badge variant="outline" className="font-mono">
          profile
        </Badge>
        <span
          className="min-w-0 truncate font-mono text-xs text-muted-foreground"
          title={profile.path}
        >
          {profile.path}
        </span>

        <Button
          size="sm"
          className="ml-auto"
          onClick={() => {
            setRunDraft({ profile: profile.name })
            setRunOpen(true)
          }}
        >
          <Play aria-hidden="true" /> Run Profile
        </Button>
      </div>

      <Card className="min-h-0 flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <FileCode2 className="size-4 text-muted-foreground" aria-hidden="true" />
            Configuration data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <JsonViewer value={profile.data} mask={false} maxHeightClass="max-h-[60vh]" />
        </CardContent>
      </Card>

      <StartRunDialog open={runOpen} onOpenChange={setRunOpen} />
    </div>
  )
}

function BackLink({ name }: { name: string }) {
  return (
    <Link
      to="/profiles"
      className="inline-flex w-fit items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Profiles{name ? ` / ${name}` : ""}
    </Link>
  )
}