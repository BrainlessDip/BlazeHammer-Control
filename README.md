# Blaze Hammer Console

A production-grade **React + TypeScript** frontend for the
[Blaze Hammer](../BlazeHammer) API testing tool — a dark-first, developer-focused
control console for configuring, previewing, validating, executing, and
monitoring HTTP request runs in real time.

This project is fully independent from the Python backend. The backend is the
single source of truth: authentication, configuration, validation, placeholder
resolution (Faker), request planning, execution, statistics, and WebSocket
events all happen server-side. This app only presents and controls.

## Stack

- [React 19](https://react.dev) + TypeScript (strict)
- [Vite](https://vite.dev)
- [shadcn/ui](https://ui.shadcn.com) (base-luma style) on Tailwind CSS v4
- [React Router v7](https://reactrouter.com)
- [TanStack Query v5](https://tanstack.com/query)
- [Zod](https://zod.dev) for client-side form validation and WebSocket frame parsing
- Lucide icons · Sonner toasts · Geist / Geist Mono typography

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

The frontend requires the Blaze Hammer FastAPI backend to be running:

```bash
# Backend (from the Python repository):
bh web

# Frontend:
npm run dev
```

### Other scripts

```bash
npm run build        # typecheck + production build into dist/
npm run preview      # serve the production build locally
npm run lint         # eslint
npm run format       # prettier
npm run typecheck    # tsc --noEmit
```

## Backend URL configuration

Copy `.env.example` to `.env` (or `.env.local`) and adjust:

```bash
VITE_API_BASE_URL=
VITE_PROXY_TARGET=http://127.0.0.1:8080
```

### Proxy mode (default, recommended)

With `VITE_API_BASE_URL` **empty**, the app talks to its own origin and the
Vite dev server forwards `/api/*` (including WebSockets) to `VITE_PROXY_TARGET`
(default `http://127.0.0.1:8080`).

Same-origin requests mean the backend's `HttpOnly`, `SameSite=Strict` session
cookie just works — no CORS setup required.

> Note: Vite binds `localhost`, which may resolve to IPv6 (`::1`). Open the
> app at `http://localhost:5173`.

### Direct mode

Set an absolute base URL instead:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8080
```

The app then calls the backend directly and derives the WebSocket URL
automatically (`http → ws`, `https → wss`, path `/api/v1/ws`).

For direct mode the backend must allow it:

- enable CORS in `blazehammer.yaml`:
  ```yaml
  web:
    cors:
      enabled: true
      allow_origins:
        - http://localhost:5173
  ```
- open the console using the **same hostname spelling as the API URL**
  (both `localhost` or both `127.0.0.1`) — the session cookie is
  `SameSite=Strict`, so cross-site hosts will silently lose authentication.

Trailing slashes in `VITE_API_BASE_URL` are normalized automatically.

## Features

| Area | Details |
| --- | --- |
| Auth | Login/logout via `/api/v1/auth/*`, session state from `/api/v1/me`, protected routes, global 401 handling |
| Dashboard | Live metric tiles, prominent active-run card with progress/throughput/latency, Start Run / Preview / Validate actions |
| Runs | History table with status badges, per-row actions, clear-history with confirmation |
| Run details | Live stats, stop control, request log with All/Success/Errors filters and redacted request/response inspector |
| Configuration | Edit saved config (target/method/requests/concurrency/delay/timeout/locale), explicit save confirmation (`confirm: true`), read-only fields clearly marked |
| Payload & Headers | Monospace template editors with format/validate/copy/reset, backend validation, one-click hand-off into a single run |
| Profiles | Read-only list + detail viewer; "Run Profile" uses the supported run API — no fabricated mutation endpoints |
| Preview | 1–20 sample requests rendered exactly as resolved by the backend |
| Validation | Issue cards with location/token/problem/suggestions |
| Real-time | Dedicated WebSocket service: auto-reconnect with backoff, heartbeat, auth-close awareness; targeted TanStack Query cache updates (no global refetches) |
| System | Health polling (30s), backend info/features, project location, theme switcher (dark default) |

## Project layout

```
src/
├── app/          # router, providers, env config, auth guard
├── components/
│   ├── ui/       # shadcn/ui primitives
│   ├── layout/   # sidebar shell, topbar
│   ├── common/   # status badge, metric card, JSON editor/viewer, states…
│   ├── dashboard/
│   ├── runs/     # start-run dialog, preview, validate, log panel
│   ├── configuration/
│   ├── payload/  # shared template editor (payload + headers pages)
│   └── profiles/
├── features/     # api clients + query hooks per domain (auth, config,
│                 # profiles, runs, preview)
├── hooks/        # WebSocket context/bridge, run draft hand-off
├── lib/          # api client (ApiError, CSRF header, timeouts),
│                 # websocket service, query client/keys, formatting
├── types/        # exact snake_case API contract + zod WS frames
└── pages/
```

## Security notes

- Passwords are never stored or logged; sessions live in an HttpOnly cookie
  managed entirely by the backend.
- Every mutating request carries the CSRF header (`X-Requested-With`)
  required by the backend.
- Sensitive-looking values are additionally masked when rendering recorded
  request headers/bodies (the backend already redacts at capture time).
- No `dangerouslySetInnerHTML`, no `eval`, no placeholder resolution in the
  browser — templates are only ever *displayed*; the backend resolves and
  executes them.
