/**
 * BodyTypeSelector — shared Select component for choosing a request body type.
 *
 * Uses the canonical PostType values from body-types.ts.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BODY_TYPE_OPTIONS, type PostType } from "@/lib/body-types"

interface BodyTypeSelectorProps {
  value: PostType
  onChange: (value: PostType) => void
  disabled?: boolean
  className?: string
  id?: string
}

export function BodyTypeSelector({
  value,
  onChange,
  disabled,
  className,
  id,
}: BodyTypeSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as PostType)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder="Select body type" />
      </SelectTrigger>
      <SelectContent>
        {BODY_TYPE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
