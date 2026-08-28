/**
 * FormBodyEditor — key/value editor for form-urlencoded and multipart text fields.
 *
 * Supports: add, remove, duplicate, enable/disable fields.
 * Each field has: key, value, type (text/file), enabled.
 */

import { GripVerticalIcon, PlusIcon, TrashIcon, CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  createFormField,
  type FormField,
  type FormFieldType,
} from "@/lib/body-types"

interface FormBodyEditorProps {
  fields: FormField[]
  onChange: (fields: FormField[]) => void
  showFileOption?: boolean
  placeholder?: { key?: string; value?: string }
}

export function FormBodyEditor({
  fields,
  onChange,
  showFileOption = false,
  placeholder,
}: FormBodyEditorProps) {
  const update = (id: string, patch: Partial<FormField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  const remove = (id: string) => {
    onChange(fields.filter((f) => f.id !== id))
  }

  const duplicate = (field: FormField) => {
    const idx = fields.findIndex((f) => f.id === field.id)
    const copy = createFormField({
      key: field.key,
      value: field.value,
      type: field.type,
      enabled: field.enabled,
    })
    const next = [...fields]
    next.splice(idx + 1, 0, copy)
    onChange(next)
  }

  const addField = () => {
    onChange([...fields, createFormField()])
  }

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field) => (
        <div key={field.id} className="flex items-center gap-2">
          <button
            type="button"
            className="shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground"
            aria-label="Drag to reorder"
          >
            <GripVerticalIcon className="size-4" />
          </button>

          <Input
            value={field.key}
            onChange={(e) => update(field.id, { key: e.target.value })}
            placeholder={placeholder?.key ?? "Key"}
            className="h-8 flex-1 font-mono text-xs"
          />

          {showFileOption && field.type === "file" ? (
            <div className="flex h-8 flex-1 items-center rounded-md border border-dashed bg-muted/30 px-3 font-mono text-xs text-muted-foreground">
              {field.value || "File path"}
            </div>
          ) : (
            <Input
              value={field.value}
              onChange={(e) => update(field.id, { value: e.target.value })}
              placeholder={placeholder?.value ?? "Value"}
              className="h-8 flex-1 font-mono text-xs"
            />
          )}

          {showFileOption && (
            <Select
              value={field.type}
              onValueChange={(v) =>
                update(field.id, {
                  type: v as FormFieldType,
                  value: v === "file" ? "" : field.value,
                })
              }
            >
              <SelectTrigger className="h-8 w-20 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="file">File</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => duplicate(field)}
                  className="shrink-0"
                />
              }
            >
              <CopyIcon className="size-3" />
            </TooltipTrigger>
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(field.id)}
                  className="shrink-0 text-destructive/70 hover:text-destructive"
                />
              }
            >
              <TrashIcon className="size-3" />
            </TooltipTrigger>
            <TooltipContent>Remove</TooltipContent>
          </Tooltip>
        </div>
      ))}

      <Separator className="my-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={addField}
        className="w-full gap-1.5 text-muted-foreground"
      >
        <PlusIcon className="size-3.5" />
        Add field
      </Button>
    </div>
  )
}
