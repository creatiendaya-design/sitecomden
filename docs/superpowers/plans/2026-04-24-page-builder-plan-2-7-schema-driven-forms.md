# Page Builder — Plan 2.7: Schema-driven Forms Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 11 hand-coded `*ContentForm.tsx` adapters with a JSON schema per block type. Adding a new block becomes writing a schema + a renderer; the form UI is generated automatically. Matches Shopify Liquid section `{% schema %}` philosophy — developers still author blocks, but with far less boilerplate and consistent UX across every form.

**Architecture:** Each `BlockDefinition` gains a `contentSchema: FormField[]` field describing the block's data shape as input primitives (text, textarea, richtext, color, image, select, switch, number, array, icon, product-picker, group, conditional). A single generic `<SchemaForm schema value onChange>` component reads the schema and emits a form. Existing per-block hand-coded adapters are deleted incrementally. Escape hatch: `{ type: "custom", component: MyField }` for rare bespoke cases.

**Tech Stack:** TypeScript, React 19, shadcn/ui primitives (Input, Select, Switch, etc.), TipTap (for richtext primitive), lucide-react (for icon primitive).

**Preceded by:** Plan 2.5 (block-aware filtering + RichText fixes) must be merged first.
**Followed by:** Plan 2.8 (advanced style controls built on schema: padding top/bottom, typography, gradient), then Plan 3 (templates).

**Scope explicitly NOT in this plan:**
- New style controls (padding top/bottom, typography, gradient) — those wait for Plan 2.8 so they're built as schema primitives, not hand-coded
- Admin-creatable section types via UI (Option B in the brainstorming) — deferred indefinitely
- Migration of data (schema-driven forms read and write the SAME `content.data` shape — no DB migration)

**Pre-flight:**

```bash
git checkout master
git pull --ff-only
git status
git checkout -b feature/page-builder-plan-2-7
```

---

## File Structure

**New files:**
```
lib/blocks/schema/
├── types.ts                      # FormField, FormSchema, primitive type definitions
├── index.ts                      # Re-exports for clean imports
└── primitives/
    ├── TextField.tsx             # type: "text" and "textarea"
    ├── RichTextField.tsx         # type: "richtext" — TipTap wrapper
    ├── ColorField.tsx            # type: "color" — color picker + hex input
    ├── ImageField.tsx            # type: "image" — with optional device slots
    ├── SelectField.tsx           # type: "select" — dropdown
    ├── SwitchField.tsx           # type: "switch" — boolean toggle
    ├── NumberField.tsx           # type: "number"
    ├── ArrayField.tsx            # type: "array" — drag-sort + nested schema
    ├── IconField.tsx             # type: "icon" — lucide curated picker
    ├── ProductPickerField.tsx    # type: "product-picker" — search + multi-select
    ├── GroupField.tsx            # type: "group" — labelled sub-schema (for nested objects)
    └── ConditionalField.tsx      # wrapper that hides based on showWhen

components/admin/page-builder/forms/
└── SchemaForm.tsx                # Generic renderer: reads schema + value, emits form
```

**Modified files:**
```
lib/blocks/registry.ts                           # Add optional contentSchema: FormSchema to BlockDefinition
lib/blocks/register-existing-blocks.tsx          # Declare contentSchema per block, remove form imports
components/admin/page-builder/RightSidebar/tabs/ContentTab.tsx   # Render SchemaForm when schema is present
```

**Deleted files (at end of plan, after all blocks migrated):**
```
components/admin/page-builder/forms/adapters/HeroContentForm.tsx
components/admin/page-builder/forms/adapters/BenefitsContentForm.tsx
components/admin/page-builder/forms/adapters/GalleryContentForm.tsx
components/admin/page-builder/forms/adapters/TestimonialsContentForm.tsx
components/admin/page-builder/forms/adapters/VideoContentForm.tsx
components/admin/page-builder/forms/adapters/TickerContentForm.tsx
components/admin/page-builder/forms/adapters/TrustBadgesContentForm.tsx
components/admin/page-builder/forms/adapters/RichTextContentForm.tsx
components/admin/page-builder/forms/adapters/FaqContentForm.tsx
components/admin/page-builder/forms/adapters/ImageTextContentForm.tsx
components/admin/page-builder/forms/adapters/RelatedProductsContentForm.tsx
components/admin/page-builder/forms/StubContentForm.tsx
(ColorsContentForm was already removed in Plan 2)
```

---

## Task 1: Define the schema types

**Files:**
- Create: `lib/blocks/schema/types.ts`

- [ ] **Step 1: Create the schema type definitions**

```typescript
import type { ComponentType } from "react"

/**
 * A FormSchema is an ordered array of FormField definitions describing a
 * block's data shape. The SchemaForm component renders inputs from this.
 *
 * Every field has a `key` (where to read/write the value on content.data)
 * and a `type` (which primitive to render). Additional fields are specific
 * to each type.
 */
export type FormSchema = FormField[]

export type FormField =
  | TextFieldDef
  | TextAreaFieldDef
  | RichTextFieldDef
  | ColorFieldDef
  | ImageFieldDef
  | SelectFieldDef
  | SwitchFieldDef
  | NumberFieldDef
  | ArrayFieldDef
  | IconFieldDef
  | ProductPickerFieldDef
  | GroupFieldDef
  | CustomFieldDef

interface BaseFieldDef {
  /** Key in content.data where this field's value lives. For nested paths,
   *  use dot notation — e.g. "autoFilters.limit" in a group. */
  key: string
  /** User-facing label shown above/next to the input. */
  label?: string
  /** Optional help text shown below the input. */
  helpText?: string
  /** Show this field only when another field in the same schema equals a
   *  specific value. Example: { field: "mode", equals: "auto" }. */
  showWhen?: { field: string; equals: unknown }
}

export interface TextFieldDef extends BaseFieldDef {
  type: "text"
  placeholder?: string
  maxLength?: number
}

export interface TextAreaFieldDef extends BaseFieldDef {
  type: "textarea"
  placeholder?: string
  rows?: number
}

export interface RichTextFieldDef extends BaseFieldDef {
  type: "richtext"
  placeholder?: string
}

export interface ColorFieldDef extends BaseFieldDef {
  type: "color"
  /** If true, value stored as DeviceValue<string> (Plan 1 opt-in override). */
  deviceOverride?: boolean
}

export interface ImageFieldDef extends BaseFieldDef {
  type: "image"
  /** If true, always-on Desktop/Mobile slots (value is { desktop, mobile }).
   *  If false, single image (value is string URL). Default: true. */
  deviceOverride?: boolean
}

export interface SelectFieldDef extends BaseFieldDef {
  type: "select"
  options: Array<{ value: string | number; label: string }>
}

export interface SwitchFieldDef extends BaseFieldDef {
  type: "switch"
}

export interface NumberFieldDef extends BaseFieldDef {
  type: "number"
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

export interface ArrayFieldDef extends BaseFieldDef {
  type: "array"
  /** Schema for each item in the array. Items are stored as objects. */
  itemSchema: FormSchema
  /** Callback to produce a new item's default value when the user clicks
   *  "+ Add". Should return an object matching itemSchema shape. */
  newItem: () => Record<string, unknown>
  /** Label shown on each item header (e.g. "Pregunta 1", "Pregunta 2"). */
  itemLabel?: (item: Record<string, unknown>, index: number) => string
  addButtonText?: string
  /** Enable drag-and-drop reordering (uses @dnd-kit). Default: true. */
  sortable?: boolean
}

export interface IconFieldDef extends BaseFieldDef {
  type: "icon"
  /** Curated subset of lucide icon names. Empty means show a larger list. */
  curated: string[]
}

export interface ProductPickerFieldDef extends BaseFieldDef {
  type: "product-picker"
  /** If true, allow picking multiple products; value is string[] of product
   *  ids. If false, single product id. Default: true. */
  multiple?: boolean
  placeholder?: string
}

export interface GroupFieldDef extends BaseFieldDef {
  type: "group"
  /** Nested schema. The group's key is prepended to each child's key path. */
  schema: FormSchema
  /** Render as collapsible panel (default true) or inline section. */
  collapsible?: boolean
  defaultOpen?: boolean
}

export interface CustomFieldDef extends BaseFieldDef {
  type: "custom"
  /** Escape hatch: a React component that receives { value, onChange } for
   *  this field's value. Use only when no primitive fits. */
  component: ComponentType<{
    value: unknown
    onChange: (v: unknown) => void
  }>
}
```

