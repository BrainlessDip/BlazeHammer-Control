/**
 * BinaryBodyInput — file path input for binary request bodies.
 */

import { FileIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface BinaryBodyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function BinaryBodyInput({
  value,
  onChange,
  placeholder = "File path or URL",
}: BinaryBodyInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2.5">
        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-auto border-0 bg-transparent p-0 font-mono text-xs shadow-none focus-visible:ring-0"
        />
        {value && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onChange("")}
                  className="shrink-0"
                />
              }
            >
              <XIcon className="size-3" />
            </TooltipTrigger>
            <TooltipContent>Clear</TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Path to a file on disk or a URL. The backend reads the file and sends
        its contents as <code>application/octet-stream</code>.
      </p>
    </div>
  )
}
