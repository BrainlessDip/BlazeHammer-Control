import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronRight, Play, RefreshCw, UsersRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState, ErrorState } from "@/components/common/states"
import { PageHeader } from "@/components/common/page-header"
import { ProfileSkeleton } from "@/components/common/loading-skeletons"
import { StartRunDialog } from "@/components/runs/start-run-dialog"
import { useProfiles } from "@/features/profiles/hooks"
import { setRunDraft } from "@/hooks/use-run-draft"

export function Profiles() {
  const profilesQuery = useProfiles()
  const navigate = useNavigate()
  const [runProfile, setRunProfile] = useState<string | null>(null)

  const profiles = profilesQuery.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Profiles"
        description="Reusable request scenarios loaded from the backend project."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void profilesQuery.refetch()}
            disabled={profilesQuery.isRefetching}
          >
            <RefreshCw
              className={profilesQuery.isRefetching ? "animate-spin" : undefined}
              aria-hidden="true"
            />
            Refresh
          </Button>
        }
      />

      {profilesQuery.isPending ? (
        <ProfileSkeleton />
      ) : profilesQuery.isError ? (
        <ErrorState
          title="Failed to load profiles"
          error={profilesQuery.error}
          retry={() => void profilesQuery.refetch()}
        />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={<UsersRound />}
          title="No profiles found"
          description="Add profile YAML files to the backend project directory to see them here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {profiles.map((profile) => (
            <Card key={profile.name} size="sm" className="py-0 transition-colors hover:bg-muted/40">
              <button
                type="button"
                onClick={() =>
                  void navigate(`/profiles/${encodeURIComponent(profile.name)}`)
                }
                aria-label={`Open profile ${profile.name}`}
                className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none rounded-lg"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-sm font-medium">
                    {profile.name}
                  </span>
                  <span
                    className="block truncate font-mono text-xs text-muted-foreground"
                    title={profile.path}
                  >
                    {profile.path}
                  </span>
                </span>
                <Badge variant="outline" className="hidden font-mono sm:inline-flex">
                  yaml
                </Badge>
                <Button
                  variant="ghost"
                  size="xs"
                  aria-label={`Run profile ${profile.name}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    setRunDraft({ profile: profile.name })
                    setRunProfile(profile.name)
                  }}
                >
                  <Play aria-hidden="true" /> Run
                </Button>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <StartRunDialog open={!!runProfile} onOpenChange={(open) => !open && setRunProfile(null)} />

      <p className="text-[11px] text-muted-foreground">
        Profiles are managed as files in the backend project; this console is
        read-only for them.{" "}
        <Link to="/settings" className="underline underline-offset-2 hover:text-foreground">
          Project location
        </Link>
      </p>
    </div>
  )
}
