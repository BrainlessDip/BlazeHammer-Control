import { describe, expect, it } from "vitest"

import type { PlaceholderCatalog } from "@/types/api"
import {
  analyzeContext,
  diagnosePlaceholders,
  fuzzyScore,
  getSuggestions,
  indexCatalog,
  scanTokens,
} from "@/features/placeholders/completion"

const catalog: PlaceholderCatalog = {
  version: 1,
  faker_version: "40.0",
  locale: null,
  builtins: [
    {
      name: "uuid",
      kind: "builtin",
      description: "Random UUIDv4.",
      syntax: "{uuid}",
      insert_text: "{uuid}",
      returns: "string",
      example: null,
      parameters: [],
      path: null,
    },
    {
      name: "int",
      kind: "builtin",
      description: "Random integer.",
      syntax: "{int(min, max)}",
      insert_text: "{int(min=1, max=100)}",
      returns: "integer",
      example: null,
      parameters: [{ name: "min" }, { name: "max" }],
      path: null,
    },
    {
      name: "password",
      kind: "builtin",
      description: "Random password.",
      syntax: "{password(length)}",
      insert_text: "{password(length=12)}",
      returns: "string",
      example: null,
      parameters: [{ name: "length" }, { name: "digits" }],
      path: null,
    },
  ],
  faker: [
    {
      name: "faker.email",
      kind: "faker",
      description: "Generate a random email address.",
      syntax: "{faker.email}",
      insert_text: "{faker.email}",
      returns: "string",
      example: null,
      parameters: [],
      path: null,
    },
    {
      name: "faker.user_name",
      kind: "faker",
      description: "Generate a random username.",
      syntax: "{faker.user_name}",
      insert_text: "{faker.user_name}",
      returns: "string",
      example: null,
      parameters: [],
      path: null,
    },
  ],
  providers: [
    {
      family: "internet",
      builtin: true,
      methods: [
        {
          name: "email",
          kind: "faker.provider",
          description: "Provider-level email.",
          syntax: "{faker.providers.internet.email}",
          insert_text: "{faker.providers.internet.email}",
          returns: "string",
          example: null,
          parameters: [],
          path: "faker.providers.internet.email",
        },
      ],
    },
  ],
}

const index = indexCatalog(catalog)

describe("analyzeContext", () => {
  it("detects plain string context", () => {
    const ctx = analyzeContext('{"email": "')
    expect(ctx.insidePlaceholder).toBe(false)
  })

  it("detects inside-placeholder context", () => {
    const ctx = analyzeContext('{"email": "{fa')
    expect(ctx.insidePlaceholder).toBe(true)
    expect(ctx.tokenPrefix).toBe("fa")
  })

  it("closes after the token ends", () => {
    const ctx = analyzeContext('{"email": "{faker.email}"')
    expect(ctx.insidePlaceholder).toBe(false)
  })
})

describe("getSuggestions", () => {
  it("{ shows built-ins and faker entries completing with braces", () => {
    const { items } = getSuggestions(analyzeContext('{"a": "{'), index)
    const labels = items.map((i) => i.label)
    expect(labels).toContain("uuid")
    expect(labels).toContain("faker.email")
    const uuid = items.find((i) => i.label === "uuid")
    expect(uuid?.insert).toBe("{uuid}")
  })

  it("{fa narrows to faker entries", () => {
    const { items } = getSuggestions(analyzeContext('{"a": "{fa'), index)
    for (const item of items) {
      expect(item.label.toLowerCase()).toContain("f")
    }
    expect(items.map((i) => i.label)).toContain("faker.email")
  })

  it("{faker. lists faker methods and the providers escape", () => {
    const { items } = getSuggestions(analyzeContext('{"a": "{faker.'), index)
    const labels = items.map((i) => i.label)
    expect(labels).toContain("email")
    expect(labels).toContain("user_name")
    expect(labels).toContain("providers.")
  })

  it("{faker.us fuzzy-matches user_name", () => {
    const { items } = getSuggestions(analyzeContext('{"a": "{faker.us'), index)
    expect(items.map((i) => i.label)).toContain("user_name")
  })

  it("{faker.providers.internet. lists provider methods", () => {
    const { items } = getSuggestions(
      analyzeContext('{"a": "{faker.providers.internet.'),
      index,
    )
    const email = items.find((i) => i.label === "email")
    expect(email).toBeDefined()
    expect(email?.documentation).toContain("Provider-level email")
  })

  it("{uuid completes the full placeholder", () => {
    const { items } = getSuggestions(analyzeContext('{"a": "{uuid'), index)
    const uuid = items.find((i) => i.label === "uuid")
    expect(uuid?.insert).toBe("{uuid}")
  })

  it("{password( suggests parameter names", () => {
    const { items } = getSuggestions(analyzeContext('{"a": "{password('), index)
    const labels = items.map((i) => i.label)
    expect(labels).toEqual(expect.arrayContaining(["length", "digits"]))
    const length = items.find((i) => i.label === "length")
    expect(length?.insert).toBe("length=")
  })

  it("parameter list hides already-typed params", () => {
    const { items } = getSuggestions(analyzeContext('{"a": "{int(min=1, '), index)
    const labels = items.map((i) => i.label)
    expect(labels).toContain("max")
    expect(labels).not.toContain("min")
  })

  it("returns nothing outside placeholders", () => {
    const { items } = getSuggestions(analyzeContext('{"plain": "va'), index)
    expect(items).toHaveLength(0)
  })
})

describe("diagnostics", () => {
  it("scans tokens with positions", () => {
    const spans = scanTokens('{ "id": "{uuid}", "n": 1 }')
    expect(spans).toHaveLength(1)
    expect(spans[0].content).toBe("uuid")
  })

  it("flags unknown placeholders with fuzzy suggestions", () => {
    const diagnostics = diagnosePlaceholders('{ "x": "{faker.usrname}" }', index)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].suggestions).toContain("user_name")
  })

  it("accepts known tokens", () => {
    const diagnostics = diagnosePlaceholders(
      '{ "a": "{uuid}", "b": "{faker.providers.internet.email}" }',
      index,
    )
    expect(diagnostics).toHaveLength(0)
  })
})

describe("fuzzyScore", () => {
  it("prefers exact prefixes", () => {
    expect(fuzzyScore("em", "email")).toBeGreaterThan(fuzzyScore("em", "user_name"))
  })

  it("finds subsequence matches", () => {
    expect(fuzzyScore("usr", "user_name")).toBeGreaterThan(0)
  })

  it("rejects non-matches", () => {
    expect(fuzzyScore("zzz", "email")).toBe(-1)
  })
})
