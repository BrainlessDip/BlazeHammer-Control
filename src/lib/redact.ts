/**
 * Defensive display helpers for potentially sensitive values.
 *
 * The backend already redacts sensitive fields before they reach the
 * frontend; this is a second line of defense for rendering.
 */

const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|secret|token|authorization|auth|cookie|api[-_]?key|apikey|credential|session)/i

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key)
}

/** Masks a value completely except for a short prefix hint. */
export function maskValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  const str = typeof value === "string" ? value : JSON.stringify(value)
  if (!str) return "••••••••"
  if (str.length <= 4) return "••••••••"
  return `${str.slice(0, 2)}${"•".repeat(8)}`
}

/**
 * Returns a copy of the object with sensitive keys' values masked.
 * Non-object inputs pass through unchanged.
 */
export function maskSensitiveObject(
  input: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    out[key] = isSensitiveKey(key) ? maskValue(value) : value
  }
  return out
}
