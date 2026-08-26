export interface JsonCheckOk {
  ok: true
}

export interface JsonCheckError {
  ok: false
  message: string
  line: number
  column: number
}

export type JsonCheckResult = JsonCheckOk | JsonCheckError

function offsetToLineCol(text: string, position: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(position, text.length))
  const before = text.slice(0, clamped)
  const lines = before.split("\n")
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 }
}

/**
 * Client-side JSON syntax validation with line/column extraction.
 * Placeholder strings like "{faker.email}" are ordinary JSON strings here —
 * only real syntax problems are reported.
 */
export function checkJson(text: string | null | undefined): JsonCheckResult {
  if (text === null || text === undefined || text.trim() === "") {
    return { ok: true } // empty editors are valid; saving is simply omitted
  }
  try {
    JSON.parse(text)
    return { ok: true }
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      return { ok: false, message: "Invalid JSON", line: 1, column: 1 }
    }
    const raw = error.message
    const positionMatch = /position (\d+)/i.exec(raw)
    if (positionMatch) {
      const location = offsetToLineCol(text, Number(positionMatch[1]))
      // V8-style messages read awkwardly at a bare position; keep them short.
      const cleaned = raw.replace(/ in JSON at position \d+/i, "").trim()
      return {
        ok: false,
        message: cleaned || raw,
        line: location.line,
        column: location.column,
      }
    }
    const lineMatch = /line (\d+) column (\d+)/i.exec(raw)
    if (lineMatch) {
      return {
        ok: false,
        message: raw.replace(/ \(line \d+ column \d+\)/i, ""),
        line: Number(lineMatch[1]),
        column: Number(lineMatch[2]),
      }
    }
    return { ok: false, message: raw, line: 1, column: 1 }
  }
}
