import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
}

export function CopyButton({ value, label = "Copy", className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Copy failed", {
        description: "Clipboard access was denied by the browser.",
      })
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5 font-mono text-xs", className)}
      onClick={handleCopy}
      aria-label={label}
    >
      {copied ? (
        <CheckIcon className="text-success" aria-hidden="true" />
      ) : (
        <CopyIcon aria-hidden="true" />
      )}
      {label}
    </Button>
  )
}
