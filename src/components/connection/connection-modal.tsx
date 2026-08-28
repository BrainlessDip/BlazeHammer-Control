/**
 * Connection modal for the Blaze Hammer backend.
 *
 * Supports four states: disconnected, testing, connected, failed.
 * Handles CORS detection, URL validation, and connection management.
 */
/* eslint-disable react-hooks/set-state-in-effect -- legitimate external sync */

import * as React from "react"
import {
  CheckCircleIcon,
  CircleXIcon,
  CopyIcon,
  LoaderIcon,
  RefreshCwIcon,
  UnplugIcon,
  PlugIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useConnection } from "@/hooks/use-connection"
import { normalizeBackendUrl } from "@/lib/connection-store"

interface ConnectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Hide close button and backdrop click — used during initialization. */
  dismissible?: boolean
}

export function ConnectionModal({
  open,
  onOpenChange,
  dismissible = true,
}: ConnectionModalProps) {
  const {
    backendUrl,
    displayUrl,
    status,
    error,
    corsBlocked,
    isTested,
    testConnection,
    connect,
    disconnect,
    reconnect,
  } = useConnection()

  const [inputValue, setInputValue] = React.useState(backendUrl ?? "")
  const [testResult, setTestResult] = React.useState<{
    ok: boolean
    version?: string
  } | null>(null)
  const [isTesting, setIsTesting] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  // Sync input when backendUrl changes externally (e.g. reconnect)
  React.useEffect(() => {
    if (backendUrl) setInputValue(backendUrl)
  }, [backendUrl])

  const handleTest = React.useCallback(async () => {
    let normalized: string
    try {
      normalized = normalizeBackendUrl(inputValue)
    } catch {
      setTestResult({
        ok: false,
      })
      return
    }
    setIsTesting(true)
    const result = await testConnection(normalized)
    setIsTesting(false)
    setTestResult({ ok: result.ok, version: result.version })
  }, [inputValue, testConnection])

  const handleConnect = React.useCallback(() => {
    if (isTested) {
      connect(inputValue)
      onOpenChange(false)
    }
  }, [isTested, inputValue, connect, onOpenChange])

  const handleCopyOrigin = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore — non-critical.
    }
  }, [])

  const handleDisconnect = React.useCallback(() => {
    disconnect()
    setInputValue("")
    setTestResult(null)
  }, [disconnect])

  const handleReconnect = React.useCallback(() => {
    setTestResult(null)
    if (backendUrl) {
      setInputValue(backendUrl)
    }
    reconnect()
    onOpenChange(false)
  }, [backendUrl, reconnect, onOpenChange])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isTesting) {
        if (status === "connected") {
          onOpenChange(false)
        } else if (isTested) {
          handleConnect()
        } else {
          void handleTest()
        }
      }
    },
    [isTesting, status, isTested, handleTest, handleConnect, onOpenChange]
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!dismissible && !o) return
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={dismissible}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlugIcon className="size-4" />
            Connect to Blaze Hammer
          </DialogTitle>
          <DialogDescription>
            Enter the URL of a running Blaze Hammer backend to connect this
            interface.
          </DialogDescription>
        </DialogHeader>

        {/* URL input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Backend URL
          </label>
          <Input
            placeholder="http://localhost:8000"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTesting}
          />
        </div>

        <Button
          variant="outline"
          onClick={() => void handleTest()}
          disabled={!inputValue.trim() || isTesting}
          className="w-full gap-2"
        >
          {isTesting ? (
            <>
              <LoaderIcon className="size-4 animate-spin" />
              Testing connection…
            </>
          ) : (
            <>
              <RefreshCwIcon className="size-4" />
              Test Connection
            </>
          )}
        </Button>

        <Separator />

        {/* Status display */}
        <ConnectionStatusDisplay
          status={status}
          error={error}
          corsBlocked={corsBlocked}
          displayUrl={displayUrl}
          testResult={testResult}
          isTesting={isTesting}
          isTested={isTested}
          onCopyOrigin={handleCopyOrigin}
          copied={copied}
        />

        {/* Actions */}
        <DialogFooter>
          {status === "connected" ? (
            <>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                className="gap-2"
              >
                <UnplugIcon className="size-4" />
                Disconnect
              </Button>
              <Button onClick={() => onOpenChange(false)} className="gap-2">
                <CheckCircleIcon className="size-4" />
                Continue
              </Button>
            </>
          ) : status === "failed" ? (
            <>
              <Button
                variant="outline"
                onClick={handleReconnect}
                className="gap-2"
              >
                <RefreshCwIcon className="size-4" />
                Retry
              </Button>
              <Button
                onClick={() => {
                  setTestResult(null)
                }}
                className="gap-2"
              >
                Change URL
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={!isTested}
              className="gap-2"
            >
              <PlugIcon className="size-4" />
              Connect
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Status display sub-component
// ---------------------------------------------------------------------------

function ConnectionStatusDisplay({
  status,
  error,
  corsBlocked,
  displayUrl,
  testResult,
  isTesting,
  isTested,
  onCopyOrigin,
  copied,
}: {
  status: string
  error: string | null
  corsBlocked: boolean
  displayUrl: string
  testResult: { ok: boolean; version?: string } | null
  isTesting: boolean
  isTested: boolean
  onCopyOrigin: () => void
  copied: boolean
}) {
  if (isTesting) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        <LoaderIcon className="size-4 animate-spin" />
        Testing connection to backend…
      </div>
    )
  }

  if (isTested && testResult?.ok) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-success/30 bg-success/5 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircleIcon className="size-4" />
          Connected{testResult.version ? ` — v${testResult.version}` : ""}
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {displayUrl}
        </div>
      </div>
    )
  }

  if (status === "failed" || (testResult && !testResult.ok)) {
    if (corsBlocked) {
      return (
        <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning/5 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <CircleXIcon className="size-4" />
            CORS blocked
          </div>
          <p className="text-xs text-muted-foreground">
            The backend is running but does not allow requests from this
            frontend. Add this origin to the backend&apos;s CORS origins:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
              {window.location.origin}
            </code>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onCopyOrigin}
              className="shrink-0"
            >
              {copied ? (
                <CheckCircleIcon className="size-3 text-success" />
              ) : (
                <CopyIcon className="size-3" />
              )}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <CircleXIcon className="size-4" />
          Connection failed
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
        <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
          <li>Backend is not running</li>
          <li>Incorrect host URL</li>
          <li>CORS is not configured</li>
          <li>Network or firewall issue</li>
        </ul>
      </div>
    )
  }

  return null
}
