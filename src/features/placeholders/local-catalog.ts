import type { Placeholder, PlaceholderCatalog } from "@/types/api"

/**
 * Offline fallback catalog used only when GET /placeholders/catalog is
 * unavailable (older backend / network error). The backend catalog always
 * wins when reachable — this exists so the editor stays useful and the UI
 * never blocks on metadata.
 */

function builtin(
  name: string,
  description: string,
  insertText: string,
  parameters: string[] = [],
  returns = "string",
): Placeholder {
  const params = parameters.map((p) => ({ name: p }))
  return {
    name,
    kind: "builtin",
    description,
    syntax:
      params.length > 0
        ? `{${name}(${params.map((p) => p.name).join(", ")})}`
        : `{${name}}`,
    insert_text: insertText,
    returns,
    example: null,
    parameters: params,
    path: null,
  }
}

function fakerMethod(
  method: string,
  description: string,
  parameters: string[] = [],
): Placeholder {
  return {
    name: `faker.${method}`,
    kind: "faker",
    description,
    syntax: `{faker.${method}}`,
    insert_text: `{faker.${method}}`,
    returns: null,
    example: null,
    parameters: parameters.map((p) => ({ name: p })),
    path: null,
  }
}

export const LOCAL_FALLBACK_CATALOG: PlaceholderCatalog = {
  version: 0,
  faker_version: "unknown",
  locale: null,
  builtins: [
    builtin("uuid", "Random UUIDv4 (seed-aware).", "{uuid}"),
    builtin("email", "Random email address.", "{email(prefix=..., length=..., domains=...)}", [
      "prefix",
      "length",
      "domains",
    ]),
    builtin("int", "Random integer in [min, max].", "{int(min=0, max=100)}", ["min", "max"], "integer"),
    builtin("float", "Random float in [min, max].", "{float(min=1, max=5, precision=1)}", ["min", "max", "precision"], "number"),
    builtin("number", "Random number (legacy alias).", "{number(min=..., max=...)}", ["min", "max"]),
    builtin("str", "Random alphanumeric string.", "{str(length=12)}", ["length"]),
    builtin("string", "Alias of {str}.", "{string(length=12)}", ["length"]),
    builtin("password", "Random password with character-class toggles.", "{password(length=12)}", [
      "length",
      "uppercase",
      "lowercase",
      "digits",
      "symbols",
    ]),
    builtin("choice", "Pick one value from a comma-separated list.", "{choice(a, b, c)}", ["options"]),
    builtin("date", "Formatted date (seed-aware).", "{date(...)}"),
    builtin("datetime", "Formatted date and time.", "{datetime(...)}"),
    builtin("timestamp", "Unix timestamp.", "{timestamp}", [], "integer"),
    builtin("ip", "Random IPv4 address. Alias of {ipv4}.", "{ip}"),
    builtin("ipv4", "Random valid IPv4 address.", "{ipv4}"),
    builtin("ipv6", "Random valid IPv6 address.", "{ipv6}"),
    builtin("bool", "Random boolean (native JSON true/false).", "{bool}", [], "boolean"),
    builtin("null", "Real JSON null value.", "{null}", [], "null"),
    builtin("pick_line", "Pick a random line from a local file.", "{pick_line(file=...)}", ["file"]),
    builtin("list", "Repeat a nested placeholder to build arrays.", "{list(item={uuid}, length=3)}", ["item", "length"], "array"),
  ],
  faker: [
    fakerMethod("name", "Generate a random full name."),
    fakerMethod("first_name", "Generate a random first name."),
    fakerMethod("last_name", "Generate a random last name."),
    fakerMethod("user_name", "Generate a random username."),
    fakerMethod("email", "Generate a random email address."),
    fakerMethod("phone_number", "Generate a random phone number."),
    fakerMethod("address", "Generate a random full address."),
    fakerMethod("city", "Generate a random city name."),
    fakerMethod("country", "Generate a random country name."),
    fakerMethod("url", "Generate a random URL."),
    fakerMethod("ipv4", "Generate a random IPv4 address."),
    fakerMethod("word", "Generate a random lorem word."),
    fakerMethod("sentence", "Generate a random lorem sentence."),
    fakerMethod("paragraph", "Generate a few random lorem sentences."),
    fakerMethod("company", "Generate a random company name."),
    fakerMethod("job", "Generate a random job title."),
    fakerMethod("custom", 'Resolve a custom provider field (e.g. field="otp_code").', ["field", "locale"]),
    fakerMethod("profile", "Return one field of a full fake profile.", ["field", "locale"]),
  ],
  providers: [],
}
