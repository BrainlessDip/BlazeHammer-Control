import type { Placeholder, PlaceholderCatalog } from "@/types/api"

/**
 * Placeholder completion engine (pure functions, no Monaco imports).
 *
 * Understands the token grammar the backend resolves:
 *
 *   {uuid}                        built-in
 *   {int(min=1, max=2)}           built-in with parameters
 *   {faker.email}                 top-level Faker method
 *   {faker.providers.internet.email}
 *                                 explicit provider path
 *
 * The engine only *suggests*; resolution always happens server-side.
 */

export type CompletionKind = "builtin" | "faker" | "provider" | "provider-family" | "param"

export interface CompletionItem {
  /** Label shown in the dropdown (without braces). */
  label: string
  /** Text inserted at the range (may be a snippet with ${1} stops). */
  insert: string
  kind: CompletionKind
  detail: string
  documentation: string
  /** Sort prefix: exact-prefix matches first, then fuzzy matches. */
  priority: number
}

export interface CompletionContext {
  /** True when the character before the cursor sits inside a "{...}" span. */
  insidePlaceholder: boolean
  /** Offset of the "{" opening the current placeholder (-1 when none). */
  openBrace: number
  /** Text between "{" and the cursor, verbatim. */
  tokenPrefix: string
}

const PARAM_CONTEXT_RE = /\(\s*([^()]*)$/

/**
 * Analyzes the text before a cursor position to classify completion context.
 *
 * A cheap single pass tracks JSON string state so the *object's* opening
 * brace is never mistaken for a placeholder brace; placeholders only count
 * inside strings.
 */
export function analyzeContext(textBeforeCursor: string): CompletionContext {
  let inString = false
  let escaped = false
  let openBrace = -1

  for (let i = 0; i < textBeforeCursor.length; i++) {
    const ch = textBeforeCursor[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === "\\") {
        escaped = true
      } else if (ch === '"') {
        inString = false
        openBrace = -1 // string closed; any pending placeholder is done
      } else if (ch === "{" && openBrace === -1) {
        openBrace = i
      }
    } else if (ch === '"') {
      inString = true
    }
    // Non-string characters (structural JSON) are ignored entirely.
  }

  if (!inString || openBrace === -1) {
    return { insidePlaceholder: false, openBrace: -1, tokenPrefix: "" }
  }
  return {
    insidePlaceholder: true,
    openBrace,
    tokenPrefix: textBeforeCursor.slice(openBrace + 1),
  }
}

/** Subsequence match ("fusr" ~ "user_name"); returns score or -1. */
export function fuzzyScore(query: string, candidate: string): number {
  if (!query) return 0
  let qi = 0
  let score = 0
  let streak = 0
  const lowerQuery = query.toLowerCase()
  const lowerCandidate = candidate.toLowerCase()
  for (let ci = 0; ci < lowerCandidate.length && qi < lowerQuery.length; ci++) {
    if (lowerCandidate[ci] === lowerQuery[qi]) {
      qi += 1
      streak += 1
      score += 2 + streak
    } else {
      streak = 0
    }
  }
  if (qi < lowerQuery.length) return -1
  return score
}

function entryDetail(entry: Placeholder): string {
  if (entry.kind === "builtin") return "Built-in placeholder"
  if (entry.kind === "faker.provider" && entry.path) return `Faker provider · ${entry.path}`
  return "Faker method"
}

function entryDocumentation(entry: Placeholder): string {
  const parts: string[] = []
  if (entry.description) parts.push(entry.description)
  if (entry.syntax) parts.push(`\`${entry.syntax}\``)
  if (entry.parameters.length > 0) {
    parts.push(
      entry.parameters
        .map((p) => `- \`${p.name}\`${p.type ? ` — ${p.type}` : ""}${p.default !== undefined ? ` (default: ${p.default})` : ""}`)
        .join("\n"),
    )
  }
  return parts.join("\n\n")
}

function makeItem(
  label: string,
  insert: string,
  kind: CompletionKind,
  entry: Placeholder | undefined,
  query: string,
): CompletionItem {
  const lowerLabel = label.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const isPrefix = lowerQuery === "" || lowerLabel.startsWith(lowerQuery)
  const priority = isPrefix ? 0 : 1
  return {
    label,
    insert,
    kind,
    detail: entry ? entryDetail(entry) : "Parameter",
    documentation: entry ? entryDocumentation(entry) : "",
    priority,
  }
}

/** Insert text for a full placeholder from a catalog entry. */
export function buildInsertText(entry: Placeholder): string {
  if (entry.insert_text) return entry.insert_text
  return `{${entry.name}}`
}

