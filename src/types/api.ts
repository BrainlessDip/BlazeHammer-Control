/**
 * REST contract types mirroring the Blaze Hammer OpenAPI schema exactly.
 * Field names intentionally stay snake_case as defined by the backend.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  ok: boolean
  username: string | null
}

export interface MeResponse {
  username: string
}

export interface OkResponse {
  ok: boolean
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string
  service: string
}

export interface InfoFeatures {
  websocket: boolean
  profiles: boolean
  faker: boolean
  preview: boolean
}

export interface InfoResponse {
  name: string
  version: string
  status: string
  api_version: string
  features: InfoFeatures
}

export interface ProjectInfo {
  project_dir: string
  project_file: string
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Resolved run configuration (safe subset) served by GET /api/v1/config. */
export interface ConfigView {
  target: string
  method: string
  requests: number
  concurrency: number
  delay: number
  timeout: number
  retries: number
  rate: number | null
  seed: number | null
  faker_locale: string | null
  post_type: string
  payload_file: string | null
  headers_file: string | null
  web_enabled: boolean
  auth_enabled: boolean
}

export interface TemplatesResponse {
  payload_text: string | null
  headers_text: string | null
  payload_file: string | null
  headers_file: string | null
  payload_revision: string | null
  headers_revision: string | null
}

/** Body of POST /api/v1/config/templates/save. Omitted fields are never written. */
export interface SaveTemplatesRequest {
  payload?: string
  headers?: string
  payload_revision?: string
  headers_revision?: string
}

export interface SaveTemplatesResponse {
  ok: boolean
  saved: string[]
  payload_revision: string | null
  headers_revision: string | null
}

/** Structured template error details (INVALID_JSON / TEMPLATE_CONFLICT / …). */
export interface TemplateErrorDetails {
  code: string
  message: string
  file?: string
  line?: number
  column?: number
  current_revision?: string | null
}

// ---------------------------------------------------------------------------
// Placeholder catalog
// ---------------------------------------------------------------------------

export interface PlaceholderParameter {
  name: string
  kind?: string
  type?: string
  default?: string
}

export type PlaceholderKind = "builtin" | "faker" | "faker.provider"

/** One completable placeholder as served by GET /api/v1/placeholders/catalog. */
export interface Placeholder {
  name: string
  kind: PlaceholderKind | string
  description: string
  syntax: string
  insert_text: string
  returns: string | null
  example: string | null
  parameters: PlaceholderParameter[]
  path: string | null
}

export interface ProviderInfo {
  family: string
  builtin: boolean
  methods: Placeholder[]
}

export interface PlaceholderCatalog {
  version: number
  faker_version: string
  locale: string | null
  builtins: Placeholder[]
  faker: Placeholder[]
  providers: ProviderInfo[]
}

/**
 * Request body for POST /api/v1/config.
 */
export interface SaveConfigRequest {
  target?: string | null
  method?: string | null
  requests?: number | null
  concurrency?: number | null
  delay?: number | null
  timeout?: number | null
  faker_locale?: string | null
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export interface ProfileSummary {
  name: string
  path: string
}

export interface ProfileDetail {
  name: string
  path: string
  data: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export interface RunStartRequest {
  target?: string | null
  method?: string | null
  requests?: number | null
  concurrency?: number | null
  delay?: number | null
  rate?: number | null
  timeout?: number | null
  retries?: number | null
  seed?: number | null
  faker_locale?: string | null
  post_type?: string | null
  profile?: string | null
  headers_text?: string | null
  payload_text?: string | null
}

export interface PreviewRequest extends RunStartRequest {
  count?: number
}

export interface RunSummary {
  run_id: string
  status: RunStatus | string
  target: string
  method: string
  requested: number
  completed: number
  success: number
  failed: number
  error: string | null
  /** Present on newer backends (v1.6+). */
  average_response_time_ms?: number | null
  min_response_time_ms?: number | null
  max_response_time_ms?: number | null
  status_codes?: Record<string, number>
}

export type RunStatus = "running" | "completed" | "stopped" | "failed" | "error"

export interface RunListResponse {
  runs: RunSummary[]
}

/** Per-request response snapshot from GET /api/v1/runs/{run_id}/log (v1.6+).
 *  Backend returns a bare array, newest first (ring buffer). */
export interface ResponseSnapshot {
  request_index: number
  status_code?: number | null
  response_time_ms?: number | null
  content_type?: string | null
  body_size?: number
  response_body_excerpt?: string | null
  response_body_truncated?: boolean
  headers?: Record<string, string> | null
  error?: string | null
  ok: boolean
  attempts?: number
  timestamp_ms?: number | null
  error_category?: string | null
  request_headers?: Record<string, unknown> | null
  request_body?: Record<string, unknown> | null
}

/** Legacy log entry shape emitted by older backends / WS provisional frames. */
export interface LegacyRunLogEntry {
  index: number
  ok: boolean
  status: number
  latency_ms: number
  attempts: number
  ts: number
  error_category?: string
  error?: string
  request_headers?: Record<string, unknown>
  request_body?: Record<string, unknown>
  response_body_excerpt?: string
}

/** Normalized log entry used by all UI components. */
export interface NormalizedLogEntry {
  index: number
  ok: boolean
  statusCode: number | null
  latencyMs: number | null
  attempts: number
  timestampMs: number | null
  errorCategory?: string
  error?: string
  raw: ResponseSnapshot | LegacyRunLogEntry
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export interface PreviewPlan {
  index: number
  url: string
  method: string
  headers: Record<string, unknown> | null
  body: Record<string, unknown> | null
}

export interface PreviewResponse {
  plans: PreviewPlan[]
  sensitive_names: string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  location: string | null
  token: string | null
  problem: string | null
  message: string | null
  suggestions: string | null
}

export interface ValidationResponse {
  ok: boolean
  issues: ValidationIssue[]
  errors: ValidationIssue[]
}

// ---------------------------------------------------------------------------
// Live statistics (flat fields on stats.updated / run.completed WS events)
// ---------------------------------------------------------------------------

export interface LatencyStats {
  min?: number | null
  mean?: number | null
  p50?: number | null
  p90?: number | null
  p95?: number | null
  p99?: number | null
  max?: number | null
}

export interface LiveStats {
  elapsed_s?: number
  rps?: number
  completed?: number
  requested?: number
  success?: number
  failed?: number
  retries?: number
  interrupted?: number
  latency_ms?: LatencyStats
  status_codes?: Record<string, number>
  error_counts?: Record<string, number>
}

/** A run summary enriched with the latest live stats snapshot. */
export interface RunWithStats extends RunSummary {
  stats?: LiveStats
}

export function isActiveRunStatus(status: string | undefined | null): boolean {
  return status === "running"
}