- [ ] **Step 2: Create the barrel file**

Create `lib/blocks/schema/index.ts`:

```typescript
export * from "./types"
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/blocks/schema/
git commit -m "feat(schema): define FormSchema + FormField types (12 primitives)"
```

---

## Task 2: Implement basic primitives (Text, Textarea, Switch, Number)

**Files:**
- Create: `lib/blocks/schema/primitives/TextField.tsx`
- Create: `lib/blocks/schema/primitives/SwitchField.tsx`
- Create: `lib/blocks/schema/primitives/NumberField.tsx`

Each primitive is a React component that takes `{ field, value, onChange }` and renders the appropriate input.

- [ ] **Step 1: Create `TextField.tsx`**

```typescript
"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { TextFieldDef, TextAreaFieldDef } from "../types"

interface Props {
  field: TextFieldDef | TextAreaFieldDef
  value: unknown
  onChange: (v: string | undefined) => void
}

export function TextField({ field, value, onChange }: Props) {
  const str = typeof value === "string" ? value : ""
  const common = {
    value: str,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value || undefined),
    placeholder: field.placeholder,
  }

  return (
    <div>
      {field.label && (
        <Label className="text-xs mb-1 block">{field.label}</Label>
      )}
      {field.type === "textarea" ? (
        <Textarea {...common} rows={(field as TextAreaFieldDef).rows ?? 3} className="text-sm" />
      ) : (
        <Input
          {...common}
          maxLength={(field as TextFieldDef).maxLength}
          className="text-sm"
        />
      )}
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `SwitchField.tsx`**

```typescript
"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { SwitchFieldDef } from "../types"

interface Props {
  field: SwitchFieldDef
  value: unknown
  onChange: (v: boolean) => void
}

