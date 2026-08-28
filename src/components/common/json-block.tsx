import * as React from "react"
import { CopyIcon, Maximize2Icon, CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Syntax highlighting
// ---------------------------------------------------------------------------

function highlightJson(str: string): React.ReactNode {
  const lines = str.split("\n")
  return (
    <>
      {lines.map((line, i) => {
        const parts: React.ReactNode[] = []
        let rest = line
        let keyCounter = 0

        // Match key-value pairs: "key": value
        const kvMatch = rest.match(/^(\s*)"((?:[^"\\]|\\.)*")(\s*:\s*)/)
        if (kvMatch) {
          parts.push(
            <span key={keyCounter++}>{kvMatch[1]}</span>,
            <span key={keyCounter++} className="text-info">
              {kvMatch[2]}
            </span>,
            <span key={keyCounter++}>{kvMatch[3]}</span>,
          )
          rest = rest.slice(kvMatch[0].length)
        }

        // Match remaining tokens: strings, numbers, booleans, null, punctuation
        const tokenRegex =
          /("(?:[^"\\]|\\.)*")|(true|false|null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g
        let match
        let lastIdx = 0
        while ((match = tokenRegex.exec(rest)) !== null) {
          if (match.index > lastIdx) {
            parts.push(
              <span key={keyCounter++}>
                {rest.slice(lastIdx, match.index)}
              </span>,
            )
          }
          if (match[1]) {
            parts.push(
              <span key={keyCounter++} className="text-success">
                {match[1]}
              </span>,
            )
          } else if (match[2]) {
            parts.push(
              <span key={keyCounter++} className="text-warning">
                {match[2]}
              </span>,
            )
          } else if (match[3]) {
            parts.push(
              <span key={keyCounter++} className="text-info">
                {match[3]}
              </span>,
            )
          } else if (match[4]) {
            parts.push(
              <span key={keyCounter++} className="text-muted-foreground">
                {match[4]}
              </span>,
            )
          }
          lastIdx = match.index + match[0].length
        }
        if (lastIdx < rest.length) {
          parts.push(<span key={keyCounter}>{rest.slice(lastIdx)}</span>)
        }

        return (
          <React.Fragment key={i}>
            {parts}
            {i < lines.length - 1 ? "\n" : ""}
          </React.Fragment>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// JsonBlock — JSON content with highlighting, copy, and full-view
// ---------------------------------------------------------------------------

interface JsonBlockProps {
  value: unknown
  className?: string
  maxHeightClass?: string
}

function tryStringify(value: unknown): { text: string; isJson: boolean } {
  if (value === null || value === undefined) {
    return { text: String(value ?? "—"), isJson: false }
  }
  if (typeof value === "string") {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(value)
      return { text: JSON.stringify(parsed, null, 2), isJson: true }
    } catch {
      return { text: value, isJson: false }
    }
  }
  // Object/array — always JSON
  try {
    return { text: JSON.stringify(value, null, 2), isJson: true }
  } catch {
    return { text: String(value), isJson: false }
  }
}

export function JsonBlock({ value, className, maxHeightClass }: JsonBlockProps) {
  const [copied, setCopied] = React.useState(false)
  const [fullViewOpen, setFullViewOpen] = React.useState(false)

  const { text, isJson } = React.useMemo(() => tryStringify(value), [value])

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }, [text])

  return (
    <>
      <div className="group relative">
        <pre
          className={cn(
            "overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground/90",
            maxHeightClass,
            className,
          )}
        >
          {isJson ? highlightJson(text) : text}
        </pre>

        {/* Action buttons — top right */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void handleCopy()}
                  className="bg-background/80 backdrop-blur-sm"
                />
              }
            >
              {copied ? (
                <CheckIcon className="size-3 text-success" />
              ) : (
                <CopyIcon className="size-3" />
              )}
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>

          {isJson && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setFullViewOpen(true)}
                    className="bg-background/80 backdrop-blur-sm"
                  />
                }
              >
                <Maximize2Icon className="size-3" />
              </TooltipTrigger>
              <TooltipContent>Open full view</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Full-view dialog */}
      {isJson && (
        <Dialog open={fullViewOpen} onOpenChange={setFullViewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                JSON Viewer
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void handleCopy()}
                >
                  {copied ? (
                    <CheckIcon className="size-3.5 text-success" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                </Button>
              </DialogTitle>
            </DialogHeader>
            <pre className="max-h-[70vh] overflow-auto rounded-md border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground/90">
              {highlightJson(text)}
            </pre>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
