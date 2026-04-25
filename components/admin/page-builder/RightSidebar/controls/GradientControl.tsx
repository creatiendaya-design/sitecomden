"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { BackgroundGradient, GradientDirection } from "@/lib/blocks/types"

const DIRECTIONS: { value: GradientDirection; label: string }[] = [
  { value: "to-right", label: "→ Derecha" },
  { value: "to-left", label: "← Izquierda" },
  { value: "to-bottom", label: "↓ Abajo" },
  { value: "to-top", label: "↑ Arriba" },
  { value: "to-bottom-right", label: "↘ Diagonal abajo-derecha" },
  { value: "to-bottom-left", label: "↙ Diagonal abajo-izquierda" },
]

interface Props {
  value: BackgroundGradient | undefined
  onChange: (v: BackgroundGradient | undefined) => void
}

export function GradientControl({ value, onChange }: Props) {
  const enabled = !!value
  const g: BackgroundGradient = value ?? { from: "#3b82f6", to: "#a855f7", direction: "to-right" }

  const setEnabled = (on: boolean) => onChange(on ? g : undefined)
  const update = (patch: Partial<BackgroundGradient>) => onChange({ ...g, ...patch })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={setEnabled} id="gradient-enabled" />
        <Label htmlFor="gradient-enabled" className="text-xs">Usar gradiente de fondo</Label>
      </div>

      {enabled && (
        <div className="space-y-2 pl-6">
          <ColorPair label="Color inicial" value={g.from} onChange={(v) => update({ from: v })} />
          <ColorPair label="Color final" value={g.to} onChange={(v) => update({ to: v })} />
          <div>
            <Label className="text-xs mb-1 block">Dirección</Label>
            <Select value={g.direction} onValueChange={(v) => update({ direction: v as GradientDirection })}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            className="h-10 rounded-md border"
            style={{ backgroundImage: `linear-gradient(${g.direction.replace("-", " ")}, ${g.from}, ${g.to})` }}
          />
        </div>
      )}
    </div>
  )
}

function ColorPair({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded border cursor-pointer p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs h-8 font-mono flex-1"
        />
      </div>
    </div>
  )
}
