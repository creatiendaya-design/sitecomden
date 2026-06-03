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
  // ensureId on every item, including ones loaded from stored content. Items
  // saved before the schema-driven editor existed may lack `id`/`_id` — without
  // unique ids the SortableContext collapses them all to the same key and drag
  // reordering swaps the wrong items.
  const items: Record<string, unknown>[] = Array.isArray(value)
    ? (value as Record<string, unknown>[]).map(ensureId)
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
          Sin elementos. Click &quot;{field.addButtonText ?? "Agregar"}&quot; para comenzar.
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
