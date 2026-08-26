import type * as Monaco from "monaco-editor"

import {
  getCatalogIndex,
} from "@/features/placeholders/catalog-store"
import {
  analyzeContext,
  getSuggestions,
  lookupToken,
  scanTokens,
} from "@/features/placeholders/completion"

/**
 * Registers (once) the placeholder completion + hover providers on the JSON
 * language. Providers read the shared catalog store, so metadata refreshes
 * are picked up without re-registering anything.
 */

let registered = false

function offsetToPosition(
  model: Monaco.editor.ITextModel,
  offset: number,
): Monaco.Position {
  return model.getPositionAt(offset)
}

export function registerPlaceholderProviders(monaco: typeof Monaco): void {
  if (registered) return
  registered = true

  monaco.languages.registerCompletionItemProvider("json", {
    triggerCharacters: ["{", ".", "("],
    provideCompletionItems(model, position) {
      const prefixText = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      })
      const context = analyzeContext(prefixText)
      if (!context.insidePlaceholder) return { suggestions: [] }

      const { items, replaceLength } = getSuggestions(context, getCatalogIndex())
      if (items.length === 0) return { suggestions: [] }

      const startColumn = Math.max(1, position.column - replaceLength)
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        startColumn,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      }

      const suggestions: Monaco.languages.CompletionItem[] = items.map((item, i) => ({
        label: item.label,
        kind:
          item.kind === "param"
            ? monaco.languages.CompletionItemKind.Variable
            : item.kind === "faker" || item.kind === "provider"
              ? monaco.languages.CompletionItemKind.Function
              : monaco.languages.CompletionItemKind.Value,
        detail: item.detail,
        documentation: item.documentation ? { value: item.documentation } : undefined,
        insertText: item.insert,
        insertTextRules: item.insert.includes("$")
          ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
          : undefined,
        sortText: `${item.priority === 0 ? "0" : "1"}_${String(i).padStart(4, "0")}`,
        range,
      }))
      return { suggestions }
    },
  })

  monaco.languages.registerHoverProvider("json", {
    provideHover(model, position) {
      const offset = model.getOffsetAt(position)
      const span = scanTokens(model.getValue()).find(
        (candidate) => offset > candidate.start && offset <= candidate.end,
      )
      if (!span) return undefined

      const entry = lookupToken(span.content, getCatalogIndex())
      const startPosition = offsetToPosition(model, span.start)
      const endPosition = offsetToPosition(model, span.end)

      if (!entry) {
        return {
          range: { startLineNumber: startPosition.lineNumber, startColumn: startPosition.column, endLineNumber: endPosition.lineNumber, endColumn: endPosition.column },
          contents: [
            { value: "**Unknown placeholder**" },
            { value: `\`${span.content}\`` },
          ],
        }
      }

      const contents: Monaco.IMarkdownString[] = []
      const title =
        entry.kind === "builtin"
          ? "Built-in placeholder"
          : entry.path
            ? `Faker provider · ${entry.path}`
            : "Faker method"
      contents.push({ value: `**${entry.name}** — ${title}` })
      if (entry.description) contents.push({ value: entry.description })
      if (entry.syntax) contents.push({ value: `\`${entry.syntax}\`` })
      if (entry.parameters.length > 0) {
        const paramLines = entry.parameters
          .map((p) => `- \`${p.name}\`${p.type ? ` — ${p.type}` : ""}${p.default !== undefined ? ` (default: ${p.default})` : ""}`)
          .join("\n")
        contents.push({ value: `**Parameters**\n\n${paramLines}` })
      }

      return {
        range: { startLineNumber: startPosition.lineNumber, startColumn: startPosition.column, endLineNumber: endPosition.lineNumber, endColumn: endPosition.column },
        contents,
      }
    },
  })
}
