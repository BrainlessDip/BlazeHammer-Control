import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  clearSavedBackendUrl,
  deriveApiBaseUrl,
  deriveWsUrlFromBackend,
  displayBackendUrl,
  getRuntimeBackendUrl,
  loadSavedBackendUrl,
  normalizeBackendUrl,
  saveBackendUrl,
  setRuntimeBackendUrl,
  testBackendConnection,
} from "./connection-store"

// ---------------------------------------------------------------------------
// normalizeBackendUrl
// ---------------------------------------------------------------------------

describe("normalizeBackendUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeBackendUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000",
    )
    expect(normalizeBackendUrl("http://localhost:3000///")).toBe(
      "http://localhost:3000",
    )
  })

  it("strips default http port 80", () => {
    expect(normalizeBackendUrl("http://localhost:80")).toBe("http://localhost")
  })

  it("preserves non-default ports", () => {
    expect(normalizeBackendUrl("http://localhost:8080")).toBe(
      "http://localhost:8080",
    )
    expect(normalizeBackendUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    )
  })

  it("normalizes http:// to always use http:// protocol", () => {
    expect(normalizeBackendUrl("https://example.com")).toBe(
      "http://example.com",
    )
  })

  it("rejects javascript: scheme", () => {
    expect(() => normalizeBackendUrl("javascript:alert(1)")).toThrow(
      "Unsupported scheme",
    )
  })

  it("rejects file: scheme", () => {
    expect(() => normalizeBackendUrl("file:///etc/passwd")).toThrow(
      "Unsupported scheme",
    )
  })

  it("rejects data: scheme", () => {
    expect(() => normalizeBackendUrl("data:text/html,<h1>hi</h1>")).toThrow(
      "Unsupported scheme",
    )
  })

  it("rejects ftp: protocol", () => {
    expect(() => normalizeBackendUrl("ftp://example.com")).toThrow(
      "Unsupported protocol",
    )
  })

  it("rejects URLs with embedded credentials", () => {
    expect(() => normalizeBackendUrl("http://user:pass@localhost:8080")).toThrow(
      "credentials",
    )
  })

  it("trims whitespace", () => {
    expect(normalizeBackendUrl("  http://localhost:3000  ")).toBe(
      "http://localhost:3000",
    )
  })

  it("handles bare host:port by prepending http://", () => {
    expect(normalizeBackendUrl("localhost:8080")).toBe("http://localhost:8080")
    expect(normalizeBackendUrl("192.168.1.1:3000")).toBe(
      "http://192.168.1.1:3000",
    )
  })

  it("throws on completely invalid input", () => {
    expect(() => normalizeBackendUrl("")).toThrow("Invalid URL")
    expect(() => normalizeBackendUrl("not a url at all")).toThrow("Invalid URL")
  })
})

// ---------------------------------------------------------------------------
// deriveApiBaseUrl / deriveWsUrlFromBackend / displayBackendUrl
// ---------------------------------------------------------------------------

describe("deriveApiBaseUrl", () => {
  it("returns empty string for null (proxy mode)", () => {
    expect(deriveApiBaseUrl(null)).toBe("")
  })

  it("returns the URL as-is for non-null", () => {
    expect(deriveApiBaseUrl("http://localhost:8080")).toBe("http://localhost:8080")
  })
})

describe("deriveWsUrlFromBackend", () => {
  it("derives ws:// from http:// backend", () => {
    expect(deriveWsUrlFromBackend("http://localhost:8080")).toBe(
      "ws://localhost:8080/api/v1/ws",
    )
  })

  it("derives wss:// from https:// backend", () => {
    expect(deriveWsUrlFromBackend("https://example.com")).toBe(
      "wss://example.com/api/v1/ws",
    )
  })

  it("uses window.location for null backend (proxy mode)", () => {
    vi.stubGlobal("window", {
      location: { protocol: "https:", host: "app.example.com" },
    })
    const result = deriveWsUrlFromBackend(null)
    expect(result).toBe("wss://app.example.com/api/v1/ws")
    vi.unstubAllGlobals()
  })
})

describe("displayBackendUrl", () => {
  it("returns 'same origin' for null", () => {
    expect(displayBackendUrl(null)).toBe("same origin")
  })

  it("returns the host for a valid URL", () => {
    expect(displayBackendUrl("http://localhost:8080")).toBe("localhost:8080")
    expect(displayBackendUrl("https://example.com")).toBe("example.com")
  })

  it("returns the raw string for invalid URLs", () => {
    expect(displayBackendUrl("not-a-url")).toBe("not-a-url")
  })
})

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

describe("localStorage persistence", () => {
  const store = new Map<string, string>()
  const mockStorage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() { return store.size },
    key: vi.fn((i: number) => [...store.keys()][i] ?? null),
  }

  beforeEach(() => {
    store.clear()
    vi.stubGlobal("localStorage", mockStorage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("saves and loads backend URL", () => {
    saveBackendUrl("http://localhost:8080")
    expect(loadSavedBackendUrl()).toBe("http://localhost:8080")
  })

  it("returns null when nothing is saved", () => {
    expect(loadSavedBackendUrl()).toBeNull()
  })

  it("clears saved backend URL", () => {
    saveBackendUrl("http://localhost:8080")
    clearSavedBackendUrl()
    expect(loadSavedBackendUrl()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Runtime URL override
// ---------------------------------------------------------------------------

describe("runtime URL override", () => {
  afterEach(() => {
    setRuntimeBackendUrl(null)
  })

  it("defaults to null", () => {
    setRuntimeBackendUrl(null)
    expect(getRuntimeBackendUrl()).toBeNull()
  })

  it("stores and retrieves runtime URL", () => {
    setRuntimeBackendUrl("http://localhost:8080")
    expect(getRuntimeBackendUrl()).toBe("http://localhost:8080")
  })

  it("can be reset to null", () => {
    setRuntimeBackendUrl("http://localhost:8080")
    setRuntimeBackendUrl(null)
    expect(getRuntimeBackendUrl()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// testBackendConnection
// ---------------------------------------------------------------------------

describe("testBackendConnection", () => {
  const fetchSpy = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchSpy)
    fetchSpy.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns ok: true on successful health check", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ version: "1.6.0" }),
    })

    const result = await testBackendConnection("http://localhost:8080")
    expect(result.ok).toBe(true)
    expect(result.version).toBe("1.6.0")
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/health",
      expect.objectContaining({ method: "GET" }),
    )
  })

  it("returns ok: true even when health response has no version", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const result = await testBackendConnection("http://localhost:8080")
    expect(result.ok).toBe(true)
    expect(result.version).toBeUndefined()
  })

  it("returns ok: false on HTTP error", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const result = await testBackendConnection("http://localhost:8080")
    expect(result.ok).toBe(false)
    expect(result.error).toContain("500")
  })

  it("returns ok: false with CORS flag on TypeError", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    const result = await testBackendConnection("http://localhost:8080")
    expect(result.ok).toBe(false)
    expect(result.corsBlocked).toBe(true)
  })

  it("returns ok: false on timeout", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError")
    fetchSpy.mockRejectedValueOnce(abortError)

    const result = await testBackendConnection("http://localhost:8080")
    expect(result.ok).toBe(false)
    expect(result.error).toContain("timed out")
    expect(result.corsBlocked).toBe(false)
  })
})
