import { z } from "zod"

import type { ConfigView, RunStartRequest } from "@/types/api"

/**
 * Client-side validation for RunStartRequest / PreviewRequest style bodies.
 *
 * Form fields are kept as strings (inputs) and converted to the exact
 * snake_case API payload on submit. Ranges mirror the backend Field()
 * constraints one-to-one:
 *   requests 1..10_000_000 · concurrency 1..10_000 · delay 0..3600
 *   rate >0..1_000_000 · timeout >0..3600 · retries 0..10
 *   seed ±(2^63-1) · faker_locale ≤16 · profile ≤256 · target ≤2048
 */

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const

const optionalInteger = (
  min: number,
  max: number,
  label: string
) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") return true
      if (!/^-?\d+$/.test(value)) return false
      const parsed = Number(value)
      return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    }, `${label} must be an integer between ${min} and ${max}`)

const optionalDecimal = (
  min: number,
  max: number,
  label: string,
  exclusiveMin = false
) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") return true
      if (!/^-?\d+(\.\d+)?$/.test(value)) return false
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return false
      if (exclusiveMin) return parsed > min && parsed <= max
      return parsed >= min && parsed <= max
    },
    exclusiveMin
      ? `${label} must be greater than ${min} and at most ${max}`
      : `${label} must be between ${min} and ${max}`)

export const runFormSchema = z.object({
  target: z
    .string()
    .trim()
    .min(1, "Target URL is required")
    .max(2048, "Target is limited to 2048 characters"),
  method: z
    .string()
    .trim()
    .min(1, "Method is required")
    .max(16, "Method is too long"),
  post_type: z.string().trim().max(64, "Post type is too long"),
  requests: optionalInteger(1, 10_000_000, "Requests"),
  concurrency: optionalInteger(1, 10_000, "Concurrency"),
  delay: optionalDecimal(0, 3600, "Delay"),
  rate: optionalDecimal(0, 1_000_000, "Rate", true),
  timeout: optionalDecimal(0, 3600, "Timeout", true),
  retries: optionalInteger(0, 10, "Retries"),
  seed: optionalInteger(
    -(2 ** 63 - 1),
    2 ** 63 - 1,
    "Seed"
  ),
  faker_locale: z.string().trim().max(16, "Locale is limited to 16 characters"),
  profile: z.string().trim().max(256, "Profile name is too long"),
  headers_text: z.string().max(1_000_000, "Headers template is too large"),
  payload_text: z.string().max(4_000_000, "Payload template is too large"),
})

export type RunFormInputs = {
  target: string
  method: string
  post_type: string
  requests: string
  concurrency: string
  delay: string
  rate: string
  timeout: string
  retries: string
  seed: string
  faker_locale: string
  profile: string
  headers_text: string
  payload_text: string
}

/** Defaults sourced from the saved configuration (GET /api/v1/config). */
export function runFormDefaultsFromConfig(config: ConfigView | undefined): RunFormInputs {
  return {
    target: config?.target ?? "",
    method: config?.method ?? "GET",
    post_type: config?.post_type ?? "",
    requests: config?.requests !== undefined ? String(config.requests) : "",
    concurrency:
      config?.concurrency !== undefined ? String(config.concurrency) : "",
    delay: config?.delay !== undefined ? String(config.delay) : "",
    rate: config?.rate !== undefined && config?.rate !== null ? String(config.rate) : "",
    timeout: config?.timeout !== undefined ? String(config.timeout) : "",
    retries: config?.retries !== undefined ? String(config.retries) : "",
    seed: config?.seed !== undefined && config?.seed !== null ? String(config.seed) : "",
    faker_locale: config?.faker_locale ?? "",
    profile: "",
    headers_text: "",
    payload_text: "",
  }
}

function optionalNumberValue(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function setIfDefined<T extends object>(
  target: T,
  key: keyof T,
  value: unknown
): void {
  if (value === undefined || value === null || value === "") return
  ;(target as Record<string, unknown>)[key as string] = value
}

/**
 * Converts validated string form values into the exact RunStartRequest /
 * PreviewRequest payload. Unset fields are omitted so the backend applies
 * its own configuration defaults.
 */
export function buildRunRequestBody(
  values: RunFormInputs,
  extras?: { count?: number }
): Partial<RunStartRequest> & { count?: number } {
  const body: Record<string, unknown> = {}

  setIfDefined(body, "target", values.target.trim() || undefined)
  setIfDefined(body, "method", values.method.trim() || undefined)
  setIfDefined(body, "post_type", values.post_type.trim() || undefined)
  setIfDefined(body, "profile", values.profile.trim() || undefined)
  setIfDefined(body, "faker_locale", values.faker_locale.trim() || undefined)
  setIfDefined(body, "requests", optionalNumberValue(values.requests))
  setIfDefined(body, "concurrency", optionalNumberValue(values.concurrency))
  setIfDefined(body, "delay", optionalNumberValue(values.delay))
  setIfDefined(body, "rate", optionalNumberValue(values.rate))
  setIfDefined(body, "timeout", optionalNumberValue(values.timeout))
  setIfDefined(body, "retries", optionalNumberValue(values.retries))
  setIfDefined(body, "seed", optionalNumberValue(values.seed))

  if (values.headers_text.trim()) body.headers_text = values.headers_text
  if (values.payload_text.trim()) body.payload_text = values.payload_text

  if (extras?.count !== undefined) body.count = extras.count

  // Keys are written exclusively through the typed setIfDefined calls above.
  return body as Partial<RunStartRequest> & { count?: number }
}
