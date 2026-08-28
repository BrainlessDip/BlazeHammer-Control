import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FileJson, Info, Save, ScrollText, ShieldCheck } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { getBodyTypeOption } from "@/lib/body-types"
import { Switch } from "@/components/ui/switch"
import { ConfigSkeleton } from "@/components/common/loading-skeletons"
import { ErrorState } from "@/components/common/states"
import { PageHeader } from "@/components/common/page-header"
import { useConfig, useSaveConfig } from "@/features/config/hooks"
import type { SaveConfigRequest } from "@/types/api"

const configSchema = z.object({
  target: z
    .string()
    .trim()
    .min(1, "Target URL is required")
    .max(2048, "Target is limited to 2048 characters"),
  method: z.string().trim().min(1, "Method is required").max(16),
  requests: z
    .string()
    .trim()
    .refine((v) => {
      if (!/^\d+$/.test(v)) return false
      const n = Number(v)
      return n >= 1 && n <= 10_000_000
    }, "Requests must be an integer between 1 and 10,000,000"),
  concurrency: z
    .string()
    .trim()
    .refine((v) => {
      if (!/^\d+$/.test(v)) return false
      const n = Number(v)
      return n >= 1 && n <= 10_000
    }, "Concurrency must be an integer between 1 and 10,000"),
  delay: z
    .string()
    .trim()
    .refine((v) => {
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 && n <= 3600
    }, "Delay must be between 0 and 3600 seconds"),
  timeout: z
    .string()
    .trim()
    .refine((v) => {
      const n = Number(v)
      return Number.isFinite(n) && n > 0 && n <= 3600
    }, "Timeout must be greater than 0 and at most 3600 seconds"),
  faker_locale: z.string().trim().max(16, "Locale is limited to 16 characters"),
})

