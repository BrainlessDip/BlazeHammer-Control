import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { configApi } from "@/features/config/api"
import { ApiError } from "@/lib/api"
import { checkJson } from "@/lib/json-check"
import { qk } from "@/lib/query-keys"
import type { TemplateErrorDetails } from "@/types/api"
import { useWsEvent } from "@/hooks/use-websocket"

export type TemplateKind = "payload" | "headers"

export interface TemplateDocState {
  /** Current editor contents (null = not configured on the backend). */
  text: string | null
  original: string | null
  revision: string | null
  path: string | null
}

export interface ExternalChange {
  kinds: TemplateKind[]
}

interface TemplatesState {
  status: "loading" | "ready" | "error"
  error: string | null
  payload: TemplateDocState
  headers: TemplateDocState
}

const EMPTY_DOC: TemplateDocState = {
  text: null,
  original: null,
  revision: null,
  path: null,
}

function docIsDirty(doc: TemplateDocState): boolean {
  return doc.text !== null && doc.text !== doc.original
}

/**
 * Owns payload/header documents: load → edit → save with optimistic
 * concurrency. Never discards editor content on API failure.
 */
export function useTemplateEditor() {
  const queryClient = useQueryClient()

  const templatesQuery = useQuery({
    queryKey: qk.templates,
    queryFn: ({ signal }) => configApi.templates(signal),
    staleTime: 0,
    // Templates are only re-fetched explicitly or via WS events.
    refetchOnWindowFocus: false,
  })

  const [state, setState] = React.useState<TemplatesState>({
    status: "loading",
    error: null,
    payload: EMPTY_DOC,
    headers: EMPTY_DOC,
  })
  const [saveState, setSaveState] = React.useState<
    { phase: "idle" | "saving" | "saved" | "error"; message?: string }
  >({ phase: "idle" })
  const [conflict, setConflict] = React.useState<{
    details: TemplateErrorDetails
    kind: TemplateKind | "both"
  } | null>(null)
  const [externalChanges, setExternalChanges] = React.useState<TemplateKind[]>([])
  const savedTimer = React.useRef<number | null>(null)

  // -- loading ---------------------------------------------------------------

  const applyResponse = React.useCallback(
    (
      data: Awaited<ReturnType<typeof configApi.templates>>,
      options: { preserveKinds?: TemplateKind[]; previous?: TemplatesState } = {},
    ) => {
      setState((prev) => {
        const keep = new Set(options.preserveKinds ?? [])
        const nextPayload =
          keep.has("payload") && prev.payload.text !== null
            ? prev.payload
            : {
                text: data.payload_text ?? "",
                original: data.payload_text ?? "",
                revision: data.payload_revision,
                path: data.payload_file,
              }
        const nextHeaders =
          keep.has("headers") && prev.headers.text !== null
            ? prev.headers
            : {
                text: data.headers_text ?? "",
                original: data.headers_text ?? "",
                revision: data.headers_revision,
                path: data.headers_file,
              }
        return { status: "ready", error: null, payload: nextPayload, headers: nextHeaders }
      })
    },
    [],
  )

  React.useEffect(() => {
    if (templatesQuery.isPending) return
    if (templatesQuery.isError) {
      // Query results are external state; mirroring them into editor state
      // requires an effect (the rule's recommended pattern does not apply
      // because the mirrored fields are user-editable afterwards).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((prev) => ({
        ...prev,
        status: "error",
        error:
          templatesQuery.error instanceof Error
            ? templatesQuery.error.message
            : "Failed to load templates",
      }))
      return
    }
    applyResponse(templatesQuery.data)
    // Reset transient flags whenever a fresh authoritative copy arrives.
    setExternalChanges([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesQuery.data, templatesQuery.isPending, templatesQuery.isError])

  // -- edits -----------------------------------------------------------------

  const setText = React.useCallback((kind: TemplateKind, text: string) => {
    setState((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], text },
    }))
  }, [])

  const dirty = {
    payload: docIsDirty(state.payload),
    headers: docIsDirty(state.headers),
  }
  const anyDirty = dirty.payload || dirty.headers

  const jsonCheck = {
    payload: checkJson(state.payload.text),
    headers: checkJson(state.headers.text),
  }

  const refresh = React.useCallback(async () => {
    const result = await queryClient.refetchQueries({ queryKey: qk.templates })
    void result
  }, [queryClient])

  const reloadKind = React.useCallback(
    async (kind: TemplateKind) => {
      // Fetch fresh, then replace only the requested document.
      const data = await configApi.templates()
      const source = kind === "payload" ? data.payload_text : data.headers_text
      const revision = kind === "payload" ? data.payload_revision : data.headers_revision
      const path = kind === "payload" ? data.payload_file : data.headers_file
      setState((prev) => ({
        ...prev,
        [kind]: { text: source ?? "", original: source ?? "", revision, path },
      }))
      setExternalChanges((prev) => prev.filter((k) => k !== kind))
      setConflict(null)
    },
    [],
  )

  const discardKind = React.useCallback((kind: TemplateKind) => {
    setState((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], text: prev[kind].original },
    }))
  }, [])

  /**
   * Explicit conflict resolution: adopt the server's current revision so the
   * user's *next deliberate save* overwrites the remote version.
   */
  const forceRevision = React.useCallback(
    (kind: TemplateKind, revision: string | null) => {
      setState((prev) => ({
        ...prev,
        [kind]: { ...prev[kind], revision },
      }))
      setExternalChanges((prev) => prev.filter((k) => k !== kind))
      setConflict(null)
      setSaveState({ phase: "idle" })
    },
    [],
  )

  // -- saving ----------------------------------------------------------------

  const save = React.useCallback(async () => {
    if (saveState.phase === "saving") return

    const body: Record<string, string> = {}
    for (const kind of ["payload", "headers"] as const) {
      const doc = state[kind]
      if (!docIsDirty(doc)) continue
      const check = checkJson(doc.text)
      if (!check.ok) return // invalid JSON must never reach the wire
      body[kind] = doc.text ?? ""
      if (doc.revision) body[`${kind}_revision`] = doc.revision
    }

    const changedKinds = Object.keys(body).filter((k) => k === "payload" || k === "headers")
    if (changedKinds.length === 0) return

    setSaveState({ phase: "saving" })
    try {
      const response = await configApi.saveTemplates(body)
      setState((prev) => {
        const next = { ...prev }
        if (response.saved.includes("payload")) {
          next.payload = {
            ...next.payload,
            original: next.payload.text,
            revision: response.payload_revision ?? next.payload.revision,
          }
        }
        if (response.saved.includes("headers")) {
          next.headers = {
            ...next.headers,
            original: next.headers.text,
            revision: response.headers_revision ?? next.headers.revision,
          }
        }
        return next
      })
      setExternalChanges((prev) => prev.filter((k) => !changedKinds.includes(k)))
      setSaveState({ phase: "saved" })
      if (savedTimer.current) window.clearTimeout(savedTimer.current)
      savedTimer.current = window.setTimeout(() => setSaveState({ phase: "idle" }), 2500)
      void queryClient.invalidateQueries({ queryKey: qk.config })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const envelopeDetails = (error.details as
          | { error?: TemplateErrorDetails }
          | undefined)?.error
        const conflicted: TemplateKind[] =
          envelopeDetails?.file === "payload"
            ? ["payload"]
            : envelopeDetails?.file === "headers"
              ? ["headers"]
              : changedKinds
        setConflict({
          details:
            envelopeDetails ?? {
              code: "TEMPLATE_CONFLICT",
              message: "The file was modified after you loaded it.",
            },
          kind: conflicted.length === 1 ? conflicted[0] : "both",
        })
        setSaveState({ phase: "idle" })
        return
      }
      setSaveState({
        phase: "error",
        message: error instanceof Error ? error.message : "Save failed",
      })
    }
  }, [queryClient, saveState.phase, state])

  // Ctrl/Cmd+S binding lives in the workbench; exposed here for reuse.
  const canSave =
    anyDirty &&
    saveState.phase !== "saving" &&
    (!dirty.payload || checkJson(state.payload.text).ok) &&
    (!dirty.headers || checkJson(state.headers.text).ok)

  // -- WebSocket: external changes ------------------------------------------

  useWsEvent(
    React.useCallback(
      (event: { type: string; changed?: unknown }) => {
        if (event.type !== "config.changed") return
        const changed = Array.isArray(event.changed) ? event.changed : []
        const relevant = changed.filter(
          (k): k is TemplateKind => k === "payload" || k === "headers",
        )
        if (relevant.length === 0) return
        void queryClient.invalidateQueries({ queryKey: qk.templates })

        const stale = relevant.filter((kind) =>
          docIsDirty(kind === "payload" ? state.payload : state.headers),
        )
        const clean = relevant.filter((kind) => !stale.includes(kind))
        if (clean.length > 0) {
          // Clean editors follow the server silently.
          void configApi
            .templates()
            .then((data) => applyResponse(data, { preserveKinds: stale }))
            .catch(() => undefined)
        }
        if (stale.length > 0) {
          setExternalChanges((prev) => [...new Set([...prev, ...stale])])
        }
      },
      [applyResponse, queryClient, state.payload, state.headers],
    ),
  )

  React.useEffect(() => {
    return () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current)
    }
  }, [])

  return {
    state,
    dirty,
    anyDirty,
    jsonCheck,
    saveState,
    conflict,
    externalChanges,
    canSave,
    setText,
    save: () => void save(),
    refresh,
    reloadKind: (kind: TemplateKind) => void reloadKind(kind),
    discardKind,
    forceRevision,
    dismissConflict: () => setConflict(null),
    clearExternalChange: (kind: TemplateKind) =>
      setExternalChanges((prev) => prev.filter((k) => k !== kind)),
    retry: () => void templatesQuery.refetch(),
  }
}
