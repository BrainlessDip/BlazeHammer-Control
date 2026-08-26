/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Blaze Hammer API. Empty means same-origin (dev proxy). */
  readonly VITE_API_BASE_URL?: string
  /** Dev-server-only proxy target used when VITE_API_BASE_URL is empty. */
  readonly VITE_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
