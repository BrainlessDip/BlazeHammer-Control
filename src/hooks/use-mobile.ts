import * as React from "react"

const IS_MOBILE_QUERY = "(max-width: 767px)"

function subscribe(callback: () => void): () => void {
  const mediaQuery = window.matchMedia(IS_MOBILE_QUERY)
  mediaQuery.addEventListener("change", callback)
  return () => {
    mediaQuery.removeEventListener("change", callback)
  }
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(IS_MOBILE_QUERY).matches,
    () => false
  )
}
