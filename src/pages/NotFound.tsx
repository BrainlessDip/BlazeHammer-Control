import { Link } from "react-router-dom"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"

export function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Compass className="size-10 text-muted-foreground/40" aria-hidden="true" />
      <p className="font-mono text-4xl font-semibold tracking-tight">404</p>
      <p className="text-sm text-muted-foreground">
        This route does not exist in the console.
      </p>
      <Button variant="outline" size="sm" render={<Link to="/dashboard" />}>
        Back to dashboard
      </Button>
    </div>
  )
}
