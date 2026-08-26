/**
 * Registry for the global "redirect to /login" behavior.
 *
 * Keeps lib/websocket and lib/api free of router imports (no import cycles):
 * app bootstrap registers an implementation backed by the router.
 */

type RedirectFn = () => void

let redirectFn: RedirectFn | null = null

export function registerAuthRedirect(fn: RedirectFn | null): void {
  redirectFn = fn
}

export function redirectToLogin(): void {
  redirectFn?.()
}
