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
  /** Show this field only when another field in the SAME schema scope equals
   *  a specific value. Example: { field: "mode", equals: "auto" }.
   *
   *  Scope note: when this field lives inside a `group`, the lookup resolves
   *  against the group's sub-object — NOT the top-level block data. Cross-group
   *  conditional visibility is not supported. */
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
