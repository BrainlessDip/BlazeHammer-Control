import { useForm } from "react-hook-form"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Flame } from "lucide-react"

import { useMe, useLogin } from "@/features/auth/hooks"
import { ApiError } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(128, "Username is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(1024, "Password is too long"),
})

type LoginFormValues = z.infer<typeof loginSchema>

function describeLoginError(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : "Sign-in failed."
  }
  if (error.status === 401) return "Invalid username or password."
  if (error.status === 429) {
    return "Too many failed attempts. Wait a few minutes and try again."
  }
  if (error.isNetworkError) {
    return "Could not reach the Blaze Hammer backend. Is it running?"
  }
  return error.message || "Sign-in failed."
}

export function Login() {
  const me = useMe()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  const from =
    location.state && typeof location.state === "object" && "from" in location.state
      ? String((location.state as { from: unknown }).from)
      : "/dashboard"

  if (me.isSuccess) {
    return <Navigate to={from} replace />
  }

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => {
        void navigate(from, { replace: true })
      },
    })
  })

  const errorMessage = login.isError ? describeLoginError(login.error) : null

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4">
      {/* Subtle technical grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:44px_44px] opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,black_30%,transparent_100%)]"
      />

      <Card className="relative w-full max-w-sm gap-5 py-6">
        <CardHeader className="items-center text-center">
          <span
            className="mx-auto mb-1 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/25"
            aria-hidden="true"
          >
            <Flame className="size-6" />
          </span>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Blaze Hammer
          </CardTitle>
          <CardDescription>Sign in to your console</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                aria-invalid={!!form.formState.errors.username}
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!form.formState.errors.password}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign In"}
            </Button>

            <p className="text-center font-mono text-[11px] text-muted-foreground">
              Session handled by the Blaze Hammer backend
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
