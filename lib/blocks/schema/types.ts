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
  | RangeFieldDef
  | ArrayFieldDef
  | IconFieldDef
  | ProductPickerFieldDef
  | GroupFieldDef
  | CustomFieldDef
  | MenuItemListFieldDef
  | MenuPickerFieldDef
  | MultiSelectFieldDef

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
  /** Move this field from the Contenido tab into a "Colores del bloque"
   *  section at the top of the Estilo tab. The value is still stored at
   *  `content.data.<key>` — renderers don't change. Use for block-specific
   *  semantic colors (e.g. accent, overlay) so admins don't have to hunt
   *  for them across two tabs. Top-level fields only — ignored inside
   *  group/array. */
  showInStyleTab?: boolean
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
  /** If true, value stored as DeviceValue<string|number> — desktop/mobile
   *  split with the same UX as ColorField. Opt-in per field. */
  deviceOverride?: boolean
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

/**
 * Shopify-style range slider. Renders an `<input type="range">` with the
 * current value shown beside the label (e.g. "96 px"). Used for any numeric
 * value the admin nudges visually instead of typing — image widths, padding
 * amounts, opacity, etc.
 *
 * `min`, `max`, and `step` are required (unlike `number` where they're
 * optional) because a slider with no bounds is unusable.
 */
export interface RangeFieldDef extends BaseFieldDef {
  type: "range"
  min: number
  max: number
  step: number
  /** Suffix shown next to the current value (e.g. "px", "%", "rem"). */
  unit?: string
  /** Default value when the stored value is missing/invalid. */
  defaultValue?: number
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
   *  this field's value, plus the field's `label` and `helpText` from the
   *  schema so it can render its own header/footer. Use only when no
   *  primitive fits. Existing components are free to ignore label/helpText. */
  component: ComponentType<{
    value: unknown
    onChange: (v: unknown) => void
    label?: string
    helpText?: string
  }>
}

/**
 * Editable list of inline menu links — each item is { label, href, openInNewTab }.
 * Used when a section needs its own link list independent of the global Menu model
 * (e.g. a footer column with curated quick links). Supports reorder + add/remove.
 */
export interface MenuItemListFieldDef extends BaseFieldDef {
  type: "menu-item-list"
  /** Max number of links allowed. Default 20. */
  maxLinks?: number
}

/**
 * Dropdown that lists `Menu` rows by id. Stores the selected menu id (or null).
 * Used by sections that render an existing menu (e.g. header / footer link group).
 */
export interface MenuPickerFieldDef extends BaseFieldDef {
  type: "menu-picker"
  /** Placeholder for the empty/none option. Default "Sin asignar". */
  emptyLabel?: string
}

/**
 * Checkbox list of allowed values. Stores a string[] of selected option values.
 * Used e.g. by the FOOTER section's PAYMENT_ICONS sub-block to pick which
 * payment methods to display.
 */
export interface MultiSelectFieldDef extends BaseFieldDef {
  type: "multi-select"
  options: Array<{ value: string; label: string }>
}