type ConfigFormValues = z.infer<typeof configSchema>

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
      {children}
    </p>
  )
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
        {value ?? "—"}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Configuration() {
  const configQuery = useConfig()
  const saveConfig = useSaveConfig()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      target: "",
      method: "",
      requests: "",
      concurrency: "",
      delay: "",
      timeout: "",
      faker_locale: "",
    },
  })

  useEffect(() => {
    const config = configQuery.data
    if (!config) return
    form.reset({
      target: config.target ?? "",
      method: config.method ?? "",
      requests: String(config.requests ?? ""),
      concurrency: String(config.concurrency ?? ""),
      delay: String(config.delay ?? ""),
      timeout: String(config.timeout ?? ""),
      faker_locale: config.faker_locale ?? "",
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configQuery.data])

  const watched = form.watch()
  const dirty = useMemo(() => {
    const config = configQuery.data
    if (!config) return false
    return (
      watched.target !== (config.target ?? "") ||
      watched.method !== (config.method ?? "") ||
      watched.requests !== String(config.requests ?? "") ||
      watched.concurrency !== String(config.concurrency ?? "") ||
      watched.delay !== String(config.delay ?? "") ||
      watched.timeout !== String(config.timeout ?? "") ||
      watched.faker_locale !== (config.faker_locale ?? "")
    )
  }, [watched, configQuery.data])

  const submitAndConfirm = form.handleSubmit(() => setConfirmOpen(true))

  const handleConfirmedSave = () => {
    const values = form.getValues()
    const body: SaveConfigRequest = {
      target: values.target.trim(),
      method: values.method.trim(),
      requests: Number(values.requests),
      concurrency: Number(values.concurrency),
      delay: Number(values.delay),
      timeout: Number(values.timeout),
      faker_locale: values.faker_locale.trim() || null,
    }
    saveConfig.mutate(body, {
      onSuccess: () => setConfirmOpen(false),
    })
  }

  const config = configQuery.data

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Configuration"
        description="Saved project configuration used as the default for runs."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={!dirty}
              onClick={() => form.reset()}
            >
              Discard changes
            </Button>
            <Button
              size="sm"
              disabled={!dirty || saveConfig.isPending}
              onClick={() => void submitAndConfirm()}
            >
              <Save aria-hidden="true" /> Save Configuration
            </Button>
          </>
        }
      />

      {/* Mode banner */}
      <div className="flex items-start gap-2.5 rounded-md border bg-muted/40 px-3.5 py-3">
        <Info
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          You are editing the{" "}
          <Badge className="mx-0.5 font-mono tracking-wider">
            SAVED CONFIGURATION
          </Badge>{" "}
          applied by every run that has no explicit overrides. For a one-off
          run, use{" "}
          <Link
            to="/dashboard"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Start Run
          </Link>{" "}
          on the dashboard instead — those values are never persisted. The
          backend persists target, method, requests and concurrency when saving.
        </p>
      </div>

      {configQuery.isPending ? (
        <ConfigSkeleton />
      ) : configQuery.isError ? (
        <ErrorState
          title="Failed to load configuration"
          error={configQuery.error}
          retry={() => void configQuery.refetch()}
        />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submitAndConfirm()
          }}
          className="grid grid-cols-1 gap-4 xl:grid-cols-2"
        >
          <Card size="sm" className="gap-4">
            <SectionLabel>General</SectionLabel>
            <div className="mx-4 flex flex-col gap-3 pb-1">
              <Field
                label="Target"
                htmlFor="cfg-target"
                error={form.formState.errors.target?.message}
                hint="Full request URL"
              >
                <Input
                  id="cfg-target"
                  {...form.register("target")}
                  aria-invalid={!!form.formState.errors.target}
                />
              </Field>
              <Field
                label="Method"
                htmlFor="cfg-method"
                error={form.formState.errors.method?.message}
              >
                <Controller
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="cfg-method" className="w-full">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="HEAD">HEAD</SelectItem>
                        <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </Card>

          <Card size="sm" className="gap-4">
            <SectionLabel>Load</SectionLabel>
            <div className="mx-4 grid grid-cols-2 gap-3 pb-1">
              <Field
                label="Requests"
                htmlFor="cfg-requests"
                error={form.formState.errors.requests?.message}
              >
                <Input
                  id="cfg-requests"
                  inputMode="numeric"
                  {...form.register("requests")}
                />
              </Field>
              <Field
                label="Concurrency"
                htmlFor="cfg-concurrency"
                error={form.formState.errors.concurrency?.message}
              >
                <Input
                  id="cfg-concurrency"
                  inputMode="numeric"
                  {...form.register("concurrency")}
                />
              </Field>
              <Field
                label="Delay (s)"
                htmlFor="cfg-delay"
                error={form.formState.errors.delay?.message}
              >
                <Input
                  id="cfg-delay"
                  inputMode="decimal"
                  {...form.register("delay")}
                />
              </Field>
              <ReadOnlyField
                label="Rate (req/s)"
                value={config?.rate ?? "unlimited"}
                hint="Read-only — override per run"
              />
            </div>
          </Card>

          <Card size="sm" className="gap-4">
            <SectionLabel>HTTP</SectionLabel>
            <div className="mx-4 grid grid-cols-2 gap-3 pb-1">
              <Field
                label="Timeout (s)"
                htmlFor="cfg-timeout"
                error={form.formState.errors.timeout?.message}
              >
                <Input
                  id="cfg-timeout"
                  inputMode="decimal"
                  {...form.register("timeout")}
                />
              </Field>
              <ReadOnlyField
                label="Retries"
                value={config?.retries ?? "—"}
                hint="Read-only — override per run"
              />
              <ReadOnlyField
                label="Body type"
                value={getBodyTypeOption(config?.post_type).label}
              />
            </div>
          </Card>

          <Card size="sm" className="gap-4">
            <SectionLabel>Faker</SectionLabel>
            <div className="mx-4 grid grid-cols-2 gap-3 pb-1">
              <Field
                label="Locale"
                htmlFor="cfg-faker-locale"
                error={form.formState.errors.faker_locale?.message}
              >
                <Input
                  id="cfg-faker-locale"
                  placeholder="en_US"
                  {...form.register("faker_locale")}
                />
              </Field>
              <ReadOnlyField label="Seed" value={config?.seed ?? "random"} />
            </div>
          </Card>

          <Card size="sm" className="gap-4 xl:col-span-2">
            <SectionLabel>Files</SectionLabel>
            <div className="mx-4 grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2">
              <ReadOnlyField
                label="Payload file"
                value={config?.payload_file ?? "(inline template)"}
              />
              <ReadOnlyField
                label="Headers file"
                value={config?.headers_file ?? "(none)"}
              />
            </div>
            <div className="mx-4 flex flex-wrap items-center gap-2 pb-1">
              <Button
                variant="outline"
                size="xs"
                render={<Link to="/payload" />}
              >
                <FileJson aria-hidden="true" /> Edit payload template
              </Button>
              <Button
                variant="outline"
                size="xs"
                render={<Link to="/headers" />}
              >
                <ScrollText aria-hidden="true" /> Edit headers template
              </Button>
            </div>
          </Card>

          <Card size="sm" className="gap-4 xl:col-span-2">
            <SectionLabel>Server capabilities</SectionLabel>
            <div className="mx-4 flex flex-wrap items-center gap-6 pb-1">
              <label className="flex items-center gap-2.5">
                <Switch
                  checked={config?.web_enabled ?? false}
                  disabled
                  aria-label="Web enabled"
                />
                <span className="text-sm">Web console</span>
              </label>
              <label className="flex items-center gap-2.5">
                <Switch
                  checked={config?.auth_enabled ?? false}
                  disabled
                  aria-label="Auth enabled"
                />
                <span className="text-sm">Authentication required</span>
              </label>
              <span className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Reported by backend
              </span>
            </div>
          </Card>

          <Separator className="hidden" />
        </form>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Save configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will modify the project configuration file on disk
              (blazehammer.yaml). The change applies to future runs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmedSave()
              }}
              disabled={saveConfig.isPending}
            >
              {saveConfig.isPending ? "Saving…" : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