export function SwitchField({ field, value, onChange }: Props) {
  const bool = value === true
  return (
    <div className="flex items-center gap-2">
      <Switch checked={bool} onCheckedChange={onChange} />
      <Label className="text-xs">{field.label}</Label>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground ml-auto">{field.helpText}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `NumberField.tsx`**

```typescript
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { NumberFieldDef } from "../types"

interface Props {
  field: NumberFieldDef
  value: unknown
  onChange: (v: number | undefined) => void
}

export function NumberField({ field, value, onChange }: Props) {
  const num = typeof value === "number" ? value : undefined
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <Input
        type="number"
        value={num ?? ""}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
        onChange={(e) => {
          const v = e.target.value === "" ? undefined : Number(e.target.value)
          if (v === undefined || Number.isNaN(v)) {
            onChange(undefined)
            return
          }
          const clamped =
            field.min !== undefined && v < field.min ? field.min :
            field.max !== undefined && v > field.max ? field.max : v
          onChange(clamped)
        }}
        className="text-sm"
      />
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit
git add lib/blocks/schema/primitives/
git commit -m "feat(schema): add Text, Switch, Number primitives"
```

---

## Task 3: Implement Color, Image, Select primitives

**Files:**
- Create: `lib/blocks/schema/primitives/ColorField.tsx` (wraps existing ColorControl)
- Create: `lib/blocks/schema/primitives/ImageField.tsx` (wraps existing ImageControl)
- Create: `lib/blocks/schema/primitives/SelectField.tsx`

- [ ] **Step 1: Create `ColorField.tsx`**

```typescript
"use client"

import { ColorControl } from "@/components/admin/page-builder/RightSidebar/controls/ColorControl"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { ColorFieldDef } from "../types"
import type { DeviceValue } from "@/lib/blocks/types"

interface Props {
  field: ColorFieldDef
  value: unknown
  onChange: (v: DeviceValue<string> | string | undefined) => void
}

export function ColorField({ field, value, onChange }: Props) {
  if (field.deviceOverride) {
    return (
      <ColorControl
        label={field.label ?? ""}
        value={value as DeviceValue<string> | undefined}
        onChange={onChange}
      />
    )
  }
  const str = typeof value === "string" ? value : ""
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={str || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded border cursor-pointer p-0.5"
        />
        <Input
          value={str}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="#000000"
          className="text-xs h-8 font-mono flex-1"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `ImageField.tsx`**

```typescript
"use client"

import { ImageControl } from "@/components/admin/page-builder/RightSidebar/controls/ImageControl"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"
import type { ImageFieldDef } from "../types"

interface Props {
  field: ImageFieldDef
  value: unknown
  onChange: (v: { desktop?: string; mobile?: string } | string | undefined) => void
}

export function ImageField({ field, value, onChange }: Props) {
  const deviceOverride = field.deviceOverride ?? true

  if (deviceOverride) {
    return (
      <ImageControl
        label={field.label ?? ""}
        value={value as { desktop?: string; mobile?: string } | undefined}
        onChange={onChange}
      />
    )
  }

  return <SingleImage field={field} value={value as string | undefined} onChange={(v) => onChange(v)} />
}

function SingleImage({
  field,
  value,
  onChange,
}: {
  field: ImageFieldDef
  value?: string
  onChange: (v: string | undefined) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const data = (await res.json()) as { url: string }
      onChange(data.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir imagen")
    } finally {
      setLoading(false)
      e.target.value = ""
    }
  }

  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      {value ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
          <Image src={value} alt="" fill className="object-cover" unoptimized />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 shadow"
            onClick={() => onChange(undefined)}
            aria-label="Quitar imagen"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 p-3 rounded-md border-2 border-dashed text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
          <Upload className="h-3.5 w-3.5" />
          {loading ? "Subiendo..." : "Subir imagen"}
          <input type="file" accept="image/*" onChange={handleFile} disabled={loading} className="hidden" />
        </label>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `SelectField.tsx`**

```typescript
"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { SelectFieldDef } from "../types"

interface Props {
  field: SelectFieldDef
  value: unknown
  onChange: (v: string | number) => void
}

export function SelectField({ field, value, onChange }: Props) {
  const str = value === undefined || value === null ? "" : String(value)
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <Select
        value={str}
        onValueChange={(v) => {
          // Preserve original type (number vs string) by looking up in options
          const opt = field.options.find((o) => String(o.value) === v)
          onChange(opt ? opt.value : v)
        }}
      >
        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {field.options.map((o) => (
            <SelectItem key={String(o.value)} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit
git add lib/blocks/schema/primitives/
git commit -m "feat(schema): add Color, Image, Select primitives (wrap existing controls)"
```

---

## Task 4: Implement RichText + Icon + Group primitives

**Files:**
- Create: `lib/blocks/schema/primitives/RichTextField.tsx`
- Create: `lib/blocks/schema/primitives/IconField.tsx`
- Create: `lib/blocks/schema/primitives/GroupField.tsx`

- [ ] **Step 1: Create `RichTextField.tsx`**

```typescript
"use client"

import dynamic from "next/dynamic"
import { Label } from "@/components/ui/label"
import type { RichTextFieldDef } from "../types"

const RichTextEditor = dynamic(
  () => import("@/components/admin/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-24 animate-pulse bg-muted rounded" /> }
)

interface Props {
  field: RichTextFieldDef
  value: unknown
  onChange: (html: string) => void
}

export function RichTextField({ field, value, onChange }: Props) {
  const html = typeof value === "string" ? value : ""
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <RichTextEditor content={html} onChange={onChange} placeholder={field.placeholder} />
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `IconField.tsx`**

```typescript
"use client"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import * as LucideIcons from "lucide-react"
import type { ComponentType } from "react"
import type { IconFieldDef } from "../types"

interface Props {
  field: IconFieldDef
  value: unknown
  onChange: (name: string) => void
}

export function IconField({ field, value, onChange }: Props) {
  const current = typeof value === "string" ? value : ""
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <div className="flex flex-wrap gap-1">
        {field.curated.map((name) => {
          const Icon = (LucideIcons as unknown as Record<string, ComponentType<{ className?: string }>>)[name]
          if (!Icon) return null
          const active = current === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={cn(
                "p-2 rounded border transition-colors",
                active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-transparent",
              )}
              title={name}
              aria-label={name}
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
      </div>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `GroupField.tsx`**

```typescript
"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { GroupFieldDef } from "../types"
import { SchemaForm } from "@/components/admin/page-builder/forms/SchemaForm"

interface Props {
  field: GroupFieldDef
  value: unknown
  onChange: (v: Record<string, unknown>) => void
}

export function GroupField({ field, value, onChange }: Props) {
  const collapsible = field.collapsible ?? true
  const [open, setOpen] = useState(field.defaultOpen ?? true)
  const obj = (typeof value === "object" && value !== null) ? value as Record<string, unknown> : {}

  const body = (
    <div className="space-y-3">
      <SchemaForm schema={field.schema} value={obj} onChange={onChange} />
    </div>
  )

  if (!collapsible) {
    return (
      <div className="pl-3 border-l-2 border-muted">
        {field.label && <Label className="text-xs font-semibold mb-2 block">{field.label}</Label>}
        {body}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/50"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span className="text-xs font-medium">{field.label}</span>
      </button>
      {open && <div className={cn("p-3 pt-0 border-t")}>{body}</div>}
    </div>
  )
}
```

Note: `GroupField` imports `SchemaForm` which doesn't exist yet — that's Task 6. TypeScript will error until then. Accept the error and continue.

- [ ] **Step 4: Commit (tsc will error until Task 6 — noted)**

```bash
git add lib/blocks/schema/primitives/
git commit -m "feat(schema): add RichText, Icon, Group primitives (SchemaForm follows in Task 6)"
```

---

## Task 5: Implement Array primitive (drag-sortable nested schemas)

**Files:**
- Create: `lib/blocks/schema/primitives/ArrayField.tsx`

- [ ] **Step 1: Create `ArrayField.tsx`**

```typescript
"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
import type { ArrayFieldDef } from "../types"
import { SchemaForm } from "@/components/admin/page-builder/forms/SchemaForm"

interface Props {
  field: ArrayFieldDef
  value: unknown
  onChange: (v: Record<string, unknown>[]) => void
}

export function ArrayField({ field, value, onChange }: Props) {
  const items: Record<string, unknown>[] = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : []

  const sortable = field.sortable !== false

  const addItem = () => {
    onChange([...items, ensureId(field.newItem())])
  }

  const updateItem = (index: number, next: Record<string, unknown>) => {
    const copy = [...items]
    copy[index] = next
    onChange(copy)
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fromIdx = items.findIndex((it) => String(it.id ?? it._id ?? "") === active.id)
    const toIdx = items.findIndex((it) => String(it.id ?? it._id ?? "") === over.id)
    if (fromIdx < 0 || toIdx < 0) return
    onChange(arrayMove(items, fromIdx, toIdx))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {field.label && <Label className="text-xs font-semibold">{field.label}</Label>}
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          <Plus className="h-3 w-3 mr-1" />
          {field.addButtonText ?? "Agregar"}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-3 border border-dashed rounded">
          Sin elementos. Click "{field.addButtonText ?? "Agregar"}" para comenzar.
        </p>
      ) : sortable ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((it) => String(it.id ?? it._id ?? ""))} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, i) => (
                <SortableItem
                  key={String(item.id ?? item._id ?? i)}
                  id={String(item.id ?? item._id ?? i)}
                  index={i}
                  item={item}
                  field={field}
                  onUpdate={(next) => updateItem(i, next)}
                  onRemove={() => removeItem(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <StaticItem
              key={String(item.id ?? item._id ?? i)}
              index={i}
              item={item}
              field={field}
              onUpdate={(next) => updateItem(i, next)}
              onRemove={() => removeItem(i)}
            />
          ))}
        </div>
      )}

      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}

function ensureId(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj.id || obj._id) return obj
  return { ...obj, id: crypto.randomUUID() }
}

function SortableItem({
  id,
  index,
  item,
  field,
  onUpdate,
  onRemove,
}: {
  id: string
  index: number
  item: Record<string, unknown>
  field: ArrayFieldDef
  onUpdate: (next: Record<string, unknown>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="border rounded-md">
      <ItemBody
        index={index}
        item={item}
        field={field}
        onUpdate={onUpdate}
        onRemove={onRemove}
        dragHandle={
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground"
            aria-label="Arrastrar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  )
}

function StaticItem({
  index,
  item,
  field,
  onUpdate,
  onRemove,
}: {
  index: number
  item: Record<string, unknown>
  field: ArrayFieldDef
  onUpdate: (next: Record<string, unknown>) => void
  onRemove: () => void
}) {
  return (
    <div className="border rounded-md">
      <ItemBody index={index} item={item} field={field} onUpdate={onUpdate} onRemove={onRemove} />
    </div>
  )
}

function ItemBody({
  index,
  item,
  field,
  onUpdate,
  onRemove,
  dragHandle,
}: {
  index: number
  item: Record<string, unknown>
  field: ArrayFieldDef
  onUpdate: (next: Record<string, unknown>) => void
  onRemove: () => void
  dragHandle?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const label = field.itemLabel ? field.itemLabel(item, index) : `Elemento ${index + 1}`

  return (
    <>
      <div className="flex items-center gap-2 p-2">
        {dragHandle}
        <span className="text-xs flex-1 truncate">{label}</span>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen((p) => !p)}>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {open && (
        <div className="p-3 pt-0 border-t space-y-3">
          <SchemaForm schema={field.itemSchema} value={item} onChange={onUpdate} />
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit (tsc will still error until Task 6)**

```bash
git add lib/blocks/schema/primitives/ArrayField.tsx
git commit -m "feat(schema): add Array primitive with drag-sort + nested SchemaForm"
```

---

## Task 6: Implement `SchemaForm` generic renderer + ConditionalField + CustomField

**Files:**
- Create: `components/admin/page-builder/forms/SchemaForm.tsx`

- [ ] **Step 1: Create the renderer**

```typescript
"use client"

import type { FormField, FormSchema } from "@/lib/blocks/schema/types"
import { TextField } from "@/lib/blocks/schema/primitives/TextField"
import { SwitchField } from "@/lib/blocks/schema/primitives/SwitchField"
import { NumberField } from "@/lib/blocks/schema/primitives/NumberField"
import { ColorField } from "@/lib/blocks/schema/primitives/ColorField"
import { ImageField } from "@/lib/blocks/schema/primitives/ImageField"
import { SelectField } from "@/lib/blocks/schema/primitives/SelectField"
import { RichTextField } from "@/lib/blocks/schema/primitives/RichTextField"
import { IconField } from "@/lib/blocks/schema/primitives/IconField"
import { GroupField } from "@/lib/blocks/schema/primitives/GroupField"
import { ArrayField } from "@/lib/blocks/schema/primitives/ArrayField"

interface Props {
  schema: FormSchema
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

export function SchemaForm({ schema, value, onChange }: Props) {
  return (
    <div className="space-y-3">
      {schema.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          allValues={value}
          onChangeField={(v) => onChange({ ...value, [field.key]: v })}
        />
      ))}
    </div>
  )
}

function FieldRenderer({
  field,
  allValues,
  onChangeField,
}: {
  field: FormField
  allValues: Record<string, unknown>
  onChangeField: (v: unknown) => void
}) {
  // Conditional visibility
  if (field.showWhen) {
    const current = allValues[field.showWhen.field]
    if (current !== field.showWhen.equals) return null
  }

  const fieldValue = allValues[field.key]

  switch (field.type) {
    case "text":
    case "textarea":
      return <TextField field={field} value={fieldValue} onChange={onChangeField} />
    case "switch":
      return <SwitchField field={field} value={fieldValue} onChange={onChangeField} />
    case "number":
      return <NumberField field={field} value={fieldValue} onChange={onChangeField} />
    case "color":
      return <ColorField field={field} value={fieldValue} onChange={onChangeField} />
    case "image":
      return <ImageField field={field} value={fieldValue} onChange={onChangeField} />
    case "select":
      return <SelectField field={field} value={fieldValue} onChange={onChangeField} />
    case "richtext":
      return <RichTextField field={field} value={fieldValue} onChange={onChangeField} />
    case "icon":
      return <IconField field={field} value={fieldValue} onChange={onChangeField} />
    case "group":
      return (
        <GroupField
          field={field}
          value={fieldValue}
          onChange={(v) => onChangeField(v)}
        />
      )
    case "array":
      return <ArrayField field={field} value={fieldValue} onChange={onChangeField} />
    case "custom": {
      const Comp = field.component
      return <Comp value={fieldValue} onChange={onChangeField} />
    }
    default: {
      const _exhaustive: never = field
      void _exhaustive
      return null
    }
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors. Task 4 and 5's commits should compile now.

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-builder/forms/SchemaForm.tsx
git commit -m "feat(schema): add SchemaForm generic renderer with conditional and custom support"
```

---

## Task 7: Implement ProductPickerField primitive

**Files:**
- Create: `lib/blocks/schema/primitives/ProductPickerField.tsx`

- [ ] **Step 1: Create the picker (wraps existing product-picker logic from Plan 2's RelatedProductsContentForm)**

```typescript
"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { searchProductsForPicker, type RelatedProductCard } from "@/actions/related-products"
import { toast } from "sonner"
import type { ProductPickerFieldDef } from "../types"

interface Props {
  field: ProductPickerFieldDef
  value: unknown
  onChange: (v: string[] | string | undefined) => void
}

export function ProductPickerField({ field, value, onChange }: Props) {
  const multiple = field.multiple ?? true
  const selectedIds = multiple
    ? (Array.isArray(value) ? (value as string[]) : [])
    : (typeof value === "string" ? [value] : [])

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<RelatedProductCard[]>([])
  const [selected, setSelected] = useState<RelatedProductCard[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelected([])
      return
    }
    searchProductsForPicker("", 100)
      .then((rows) => setSelected(rows.filter((r) => selectedIds.includes(r.id))))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join(",")])

  const runSearch = async () => {
    setLoading(true)
    try {
      const rows = await searchProductsForPicker(query, 20)
      setResults(rows)
    } catch {
      toast.error("Error al buscar productos")
    } finally {
      setLoading(false)
    }
  }

  const addOne = (p: RelatedProductCard) => {
    if (multiple) {
      if (selectedIds.includes(p.id)) return
      onChange([...selectedIds, p.id])
    } else {
      onChange(p.id)
    }
  }

  const removeOne = (id: string) => {
    if (multiple) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange(undefined)
    }
  }

  return (
    <div className="space-y-2">
      {field.label && <Label className="text-xs">{field.label}</Label>}

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder={field.placeholder ?? "Nombre o slug"}
          className="text-sm h-8"
        />
        <Button type="button" size="sm" onClick={runSearch} disabled={loading}>
          <Search className="h-3 w-3" />
        </Button>
      </div>

      {results.length > 0 && (
        <div className="max-h-40 overflow-auto border rounded-md p-1">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => addOne(r)}
              disabled={selectedIds.includes(r.id)}
              className="w-full text-left px-2 py-1 text-xs hover:bg-muted rounded flex items-center gap-2"
            >
              <span className="flex-1 truncate">{r.name}</span>
              <span className="text-muted-foreground">{selectedIds.includes(r.id) ? "Agregado" : "+"}</span>
            </button>
          ))}
        </div>
      )}

      <div>
        <Label className="text-[10px] text-muted-foreground">
          Seleccionados ({selected.length}{multiple ? "" : selected.length > 0 ? " / 1" : ""})
        </Label>
        <div className="space-y-1 mt-1">
          {selected.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs border rounded-md p-1.5">
              <span className="flex-1 truncate">{p.name}</span>
              <button type="button" onClick={() => removeOne(p.id)} className="text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add `case "product-picker"` in SchemaForm's FieldRenderer**

Open `components/admin/page-builder/forms/SchemaForm.tsx`. Add the import:

```typescript
import { ProductPickerField } from "@/lib/blocks/schema/primitives/ProductPickerField"
```

Add a case before `case "custom":`:

```typescript
    case "product-picker":
      return <ProductPickerField field={field} value={fieldValue} onChange={onChangeField} />
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add lib/blocks/schema/primitives/ProductPickerField.tsx components/admin/page-builder/forms/SchemaForm.tsx
git commit -m "feat(schema): add ProductPicker primitive (wraps searchProductsForPicker)"
```

---

## Task 8: Add `contentSchema` field to `BlockDefinition` + update `ContentTab`

**Files:**
- Modify: `lib/blocks/registry.ts`
- Modify: `components/admin/page-builder/RightSidebar/tabs/ContentTab.tsx`

- [ ] **Step 1: Update `BlockDefinition`**

Open `lib/blocks/registry.ts`. Update imports:

```typescript
import type { BlockCategory, BlockContentV2, BlockScope, LandingBlockType, BlockStyleSupport } from "./types"
import type { FormSchema } from "./schema/types"
```

Inside `BlockDefinition`, add the optional field:

```typescript
  /** JSON schema describing this block's content.data fields. When present,
   *  the ContentTab renders a generic SchemaForm instead of calling the
   *  legacy `contentForm` component. Fully replaces contentForm once all
   *  blocks are migrated. */
  contentSchema?: FormSchema
```

Keep the existing `contentForm` field for now — blocks can use either, and we migrate incrementally.

- [ ] **Step 2: Update `ContentTab` to prefer `contentSchema` when present**

Open `components/admin/page-builder/RightSidebar/tabs/ContentTab.tsx`. Replace the render logic to branch on the two paths:

```typescript
"use client"

import { useBuilderStore } from "../../store"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { SchemaForm } from "@/components/admin/page-builder/forms/SchemaForm"
import type { BlockContentV2 } from "@/lib/blocks/types"

export function ContentTab() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)

  const block = blocks.find((b) => b.id === selectedBlockId)
  if (!block) return null

  const def = getBlockDefinition(block.type)
  if (!def) {
    return (
      <div className="p-4 text-xs text-destructive">
        No se encontró el formulario para el tipo {block.type}.
      </div>
    )
  }

  // Prefer schema-driven form if the block has declared a contentSchema.
  // Fall back to legacy contentForm otherwise, until all blocks are migrated.
  if (def.contentSchema) {
    const data = (block.content.data as Record<string, unknown>) ?? {}
    return (
      <SchemaForm
        schema={def.contentSchema}
        value={data}
        onChange={(nextData) =>
          updateBlockContent(block.id, {
            ...block.content,
            data: nextData,
          })
        }
      />
    )
  }

  if (def.contentForm) {
    const Form = def.contentForm
    return (
      <Form
        content={block.content}
        onChange={(newContent: BlockContentV2) => updateBlockContent(block.id, newContent)}
      />
    )
  }

  return <div className="p-4 text-xs text-muted-foreground">Este bloque no tiene formulario.</div>
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add lib/blocks/registry.ts components/admin/page-builder/RightSidebar/tabs/ContentTab.tsx
git commit -m "feat(schema): ContentTab renders SchemaForm when block declares contentSchema"
```

---

## Task 9: Migrate simple blocks to schema (HERO, TICKER, RICH_TEXT, COLORS)

**Files:**
- Modify: `lib/blocks/register-existing-blocks.tsx`
- Delete: `components/admin/page-builder/forms/adapters/HeroContentForm.tsx`
- Delete: `components/admin/page-builder/forms/adapters/TickerContentForm.tsx`
- Delete: `components/admin/page-builder/forms/adapters/RichTextContentForm.tsx`
- Delete: `components/admin/page-builder/forms/adapters/ColorsContentForm.tsx`

COLORS is kept in the renderer but removed from the picker (Plan 2). Its schema is optional to define — if skipped, nothing breaks. We'll skip it.

- [ ] **Step 1: Add contentSchema to HERO**

In `lib/blocks/register-existing-blocks.tsx`, find the HERO entry. Remove `contentForm: HeroContentForm as any,` and add:

```typescript
    contentSchema: [
      { type: "text", key: "title", label: "Título" },
      { type: "text", key: "subtitle", label: "Subtítulo" },
      { type: "text", key: "ctaText", label: "Texto del botón" },
    ],
```

Note: the background image and overlay color are handled via `content.media.bgImage` + Style tab's ImageControl in Plan 2; they are NOT content-tab fields. So the content schema only covers text.

- [ ] **Step 2: Remove the HeroContentForm import line**

Remove `import { HeroContentForm } from "@/components/admin/page-builder/forms/adapters/HeroContentForm"`.

- [ ] **Step 3: Add contentSchema to TICKER**

For TICKER, the data has: mode, sticky, scrollingText, speed, endsAt, countdownLabel, bgColor, textColor. Replace `contentForm` with:

```typescript
    contentSchema: [
      {
        type: "select",
        key: "mode",
        label: "Modo",
        options: [
          { value: "scrolling", label: "Solo texto scrolling" },
          { value: "countdown", label: "Solo contador regresivo" },
          { value: "both", label: "Scrolling + contador" },
        ],
      },
      { type: "switch", key: "sticky", label: "Sticky (fijo arriba)" },
      {
        type: "text",
        key: "scrollingText",
        label: "Texto scrolling",
        placeholder: "🔥 Oferta del día • Envío gratis •",
        showWhen: { field: "mode", equals: "scrolling" },
      },
      {
        type: "number",
        key: "speed",
        label: "Velocidad (px/s)",
        min: 10,
        max: 100,
        showWhen: { field: "mode", equals: "scrolling" },
      },
      {
        type: "text",
        key: "countdownLabel",
        label: "Etiqueta del contador",
        placeholder: "¡Oferta termina en:",
        showWhen: { field: "mode", equals: "countdown" },
      },
      {
        type: "text",
        key: "endsAt",
        label: "Fecha fin (ISO datetime)",
        placeholder: "2026-12-31T23:59:59",
        showWhen: { field: "mode", equals: "countdown" },
        helpText: "Formato ISO, por ejemplo 2026-12-31T23:59:59",
      },
      { type: "color", key: "bgColor", label: "Color de fondo" },
      { type: "color", key: "textColor", label: "Color de texto" },
    ],
```

Remove `import { TickerContentForm } ...`.

Note: `showWhen` currently only matches exact equality against one field. For TICKER mode=`both`, both scrolling and countdown fields should show. Extend the matching logic in Task 10 to accept `equals` as an array. Or accept this limitation for now and leave both fields always visible.

**For Plan 2.7 scope:** keep `showWhen` simple (single equals). Add `equalsAny` in a follow-up if needed. Remove the `showWhen` on TICKER fields so they're always visible — admins see all the options.

Actually, for TICKER, just remove the `showWhen` clauses so the fields are always shown. The user can ignore the irrelevant fields based on their chosen mode.

Revised TICKER schema (without showWhen):

```typescript
    contentSchema: [
      {
        type: "select",
        key: "mode",
        label: "Modo",
        options: [
          { value: "scrolling", label: "Solo texto scrolling" },
          { value: "countdown", label: "Solo contador regresivo" },
          { value: "both", label: "Scrolling + contador" },
        ],
      },
      { type: "switch", key: "sticky", label: "Sticky (fijo arriba)" },
      { type: "text", key: "scrollingText", label: "Texto scrolling", placeholder: "🔥 Oferta • Envío gratis •" },
      { type: "number", key: "speed", label: "Velocidad (px/s)", min: 10, max: 100 },
      { type: "text", key: "countdownLabel", label: "Etiqueta del contador" },
      { type: "text", key: "endsAt", label: "Fecha fin (ISO datetime)", placeholder: "2026-12-31T23:59:59" },
      { type: "color", key: "bgColor", label: "Color de fondo" },
      { type: "color", key: "textColor", label: "Color de texto" },
    ],
```

- [ ] **Step 4: Add contentSchema to RICH_TEXT**

Replace RICH_TEXT's contentForm with:

```typescript
    contentSchema: [
      {
        type: "richtext",
        key: "html",
        label: "Contenido",
        placeholder: "Escribe el contenido aquí...",
      },
    ],
```

Remove `import { RichTextContentForm } ...`.

- [ ] **Step 5: Delete the 3 form files**

```bash
rm components/admin/page-builder/forms/adapters/HeroContentForm.tsx
rm components/admin/page-builder/forms/adapters/TickerContentForm.tsx
rm components/admin/page-builder/forms/adapters/RichTextContentForm.tsx
```

- [ ] **Step 6: TypeScript check + commit**

```bash
npx tsc --noEmit
git add lib/blocks/register-existing-blocks.tsx components/admin/page-builder/forms/adapters/
git commit -m "feat(schema): migrate HERO, TICKER, RICH_TEXT to contentSchema"
```

- [ ] **Step 7: Manual verify**

Open the editor, add each of HERO, TICKER, RICH_TEXT. Verify the Content tab shows the expected fields, values persist, canvas updates.

---

## Task 10: Migrate medium blocks (BENEFITS, TESTIMONIALS, TRUST_BADGES, GALLERY, VIDEO)

These use `array` primitive.

- [ ] **Step 1: Add contentSchema to BENEFITS**

Replace BENEFITS's contentForm with:

```typescript
    contentSchema: [
      {
        type: "array",
        key: "cards",
        label: "Tarjetas",
        addButtonText: "+ Agregar tarjeta",
        newItem: () => ({
          id: crypto.randomUUID(),
          icon: "✅",
          title: "Beneficio",
          description: "Descripción",
        }),
        itemLabel: (it) => (it.title as string) || "Sin título",
        itemSchema: [
          { type: "text", key: "icon", label: "Ícono (emoji o nombre)" },
          { type: "text", key: "title", label: "Título" },
          { type: "textarea", key: "description", label: "Descripción", rows: 2 },
        ],
      },
    ],
```

- [ ] **Step 2: Add contentSchema to TESTIMONIALS**

```typescript
    contentSchema: [
      {
        type: "array",
        key: "items",
        label: "Testimonios",
        addButtonText: "+ Agregar testimonio",
        newItem: () => ({
          id: crypto.randomUUID(),
          name: "Cliente",
          text: "Excelente producto",
          rating: 5,
        }),
        itemLabel: (it) => (it.name as string) || "Sin nombre",
        itemSchema: [
          { type: "text", key: "name", label: "Nombre" },
          { type: "text", key: "photo", label: "URL de foto (opcional)" },
          { type: "textarea", key: "text", label: "Testimonio", rows: 3 },
          {
            type: "select",
            key: "rating",
            label: "Calificación",
            options: [
              { value: 1, label: "★" },
              { value: 2, label: "★★" },
              { value: 3, label: "★★★" },
              { value: 4, label: "★★★★" },
              { value: 5, label: "★★★★★" },
            ],
          },
        ],
      },
    ],
```

- [ ] **Step 3: Add contentSchema to TRUST_BADGES**

```typescript
    contentSchema: [
      {
        type: "select",
        key: "layout",
        label: "Layout",
        options: [
          { value: "horizontal", label: "Horizontal (grid)" },
          { value: "vertical", label: "Vertical (lista)" },
        ],
      },
      {
        type: "select",
        key: "columns",
        label: "Columnas",
        options: [
          { value: 2, label: "2" },
          { value: 3, label: "3" },
          { value: 4, label: "4" },
          { value: 5, label: "5" },
        ],
      },
      {
        type: "select",
        key: "iconSize",
        label: "Tamaño de íconos",
        options: [
          { value: "sm", label: "Pequeño" },
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
        ],
      },
      {
        type: "array",
        key: "badges",
        label: "Badges",
        addButtonText: "+ Agregar badge",
        newItem: () => ({
          id: crypto.randomUUID(),
          icon: "Shield",
          title: "Nuevo badge",
          subtitle: "",
        }),
        itemLabel: (it) => (it.title as string) || "Sin título",
        itemSchema: [
          {
            type: "icon",
            key: "icon",
            label: "Ícono (Lucide)",
            curated: [
              "Shield", "ShieldCheck", "Lock", "Truck", "Package", "RefreshCw",
              "Award", "Star", "Heart", "Gift", "Clock", "BadgeCheck",
              "CreditCard", "Headphones", "Phone", "Globe",
            ],
          },
          { type: "text", key: "title", label: "Título" },
          { type: "text", key: "subtitle", label: "Subtítulo (opcional)" },
        ],
      },
    ],
```

- [ ] **Step 4: Add contentSchema to GALLERY**

GALLERY's current form handles image uploads inline. The schema represents images as a list of URLs; upload UX will be simpler (one image at a time via the ImageField inside the array). Admins can add one image per click.

```typescript
    contentSchema: [
      {
        type: "select",
        key: "displayType",
        label: "Tipo de display",
        options: [
          { value: "slider", label: "Slider" },
          { value: "stacked", label: "Apilado" },
        ],
      },
      { type: "switch", key: "showBuyButton", label: "Mostrar botón de compra" },
      { type: "text", key: "buyButtonText", label: "Texto del botón", placeholder: "Comprar ahora" },
      {
        type: "array",
        key: "images",
        label: "Imágenes",
        addButtonText: "+ Agregar imagen",
        newItem: () => ({ id: crypto.randomUUID(), url: "" }),
        itemLabel: (_it, i) => `Imagen ${i + 1}`,
        itemSchema: [
          { type: "image", key: "url", label: "Imagen", deviceOverride: false },
        ],
      },
    ],
```

Note: this CHANGES the data shape for GALLERY from `images: string[]` to `images: { id, url }[]`. The GalleryBlock renderer needs to read both shapes. We update the renderer in a sub-step.

**Sub-step 4a: Update GalleryBlock renderer to read both shapes:**

In `components/shop/templates/blocks/GalleryBlock.tsx`, find where `images` is destructured. Add a normalizer:

```typescript
// After readContent(...)
const imagesRaw = content.images as (string | { url: string })[] | undefined;
const images: string[] = (imagesRaw ?? []).map((item) =>
  typeof item === "string" ? item : (item?.url ?? "")
).filter(Boolean);
```

Then use `images` everywhere.

- [ ] **Step 5: Add contentSchema to VIDEO**

```typescript
    contentSchema: [
      {
        type: "select",
        key: "displayType",
        label: "Tipo de display",
        options: [
          { value: "slider", label: "Slider" },
          { value: "stacked", label: "Apilado" },
        ],
      },
      { type: "switch", key: "showBuyButton", label: "Mostrar botón de compra" },
      { type: "text", key: "buyButtonText", label: "Texto del botón", placeholder: "Comprar ahora" },
      {
        type: "array",
        key: "videos",
        label: "Videos",
        addButtonText: "+ Agregar video",
        newItem: () => ({ id: crypto.randomUUID(), url: "", title: "", provider: "youtube" }),
        itemLabel: (it) => (it.title as string) || (it.url as string) || "Video",
        itemSchema: [
          { type: "text", key: "url", label: "URL del video" },
          { type: "text", key: "title", label: "Título (opcional)" },
          {
            type: "select",
            key: "provider",
            label: "Proveedor",
            options: [
              { value: "youtube", label: "YouTube" },
              { value: "vimeo", label: "Vimeo" },
              { value: "upload", label: "Subido" },
            ],
          },
        ],
      },
    ],
```

- [ ] **Step 6: Delete the 5 form files**

```bash
rm components/admin/page-builder/forms/adapters/BenefitsContentForm.tsx
rm components/admin/page-builder/forms/adapters/TestimonialsContentForm.tsx
rm components/admin/page-builder/forms/adapters/TrustBadgesContentForm.tsx
rm components/admin/page-builder/forms/adapters/GalleryContentForm.tsx
rm components/admin/page-builder/forms/adapters/VideoContentForm.tsx
```

Remove their imports from `register-existing-blocks.tsx`.

- [ ] **Step 7: TypeScript check + commit**

```bash
npx tsc --noEmit
git add lib/blocks/register-existing-blocks.tsx components/admin/page-builder/forms/adapters/ components/shop/templates/blocks/GalleryBlock.tsx
git commit -m "feat(schema): migrate BENEFITS, TESTIMONIALS, TRUST_BADGES, GALLERY, VIDEO to contentSchema"
```

---

## Task 11: Migrate complex blocks (FAQ, IMAGE_TEXT, RELATED_PRODUCTS)

- [ ] **Step 1: FAQ schema**

```typescript
    contentSchema: [
      { type: "text", key: "title", label: "Título (opcional)" },
      { type: "switch", key: "allowMultipleOpen", label: "Permitir varias abiertas" },
      { type: "switch", key: "defaultOpenFirst", label: "Abrir la primera por defecto" },
      {
        type: "array",
        key: "items",
        label: "Preguntas",
        addButtonText: "+ Agregar pregunta",
        newItem: () => ({
          id: crypto.randomUUID(),
          question: "Nueva pregunta",
          answer: "<p>Respuesta</p>",
        }),
        itemLabel: (it) => (it.question as string) || "Sin pregunta",
        itemSchema: [
          { type: "text", key: "question", label: "Pregunta" },
          { type: "richtext", key: "answer", label: "Respuesta" },
        ],
      },
    ],
```

- [ ] **Step 2: IMAGE_TEXT schema**

```typescript
    contentSchema: [
      { type: "text", key: "title", label: "Título" },
      { type: "richtext", key: "description", label: "Descripción" },
      {
        type: "select",
        key: "imagePosition",
        label: "Posición imagen (desktop)",
        options: [
          { value: "left", label: "Izquierda" },
          { value: "right", label: "Derecha" },
        ],
      },
      {
        type: "select",
        key: "ratioImageToText",
        label: "Proporción",
        options: [
          { value: "40-60", label: "40 / 60" },
          { value: "50-50", label: "50 / 50" },
          { value: "60-40", label: "60 / 40" },
        ],
      },
      { type: "text", key: "imageAlt", label: "Alt text", placeholder: "Descripción para lectores" },
      { type: "text", key: "ctaText", label: "Texto del botón (opcional)" },
      { type: "text", key: "ctaUrl", label: "URL del botón (opcional)" },
    ],
```

Note: IMAGE_TEXT's image lives in `content.media.image`, NOT `content.data`. The schema here covers only data fields. The media is still handled by the Style tab's ImageControl when `bgImage` is wanted, but IMAGE_TEXT specifically needs its image configurable in the Content tab. For this plan, the image stays in media and is accessed via an `image` field added to the schema with a pseudo-key:

Actually, the cleanest way: expose the media.image via a custom field:

Add to the IMAGE_TEXT schema:

```typescript
      {
        type: "custom",
        key: "__imageMedia",   // not read from data — custom reads from content.media
        label: "Imagen",
        component: ImageTextMediaField,
      },
```

And create a tiny custom component `ImageTextMediaField` that reads `content.media.image` directly from the builder store. Details in sub-step 2a.

For simplicity and because this introduces cross-cutting concerns, defer IMAGE_TEXT's image field to Plan 2.8 or handle via a dedicated custom component that's imported here:

```typescript
// In a new file: components/admin/page-builder/forms/custom/ImageTextMediaField.tsx
"use client"
import { useBuilderStore } from "../../store"
import { ImageControl } from "../../RightSidebar/controls/ImageControl"

export function ImageTextMediaField() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)
  const block = blocks.find((b) => b.id === selectedBlockId)
  if (!block) return null
  return (
    <ImageControl
      label="Imagen"
      value={block.content.media?.image}
      onChange={(v) =>
        updateBlockContent(block.id, {
          ...block.content,
          media: { ...block.content.media, image: v },
        })
      }
    />
  )
}
```

Add this file, then reference in the schema:

```typescript
import { ImageTextMediaField } from "@/components/admin/page-builder/forms/custom/ImageTextMediaField"
// ...
      {
        type: "custom",
        key: "__imageMedia",
        label: "Imagen",
        component: ImageTextMediaField,
      },
```

This validates the `custom` escape hatch works.

- [ ] **Step 3: RELATED_PRODUCTS schema**

```typescript
    contentSchema: [
      { type: "text", key: "title", label: "Título", placeholder: "También te puede gustar" },
      {
        type: "select",
        key: "mode",
        label: "Modo",
        options: [
          { value: "auto", label: "Automático" },
          { value: "manual", label: "Manual" },
        ],
      },
      {
        type: "group",
        key: "autoFilters",
        label: "Filtros automáticos",
        showWhen: { field: "mode", equals: "auto" },
        schema: [
          {
            type: "select",
            key: "source",
            label: "Fuente",
            options: [
              { value: "same-category", label: "Misma categoría" },
              { value: "same-tags", label: "Comparten categorías" },
              { value: "best-sellers", label: "Más vendidos (90 días)" },
              { value: "recently-added", label: "Más recientes" },
            ],
          },
          { type: "number", key: "limit", label: "Cantidad", min: 1, max: 12 },
          { type: "switch", key: "excludeCurrentProduct", label: "Excluir el producto actual" },
        ],
      },
      {
        type: "product-picker",
        key: "manualProductIds",
        label: "Productos",
        multiple: true,
        showWhen: { field: "mode", equals: "manual" },
      },
      {
        type: "select",
        key: "columnsDesktop",
        label: "Columnas desktop",
        options: [{ value: 3, label: "3" }, { value: 4, label: "4" }, { value: 5, label: "5" }],
      },
      {
        type: "select",
        key: "columnsMobile",
        label: "Columnas mobile",
        options: [{ value: 1, label: "1" }, { value: 2, label: "2" }],
      },
      { type: "switch", key: "showPrice", label: "Mostrar precio" },
    ],
```

- [ ] **Step 4: Delete the 3 form files**

```bash
rm components/admin/page-builder/forms/adapters/FaqContentForm.tsx
rm components/admin/page-builder/forms/adapters/ImageTextContentForm.tsx
rm components/admin/page-builder/forms/adapters/RelatedProductsContentForm.tsx
```

- [ ] **Step 5: Remove their imports + delete the StubContentForm placeholder**

Remove `import { FaqContentForm } ...`, `import { ImageTextContentForm } ...`, `import { RelatedProductsContentForm } ...` from `register-existing-blocks.tsx`.

Also remove `components/admin/page-builder/forms/StubContentForm.tsx` — no block uses it anymore:

```bash
rm components/admin/page-builder/forms/StubContentForm.tsx
```

- [ ] **Step 6: TypeScript check + commit**

```bash
npx tsc --noEmit
git add lib/blocks/register-existing-blocks.tsx components/admin/page-builder/forms/
git commit -m "feat(schema): migrate FAQ, IMAGE_TEXT, RELATED_PRODUCTS to contentSchema (all blocks migrated)"
```

---

## Task 12: Remove `contentForm` field from `BlockDefinition`

**Files:**
- Modify: `lib/blocks/registry.ts`

- [ ] **Step 1: Update the interface**

Open `lib/blocks/registry.ts`. Remove the `contentForm: ComponentType<...>` field from `BlockDefinition`. All blocks now use `contentSchema`.

Optionally remove the fallback branch in ContentTab (`if (def.contentForm)`) since it's no longer reachable.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/blocks/registry.ts components/admin/page-builder/RightSidebar/tabs/ContentTab.tsx
git commit -m "refactor(schema): remove legacy contentForm field from BlockDefinition"
```

---

## Task 13: Final smoke test

- [ ] **Step 1: Build**

```bash
npx tsc --noEmit
npm run build
```

Both pass.

- [ ] **Step 2: Per-block verification**

For each of the 11 registered blocks, add one to a product in the editor. Verify:
- Content tab renders the expected fields
- Values persist after save
- Canvas updates live
- Storefront renders correctly

Pay extra attention to:
- FAQ: adding a question with rich text answer works
- TRUST_BADGES: icon picker selects the right icon
- RELATED_PRODUCTS: manual picker searches + selects; auto mode shows filter fields
- GALLERY: the array-based image list (new shape) still renders correctly on the storefront

- [ ] **Step 3: Regression pass**

Previously-created blocks with the old data shape still render (GalleryBlock's dual-shape reader handles it; other blocks read the same data.* keys).

---

## Merge

```bash
git checkout master
git merge --no-ff feature/page-builder-plan-2-7 -m "Merge Plan 2.7: schema-driven forms for all 11 blocks"
```

---

## What's next

**Plan 2.8** — Build advanced style controls as schema-compatible pieces:
- Typography (text size + weight)
- Padding top/bottom split
- Background gradients

Each integrates into the Style tab (which reads styleSupport) and uses the same schema primitives. Rough estimate: 3-4 days.

Then **Plan 3** — Templates with sync (~3 weeks).
