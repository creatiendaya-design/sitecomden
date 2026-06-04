"use client"

import type { FormField, FormSchema } from "@/lib/blocks/schema/types"
import { TextField } from "@/lib/blocks/schema/primitives/TextField"
import { SwitchField } from "@/lib/blocks/schema/primitives/SwitchField"
import { NumberField } from "@/lib/blocks/schema/primitives/NumberField"
import { RangeField } from "@/lib/blocks/schema/primitives/RangeField"
import { ColorField } from "@/lib/blocks/schema/primitives/ColorField"
import { ImageField } from "@/lib/blocks/schema/primitives/ImageField"
import { SelectField } from "@/lib/blocks/schema/primitives/SelectField"
import { RichTextField } from "@/lib/blocks/schema/primitives/RichTextField"
import { IconField } from "@/lib/blocks/schema/primitives/IconField"
import { GroupField } from "@/lib/blocks/schema/primitives/GroupField"
import { ArrayField } from "@/lib/blocks/schema/primitives/ArrayField"
import { ProductPickerField } from "@/lib/blocks/schema/primitives/ProductPickerField"
import { CategoryPickerField } from "@/lib/blocks/schema/primitives/CategoryPickerField"
import { MenuItemListField } from "@/lib/blocks/schema/primitives/MenuItemListField"
import { MenuPickerField } from "@/lib/blocks/schema/primitives/MenuPickerField"
import { MultiSelectField } from "@/lib/blocks/schema/primitives/MultiSelectField"

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
    case "range":
      return <RangeField field={field} value={fieldValue} onChange={onChangeField} />
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
    case "product-picker":
      return <ProductPickerField field={field} value={fieldValue} onChange={onChangeField} />
    case "category-picker":
      return <CategoryPickerField field={field} value={fieldValue} onChange={onChangeField} />
    case "menu-item-list":
      return <MenuItemListField field={field} value={fieldValue} onChange={onChangeField} />
    case "menu-picker":
      return <MenuPickerField field={field} value={fieldValue} onChange={onChangeField} />
    case "multi-select":
      return <MultiSelectField field={field} value={fieldValue} onChange={onChangeField} />
    case "custom": {
      const Comp = field.component
      return (
        <Comp
          value={fieldValue}
          onChange={onChangeField}
          label={field.label}
          helpText={field.helpText}
        />
      )
    }
    default: {
      const _exhaustive: never = field
      void _exhaustive
      return null
    }
  }
}
