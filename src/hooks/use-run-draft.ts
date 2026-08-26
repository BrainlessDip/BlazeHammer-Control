/**
 * In-memory hand-off of payload/header text from the editors to the
 * Start Run dialog. Intentionally not persisted anywhere (security:
 * request templates never outlive the tab session).
 */

export interface RunDraft {
  payload_text?: string
  headers_text?: string
  profile?: string
}

let draft: RunDraft | null = null

export function setRunDraft(next: RunDraft | null): void {
  draft = next
}

export function consumeRunDraft(): RunDraft | null {
  const current = draft
  return current
}

export function clearRunDraft(): void {
  draft = null
}