export interface CatalogIndex {
  builtins: Placeholder[]
  faker: Placeholder[]
  providerMethods: Array<Placeholder & { family: string }>
  providerFamilies: string[]
}

export function indexCatalog(catalog: PlaceholderCatalog | undefined): CatalogIndex {
  if (!catalog) {
    return { builtins: [], faker: [], providerMethods: [], providerFamilies: [] }
  }
  const providerMethods: Array<Placeholder & { family: string }> = []
  const providerFamilies: string[] = []
  for (const provider of catalog.providers) {
    providerFamilies.push(provider.family)
    for (const method of provider.methods) {
      providerMethods.push({ ...method, family: provider.family })
    }
  }
  return {
    builtins: catalog.builtins ?? [],
    faker: catalog.faker ?? [],
    providerMethods,
    providerFamilies,
  }
}

function dedupeAndSort(items: CompletionItem[], limit: number): CompletionItem[] {
  const seen = new Set<string>()
  const out: CompletionItem[] = []
  items.sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label))
  for (const item of items) {
    const key = `${item.kind}:${item.label}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

/**
 * Computes suggestions for the cursor context against the (indexed) catalog.
 * Returns items whose `insert` should replace `replaceLength` characters
 * directly before the cursor.
 */
export function getSuggestions(
  context: CompletionContext,
  index: CatalogIndex,
  limit = 50,
): { items: CompletionItem[]; replaceLength: number } {
  if (!context.insidePlaceholder) return { items: [], replaceLength: 0 }

  // Parameter position: inside "(...)" of a parameterized placeholder.
  const parenMatch = PARAM_CONTEXT_RE.exec(context.tokenPrefix)
  if (parenMatch) {
    const beforeParen = context.tokenPrefix.slice(0, parenMatch.index)
    const typed = parenMatch[1]
    // Find the matching entry by its path ("int", "password", "faker.email", …).
    const candidates = [
      ...index.builtins,
      ...index.faker,
      ...index.providerMethods.map((m) => ({ ...m, name: m.path ?? m.name })),
    ]
    const entry = candidates.find((c) => c.name === beforeParen.trim())
    if (!entry || entry.parameters.length === 0) return { items: [], replaceLength: 0 }

    const alreadyTyped = new Set(typed.split(",").map((s) => s.split("=")[0].trim()))
    const items = entry.parameters
      .filter((p) => !alreadyTyped.has(p.name))
      .map((p) => ({
        ...makeItem(p.name, `${p.name}=`, "param", undefined, p.name),
        documentation: p.type ? `\`${p.name}\`: ${p.type}` : `\`${p.name}\``,
        detail: "Parameter",
      }))
    return {
      items: dedupeAndSort(items as CompletionItem[], limit),
      replaceLength: typed.length,
    }
  }

  const prefix = context.tokenPrefix

  // Provider namespace: faker.providers.<family>. → methods of that family.
  const providerMethodMatch = /^faker\.providers\.([\w]+)\.(.*)$/.exec(prefix)
  if (providerMethodMatch) {
    const [, family, methodQuery] = providerMethodMatch
    const items: CompletionItem[] = []
    for (const method of index.providerMethods) {
      if (method.family !== family) continue
      const score = fuzzyScore(methodQuery, method.name)
      if (score < 0) continue
      items.push(makeItem(method.name, method.name, "provider", method, methodQuery))
    }
    return { items: dedupeAndSort(items, limit), replaceLength: methodQuery.length }
  }

  // Provider families: faker.providers.<fam…> → family names.
  const providerFamilyMatch = /^faker\.providers\.(.*)$/.exec(prefix)
  if (providerFamilyMatch) {
    const query = providerFamilyMatch[1]
    const items = index.providerFamilies
      .map((family) => ({ family, score: fuzzyScore(query, family) }))
      .filter((r) => r.score >= 0)
      .map((r) =>
        makeItem(r.family, r.family, "provider-family", undefined, query),
      )
    return { items: dedupeAndSort(items, limit), replaceLength: query.length }
  }

  // Faker namespace: faker.<meth…> → top-level methods (+ providers escape).
  const fakerMatch = /^faker\.?(.*)$/.exec(prefix)
  if (fakerMatch) {
    const methodQuery = fakerMatch[1]
    const items: CompletionItem[] = []

    if (methodQuery === "" || "providers".startsWith(methodQuery.toLowerCase())) {
      items.push(makeItem("providers.", "providers.", "provider-family", undefined, methodQuery))
    }
    for (const entry of index.faker) {
      const bare = entry.name.replace(/^faker\./, "")
      const score = fuzzyScore(methodQuery, bare)
      if (score < 0) continue
      const item = makeItem(bare, bare, "faker", entry, methodQuery)
      // Parameterized entries complete with a snippet: {int(min=$1, max=$2)}
      if (entry.parameters.length > 0) {
        const stops = entry.parameters
          .map((p, i) => `${p.name}=\${${i + 1}}`)
          .join(", ")
        item.insert = `${bare}(${stops})`
      }
      items.push(item)
    }
    return { items: dedupeAndSort(items, limit), replaceLength: methodQuery.length }
  }

  // Bare token: show everything (built-ins first), completing to "{name}".
  const items: CompletionItem[] = []
  for (const entry of [...index.builtins, ...index.faker]) {
    const bare = entry.name
    const score = fuzzyScore(prefix, bare)
    if (score < 0) continue
    const item = makeItem(bare, buildInsertText(entry), entry.kind === "builtin" ? "builtin" : "faker", entry, prefix)
    if (entry.kind === "builtin" && entry.parameters.length > 0 && !entry.insert_text.includes("(")) {
      const stops = entry.parameters.map((p, i) => `${p.name}=\${${i + 1}}`).join(", ")
      item.insert = `{${bare}(${stops})}`
    }
    items.push(item)
  }
  for (const family of index.providerFamilies) {
    const score = fuzzyScore(prefix, `providers.${family}`)
    if (score >= 0) {
      items.push(makeItem(`providers.${family}`, `faker.providers.${family}.`, "provider-family", undefined, prefix))
    }
  }
  return { items: dedupeAndSort(items, limit), replaceLength: prefix.length }
}

