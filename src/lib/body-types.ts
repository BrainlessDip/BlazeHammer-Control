/**
 * Shared body-type definitions, labels, content types, and configuration.
 *
 * This is the single source of truth for all post_type values across the
 * frontend. Every component that needs to know about body types imports
 * from here.
 */

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export type PostType =
  | "none"
  | "json"
  | "form"
  | "multipart"
  | "raw"
  | "xml"
  | "html"
  | "binary"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface BodyTypeOption {
  value: PostType
  label: string
  description: string
  contentType: string
  /** Whether this type shows a text/code editor. */
  hasEditor: boolean
  /** Whether this type supports placeholder autocomplete. */
  supportsAutocomplete: boolean
  /** Monaco editor language id, if applicable. */
  editorLanguage: string | null
}

export const BODY_TYPE_OPTIONS: BodyTypeOption[] = [
  {
    value: "none",
    label: "None",
    description: "No request body",
    contentType: "",
    hasEditor: false,
    supportsAutocomplete: false,
    editorLanguage: null,
  },
  {
    value: "json",
    label: "JSON",
    description: "application/json",
    contentType: "application/json",
    hasEditor: true,
    supportsAutocomplete: true,
    editorLanguage: "json",
  },
  {
    value: "form",
    label: "Form URL Encoded",
    description: "application/x-www-form-urlencoded",
    contentType: "application/x-www-form-urlencoded",
    hasEditor: true,
    supportsAutocomplete: true,
    editorLanguage: null,
  },
  {
    value: "multipart",
    label: "Form Data",
    description: "multipart/form-data",
    contentType: "multipart/form-data",
    hasEditor: true,
    supportsAutocomplete: true,
    editorLanguage: null,
  },
  {
    value: "raw",
    label: "Raw Text",
    description: "text/plain",
    contentType: "text/plain",
    hasEditor: true,
    supportsAutocomplete: true,
    editorLanguage: "plaintext",
  },
  {
    value: "xml",
    label: "XML",
    description: "application/xml",
    contentType: "application/xml",
    hasEditor: true,
    supportsAutocomplete: true,
    editorLanguage: "xml",
  },
  {
    value: "html",
    label: "HTML",
    description: "text/html",
    contentType: "text/html",
    hasEditor: true,
    supportsAutocomplete: true,
    editorLanguage: "html",
  },
  {
    value: "binary",
    label: "Binary",
    description: "application/octet-stream",
    contentType: "application/octet-stream",
    hasEditor: false,
    supportsAutocomplete: false,
    editorLanguage: null,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the BodyTypeOption for a PostType value. Falls back to JSON. */
export function getBodyTypeOption(postType: string | null | undefined): BodyTypeOption {
  const found = BODY_TYPE_OPTIONS.find((o) => o.value === postType)
  return found ?? BODY_TYPE_OPTIONS.find((o) => o.value === "json")!
}

/** Get the Content-Type header value for a PostType. */
export function getContentType(postType: string | null | undefined): string {
  return getBodyTypeOption(postType).contentType
}

/** Get the Monaco editor language for a PostType. */
export function getEditorLanguage(postType: string | null | undefined): string {
  return getBodyTypeOption(postType).editorLanguage ?? "plaintext"
}

/** Whether the body type has a text/code editor. */
export function hasTextEditor(postType: string | null | undefined): boolean {
  return getBodyTypeOption(postType).hasEditor
}

/** Whether placeholder autocomplete should be enabled. */
export function supportsAutocomplete(postType: string | null | undefined): boolean {
  return getBodyTypeOption(postType).supportsAutocomplete
}

// ---------------------------------------------------------------------------
// Form / Multipart field types
// ---------------------------------------------------------------------------

export type FormFieldType = "text" | "file"

export interface FormField {
  id: string
  key: string
  value: string
  type: FormFieldType
  enabled: boolean
}

/** Create a blank form field. */
export function createFormField(overrides?: Partial<FormField>): FormField {
  return {
    id: crypto.randomUUID(),
    key: "",
    value: "",
    type: "text",
    enabled: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Request body state (used by editor + dialog)
// ---------------------------------------------------------------------------

export interface RequestBodyState {
  postType: PostType
  /** Raw text payload for json/xml/html/raw. */
  payloadText: string
  /** Key/value fields for form/multipart. */
  formFields: FormField[]
  /** File path for binary. */
  binaryPath: string
}

export const EMPTY_BODY_STATE: RequestBodyState = {
  postType: "none",
  payloadText: "",
  formFields: [],
  binaryPath: "",
}
