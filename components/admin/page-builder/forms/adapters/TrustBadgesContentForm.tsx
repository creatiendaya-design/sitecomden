"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BlockContentV2 } from "@/lib/blocks/types"

interface Badge {
  id: string
  icon: string
  title: string
  subtitle?: string
}

interface Data {
  badges: Badge[]
  layout: "horizontal" | "vertical"
  columns: 2 | 3 | 4 | 5
  iconSize: "sm" | "md" | "lg"
  iconStyle: "outline" | "solid"
}

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

const CURATED_ICONS = [
  "Shield", "ShieldCheck", "Lock", "Truck", "Package", "RefreshCw",
  "Award", "Star", "Heart", "Gift", "Clock", "BadgeCheck",
  "CreditCard", "Headphones", "Phone", "Globe",
]

export function TrustBadgesContentForm({ content, onChange }: Props) {
  const data = content.data as unknown as Data
  const patch = (delta: Partial<Data>) => {
    onChange({ ...content, data: { ...data, ...delta } as unknown as Record<string, unknown> })
  }

  const updateBadge = (id: string, delta: Partial<Badge>) => {
    patch({ badges: data.badges.map((b) => (b.id === id ? { ...b, ...delta } : b)) })
  }

  const addBadge = () => {
    patch({
      badges: [
        ...data.badges,
        { id: crypto.randomUUID(), icon: "Shield", title: "Nuevo badge", subtitle: "" },
      ],
    })
  }

  const removeBadge = (id: string) => {
    patch({ badges: data.badges.filter((b) => b.id !== id) })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Layout</Label>
        <Select value={data.layout ?? "horizontal"} onValueChange={(v) => patch({ layout: v as Data["layout"] })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="horizontal">Horizontal (grid)</SelectItem>
            <SelectItem value="vertical">Vertical (lista)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.layout === "horizontal" && (
        <div>
          <Label className="text-xs">Columnas (horizontal)</Label>
          <Select value={String(data.columns ?? 4)} onValueChange={(v) => patch({ columns: Number(v) as Data["columns"] })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs">Tamaño de íconos</Label>
        <Select value={data.iconSize ?? "md"} onValueChange={(v) => patch({ iconSize: v as Data["iconSize"] })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Pequeño</SelectItem>
            <SelectItem value="md">Mediano</SelectItem>
            <SelectItem value="lg">Grande</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2 border-t">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Badges ({data.badges?.length ?? 0})</Label>
          <Button type="button" size="sm" variant="outline" onClick={addBadge}>
            <Plus className="h-3 w-3 mr-1" />Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {data.badges?.map((badge) => (
            <BadgeEditor
              key={badge.id}
              badge={badge}
              onUpdate={(delta) => updateBadge(badge.id, delta)}
              onRemove={() => removeBadge(badge.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function BadgeEditor({
  badge,
  onUpdate,
  onRemove,
}: {
  badge: Badge
  onUpdate: (delta: Partial<Badge>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-md p-2 space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={badge.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título"
          className="h-7 text-sm flex-1"
        />
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen((p) => !p)} aria-label="Ajustar">
          ⚙
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove} aria-label="Eliminar">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {open && (
        <div className="space-y-2 pt-2 border-t">
          <div>
            <Label className="text-[10px]">Ícono (lucide)</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {CURATED_ICONS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onUpdate({ icon: name })}
                  className={`p-1.5 rounded text-xs ${badge.icon === name ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  title={name}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Subtítulo</Label>
            <Input
              value={badge.subtitle ?? ""}
              onChange={(e) => onUpdate({ subtitle: e.target.value })}
              placeholder="Subtítulo opcional"
              className="h-7 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
