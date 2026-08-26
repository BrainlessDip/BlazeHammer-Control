/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react"
import { Navigate, createBrowserRouter } from "react-router-dom"

import { AppShell } from "@/components/layout/app-shell"
import { RequireAuth } from "@/app/require-auth"
import { Login } from "@/pages/Login"
import { registerAuthRedirect, redirectToLogin } from "@/lib/auth-redirect"
import { setUnauthorizedHandler } from "@/lib/api"
import { queryClient } from "@/lib/query-client"

// Route-level code splitting: each page ships as its own chunk.
const Dashboard = lazy(() =>
  import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard }))
)
const Runs = lazy(() =>
  import("@/pages/Runs").then((m) => ({ default: m.Runs }))
)
const RunDetails = lazy(() =>
  import("@/pages/RunDetails").then((m) => ({ default: m.RunDetails }))
)
const Configuration = lazy(() =>
  import("@/pages/Configuration").then((m) => ({ default: m.Configuration }))
)
const PayloadEditorPage = lazy(() =>
  import("@/pages/Payload").then((m) => ({ default: m.PayloadEditorPage }))
)
const HeadersEditorPage = lazy(() =>
  import("@/pages/Headers").then((m) => ({ default: m.HeadersEditorPage }))
)
const Profiles = lazy(() =>
  import("@/pages/Profiles").then((m) => ({ default: m.Profiles }))
)
const ProfileDetailPage = lazy(() =>
  import("@/pages/ProfileDetail").then((m) => ({
    default: m.ProfileDetailPage,
  }))
)
const Settings = lazy(() =>
  import("@/pages/Settings").then((m) => ({ default: m.Settings }))
)
const NotFound = lazy(() =>
  import("@/pages/NotFound").then((m) => ({ default: m.NotFound }))
)

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "runs", element: <Runs /> },
      { path: "runs/:runId", element: <RunDetails /> },
      { path: "configuration", element: <Configuration /> },
      { path: "payload", element: <PayloadEditorPage /> },
      { path: "headers", element: <HeadersEditorPage /> },
      { path: "profiles", element: <Profiles /> },
      { path: "profiles/:name", element: <ProfileDetailPage /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <NotFound /> },
    ],
  },
])

// Bootstrap global auth-failure handling. The backend session cookie is the
// single source of truth: any 401 from the API client bounces to /login.
registerAuthRedirect(() => {
  void router.navigate("/login", { replace: true })
})

setUnauthorizedHandler(() => {
  // While already on /login (e.g. failed sign-in attempt), let the login
  // form surface the error itself; don't clear/redirect mid-mutation.
  if (window.location.pathname === "/login") return
  queryClient.clear()
  redirectToLogin()
})