// ---------------------------------------------------------------------------
// Diagnostics: classify tokens found in a document (no execution).
// ---------------------------------------------------------------------------

export interface TokenSpan {
  start: number
  end: number
  /** Inner content without braces, trimmed. */
  content: string
}

const TOKEN_RE = /\{([^{}]*)\}/g

/** All well-formed `{...}` spans in the document. */
export function scanTokens(text: string): TokenSpan[] {
  const spans: TokenSpan[] = []
  for (const match of text.matchAll(TOKEN_RE)) {
    const content = match[1].trim()
    if (!content) continue
    spans.push({ start: match.index, end: match.index + match[0].length, content })
  }
  return spans
}

/** Looks up a token's inner content ("int(min=1)") in the catalog. */
export function lookupToken(content: string, index: CatalogIndex): Placeholder | undefined {
  const base = content.split("(")[0].trim()
  const direct = [...index.builtins, ...index.faker].find(
    (e) => e.name === base || e.name === `faker.${base}`,
  )
  if (direct) return direct
  return index.providerMethods.find((m) => (m.path ?? m.name) === base)
}

export interface PlaceholderDiagnostic {
  start: number
  end: number
  message: string
  /** Fuzzy suggestions ("did you mean …"), pipe-free list. */
  suggestions: string[]
}

/**
 * Flags unknown placeholders as warnings. Known-but-parameterized tokens are
 * validated shallowly (unknown param names) without executing anything.
 */
export function diagnosePlaceholders(
  text: string,
  index: CatalogIndex,
): PlaceholderDiagnostic[] {
  const diagnostics: PlaceholderDiagnostic[] = []
  for (const span of scanTokens(text)) {
    if (span.content.startsWith("$")) continue // ignore snippet artifacts
    const hit = lookupToken(span.content, index)
    if (hit) continue

    const allNames = [
      ...index.builtins.map((e) => e.name),
      ...index.faker.map((e) => e.name.replace(/^faker\./, "")),
      ...index.providerMethods.map((e) => e.path ?? e.name),
    ].filter((n) => n !== "custom" && n !== "profile")
    const queryBase = span.content.split("(")[0].trim()
    const bareQuery = queryBase.replace(/^faker\./, "")
    const scored = allNames
      .map((name) => {
        // Compare against whichever form the candidate uses.
        const candidateBare = name.replace(/^faker\./, "")
        return {
          name,
          score: Math.max(fuzzyScore(bareQuery, name), fuzzyScore(bareQuery, candidateBare)),
        }
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => r.name)

    diagnostics.push({
      start: span.start,
      end: span.end,
      message:
        scored.length > 0
          ? `Unknown placeholder {${span.content}} — did you mean {${scored[0]}}?`
          : `Unknown placeholder {${span.content}}`,
      suggestions: scored,
    })
  }
  return diagnostics
}
