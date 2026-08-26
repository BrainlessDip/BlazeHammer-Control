import type * as Monaco from "monaco-editor"
import draculaTheme from "@/lib/themes/dracula-theme.json"

/**
 * Editor theme: Dracula, always — independent of the app's light/dark
 * setting (the editor surface is a code canvas; it keeps one identity).
 *
 * Theme JSON is vendored from the `monaco-themes` package so it works fully
 * offline and survives the package's restrictive exports map.
 */

export const EDITOR_THEME = "dracula"

let defined = false

/** Registers Dracula on whatever Monaco instance the wrapper provides. */
export function defineDracula(monaco: typeof Monaco): void {
  if (defined) return
  monaco.editor.defineTheme(
    EDITOR_THEME,
    draculaTheme as unknown as Monaco.editor.IStandaloneThemeData,
  )
  defined = true
}
