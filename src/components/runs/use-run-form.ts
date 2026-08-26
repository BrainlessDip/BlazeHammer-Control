import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useConfig, useTemplates } from "@/features/config/hooks"
import {
  runFormDefaultsFromConfig,
  runFormSchema,
  type RunFormInputs,
} from "@/features/runs/run-form"
import { clearRunDraft, consumeRunDraft } from "@/hooks/use-run-draft"

/**
 * Shared react-hook-form instance for run/preview/validate dialogs.
 * Defaults come from saved configuration + templates; an explicit run draft
 * (set by the editors) takes precedence and is consumed exactly once.
 */
export function useRunForm(open: boolean) {
  const config = useConfig()
  const templates = useTemplates()

  const form = useForm<RunFormInputs>({
    resolver: zodResolver(runFormSchema),
    defaultValues: runFormDefaultsFromConfig(undefined),
  })

  React.useEffect(() => {
    if (!open) return

    const defaults = runFormDefaultsFromConfig(config.data)
    const templateData = templates.data
    if (templateData) {
      defaults.payload_text = templateData.payload_text ?? ""
      defaults.headers_text = templateData.headers_text ?? ""
    }

    const draft = consumeRunDraft()
    if (draft?.profile) defaults.profile = draft.profile
    if (draft?.payload_text) defaults.payload_text = draft.payload_text
    if (draft?.headers_text) defaults.headers_text = draft.headers_text
    clearRunDraft()

    form.reset(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config.data, templates.data])

  return { form, config, templates }
}
