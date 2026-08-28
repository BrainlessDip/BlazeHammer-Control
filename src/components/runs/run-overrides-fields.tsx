import type { UseFormReturn } from "react-hook-form"

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
import { BodyTypeSelector } from "@/components/body/body-type-selector"
import { useProfiles } from "@/features/profiles/hooks"
import {
  HTTP_METHODS,
  type RunFormInputs,
} from "@/features/runs/run-form"
import type { PostType } from "@/lib/body-types"
import { cn } from "@/lib/utils"

const NONE_SENTINEL = "__none__"

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
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

interface SectionLabelProps {
  children: React.ReactNode
}

function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
      {children}
    </p>
  )
}

interface RunOverridesFieldsProps {
  form: UseFormReturn<RunFormInputs>
  /** Show payload/header template textareas. */
  showTemplates?: boolean
}

/**
 * Full RunStartRequest field set, wired to a react-hook-form instance.
 * Values are strings in the form and converted to the exact API payload on
 * submit (see buildRunRequestBody).
 */
export function RunOverridesFields({
  form,
  showTemplates = true,
}: RunOverridesFieldsProps) {
  const profiles = useProfiles()
  const errors = form.formState.errors

  const method = form.watch("method")
  const profile = form.watch("profile")

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <SectionLabel>Request</SectionLabel>
        <Field
          label="Target"
          htmlFor="run-target"
          error={errors.target?.message}
          hint="Full URL, e.g. https://api.example.com/register"
        >
          <Input
            id="run-target"
            placeholder="https://api.example.com/register"
            aria-invalid={!!errors.target}
            {...form.register("target")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method" htmlFor="run-method" error={errors.method?.message}>
            <Select
              value={method}
              onValueChange={(value) => {
                if (typeof value === "string") form.setValue("method", value)
              }}
            >
              <SelectTrigger id="run-method" className="w-full">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Body type"
            htmlFor="run-post-type"
            error={errors.post_type?.message}
          >
            <BodyTypeSelector
              id="run-post-type"
              value={(form.watch("post_type") as PostType) || "json"}
              onChange={(v) => form.setValue("post_type", v)}
            />
          </Field>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <SectionLabel>Load</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Requests" htmlFor="run-requests" error={errors.requests?.message}>
            <Input
              id="run-requests"
              inputMode="numeric"
              placeholder="default"
              {...form.register("requests")}
            />
          </Field>
          <Field
            label="Concurrency"
            htmlFor="run-concurrency"
            error={errors.concurrency?.message}
          >
            <Input
              id="run-concurrency"
              inputMode="numeric"
              placeholder="default"
              {...form.register("concurrency")}
            />
          </Field>
          <Field label="Delay (s)" htmlFor="run-delay" error={errors.delay?.message}>
            <Input
              id="run-delay"
              inputMode="decimal"
              placeholder="default"
              {...form.register("delay")}
            />
          </Field>
          <Field
            label="Rate (req/s)"
            htmlFor="run-rate"
            error={errors.rate?.message}
          >
            <Input
              id="run-rate"
              inputMode="decimal"
              placeholder="unlimited"
              {...form.register("rate")}
            />
          </Field>
          <Field
            label="Timeout (s)"
            htmlFor="run-timeout"
            error={errors.timeout?.message}
          >
            <Input
              id="run-timeout"
              inputMode="decimal"
              placeholder="default"
              {...form.register("timeout")}
            />
          </Field>
          <Field label="Retries" htmlFor="run-retries" error={errors.retries?.message}>
            <Input
              id="run-retries"
              inputMode="numeric"
              placeholder="0"
              {...form.register("retries")}
            />
          </Field>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <SectionLabel>Data</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Profile" htmlFor="run-profile" error={errors.profile?.message}>
            <Select
              value={profile || NONE_SENTINEL}
              onValueChange={(value) => {
                if (typeof value !== "string") return
                form.setValue(
                  "profile",
                  value === NONE_SENTINEL ? "" : value
                )
              }}
            >
              <SelectTrigger id="run-profile" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SENTINEL}>
                  No profile
                </SelectItem>
                {(profiles.data ?? []).map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Faker locale"
            htmlFor="run-faker-locale"
            error={errors.faker_locale?.message}
          >
            <Input
              id="run-faker-locale"
              placeholder="en_US"
              {...form.register("faker_locale")}
            />
          </Field>
          <Field label="Seed" htmlFor="run-seed" error={errors.seed?.message}>
            <Input id="run-seed" inputMode="numeric" placeholder="random" {...form.register("seed")} />
          </Field>
        </div>

        {showTemplates && (
          <>
            <Field
              label="Payload template override"
              htmlFor="run-payload-text"
              error={errors.payload_text?.message}
              hint="Leave empty to use the configured payload file."
            >
              <textarea
                id="run-payload-text"
                spellCheck={false}
                rows={4}
                {...form.register("payload_text")}
                className="flex w-full resize-y rounded-md border border-transparent bg-input/50 px-3 py-2 font-mono text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </Field>
            <Field
              label="Headers template override"
              htmlFor="run-headers-text"
              error={errors.headers_text?.message}
              hint="Leave empty to use the configured headers file."
            >
              <textarea
                id="run-headers-text"
                spellCheck={false}
                rows={3}
                {...form.register("headers_text")}
                className="flex w-full resize-y rounded-md border border-transparent bg-input/50 px-3 py-2 font-mono text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </Field>
          </>
        )}
      </section>
    </div>
  )
}
