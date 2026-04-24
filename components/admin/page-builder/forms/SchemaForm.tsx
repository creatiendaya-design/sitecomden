"use client"

// Placeholder for the real SchemaForm — Task 6 of Plan 2.7 replaces this
// implementation. It exists now only so GroupField can import it without
// breaking the type-check.
import type { FormSchema } from "@/lib/blocks/schema"

interface Props {
  schema: FormSchema
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
}

export function SchemaForm(_props: Props) {
  return null
}
