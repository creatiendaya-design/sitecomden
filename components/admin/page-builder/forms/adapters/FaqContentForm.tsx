"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { BlockContentV2 } from "@/lib/blocks/types"

const RichTextEditor = dynamic(
  () => import("@/components/admin/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-20 animate-pulse bg-muted rounded" /> }
)

interface FaqItem {
  id: string
  question: string
  answer: string
}

interface Data {
  title?: string
  items: FaqItem[]
  allowMultipleOpen?: boolean
  defaultOpenFirst?: boolean
}

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function FaqContentForm({ content, onChange }: Props) {
  const data = content.data as unknown as Data
  const patch = (delta: Partial<Data>) => {
    onChange({ ...content, data: { ...data, ...delta } as unknown as Record<string, unknown> })
  }

  const updateItem = (id: string, delta: Partial<FaqItem>) => {
    patch({ items: data.items.map((i) => (i.id === id ? { ...i, ...delta } : i)) })
  }

  const addItem = () => {
    patch({
      items: [
        ...(data.items ?? []),
        { id: crypto.randomUUID(), question: "Nueva pregunta", answer: "<p>Respuesta</p>" },
      ],
    })
  }

  const removeItem = (id: string) => {
    patch({ items: data.items.filter((i) => i.id !== id) })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Título (opcional)</Label>
        <Input
          value={data.title ?? ""}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Preguntas frecuentes"
          className="mt-1 text-sm"
        />
      </div>

      <div className="flex items-center gap-2 py-2">
        <Switch
          checked={Boolean(data.allowMultipleOpen)}
          onCheckedChange={(v) => patch({ allowMultipleOpen: v })}
        />
        <Label className="text-xs">Permitir varias preguntas abiertas a la vez</Label>
      </div>

      <div className="flex items-center gap-2 py-2">
        <Switch
          checked={Boolean(data.defaultOpenFirst)}
          onCheckedChange={(v) => patch({ defaultOpenFirst: v })}
        />
        <Label className="text-xs">Abrir la primera pregunta por defecto</Label>
      </div>

      <div className="pt-2 border-t">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Preguntas ({data.items?.length ?? 0})</Label>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" />Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {data.items?.map((item) => (
            <FaqItemEditor
              key={item.id}
              item={item}
              onUpdate={(delta) => updateItem(item.id, delta)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function FaqItemEditor({
  item,
  onUpdate,
  onRemove,
}: {
  item: FaqItem
  onUpdate: (delta: Partial<FaqItem>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-md p-2 space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={item.question}
          onChange={(e) => onUpdate({ question: e.target.value })}
          placeholder="¿Pregunta...?"
          className="h-7 text-sm flex-1"
        />
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen((p) => !p)}>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {open && (
        <div className="pt-2 border-t">
          <Label className="text-[10px]">Respuesta</Label>
          <RichTextEditor content={item.answer} onChange={(html: string) => onUpdate({ answer: html })} />
        </div>
      )}
    </div>
  )
}
