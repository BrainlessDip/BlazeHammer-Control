/**
 * RequestBodyEditor — dispatches to the correct editor based on PostType.
 *
 * For JSON/XML/HTML/raw: renders the Monaco-based TemplateWorkbench or a
 * simple <textarea> fallback.
 * For form/multipart: renders the FormBodyEditor.
 * For binary: renders the BinaryBodyInput.
 * For none: shows "No request body".
 */

import { CodeIcon } from "lucide-react"

import { FormBodyEditor } from "@/components/body/form-body-editor"
import { BinaryBodyInput } from "@/components/body/binary-body-input"
import {
  type RequestBodyState,
  getBodyTypeOption,
  getContentType,
} from "@/lib/body-types"

// ---------------------------------------------------------------------------
// Re-export for convenience (keeps barrel clean for fast-refresh)
// ---------------------------------------------------------------------------

export type { RequestBodyState } from "@/lib/body-types"
export { EMPTY_BODY_STATE } from "@/lib/body-types"

// ---------------------------------------------------------------------------
// RequestBodyEditor
// ---------------------------------------------------------------------------

interface RequestBodyEditorProps {
  state: RequestBodyState
  onChange: (state: RequestBodyState) => void
  /** Height class for the text editor. */
  editorHeightClass?: string
  /** Read-only mode (for preview/details). */
  readOnly?: boolean
}

export function RequestBodyEditor({
  state,
  onChange,
  editorHeightClass = "min-h-[200px]",
  readOnly = false,
}: RequestBodyEditorProps) {
  const option = getBodyTypeOption(state.postType)

  // Content-type badge
  const contentType = getContentType(state.postType)

  return (
    <div className="flex flex-col gap-2">
      {/* Content-type hint */}
      {contentType && (
        <p className="font-mono text-[11px] text-muted-foreground">
          {contentType}
          {state.postType === "multipart" && (
            <span className="ml-1 opacity-60">(boundary auto-generated)</span>
          )}
        </p>
      )}

      {/* Editor area */}
      {state.postType === "none" && (
        <div className="flex items-center justify-center rounded-md border border-dashed bg-muted/20 py-8">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CodeIcon className="size-4" aria-hidden="true" />
            No request body
          </p>
        </div>
      )}

      {state.postType === "binary" && !readOnly && (
        <BinaryBodyInput
          value={state.binaryPath}
          onChange={(v) => onChange({ ...state, binaryPath: v })}
        />
      )}

      {state.postType === "binary" && readOnly && (
        <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
          Binary payload{state.binaryPath ? `: ${state.binaryPath}` : ""}
        </div>
      )}

      {(state.postType === "form" || state.postType === "multipart") &&
        !readOnly && (
          <FormBodyEditor
            fields={state.formFields}
            onChange={(fields) => onChange({ ...state, formFields: fields })}
            showFileOption={state.postType === "multipart"}
            placeholder={
              state.postType === "form"
                ? { key: "key", value: "{faker.user_name}" }
                : { key: "field", value: "value" }
            }
          />
        )}

      {option.hasEditor && (
        <TextEditor
          state={state}
          onChange={onChange}
          readOnly={readOnly}
          editorHeightClass={editorHeightClass}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Text editor for JSON/XML/HTML/raw
// ---------------------------------------------------------------------------

function TextEditor({
  state,
  onChange,
  readOnly,
  editorHeightClass,
}: {
  state: RequestBodyState
  onChange: (s: RequestBodyState) => void
  readOnly: boolean
  editorHeightClass: string
}) {
  const option = getBodyTypeOption(state.postType)

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`overflow-auto rounded-md border bg-muted/40 ${editorHeightClass}`}
      >
        <textarea
          value={state.payloadText}
          onChange={(e) => onChange({ ...state, payloadText: e.target.value })}
          readOnly={readOnly}
          placeholder={
            option.editorLanguage === "json"
              ? '{\n  "key": "value"\n}'
              : option.editorLanguage === "xml"
                ? "<root>\n  <item>value</item>\n</root>"
                : option.editorLanguage === "html"
                  ? "<!DOCTYPE html>\n<html>\n  <body></body>\n</html>"
                  : "Enter request body…"
          }
          spellCheck={false}
          className="h-full w-full resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-foreground/90 outline-none placeholder:text-muted-foreground/50"
          style={{ minHeight: "200px" }}
        />
      </div>
      {option.editorLanguage === "json" && state.payloadText.trim() && (
        <JsonValidationHint text={state.payloadText} />
      )}
    </div>
  )
}

function JsonValidationHint({ text }: { text: string }) {
  try {
    JSON.parse(text)
    return null
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid JSON"
    return (
      <p className="text-[11px] text-destructive">{msg}</p>
    )
  }
}
