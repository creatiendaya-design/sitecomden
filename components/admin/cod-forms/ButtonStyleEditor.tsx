// components/admin/cod-forms/ButtonStyleEditor.tsx
"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useCodFormEditor } from "./store"
import type { ButtonStyle } from "@/lib/cod-forms/types"

export default function ButtonStyleEditor() {
  const [open, setOpen] = useState(true)
  const buttonText = useCodFormEditor((s) => s.buttonText)
  const style = useCodFormEditor((s) => s.buttonStyle)
  const setText = useCodFormEditor((s) => s.setButtonText)
  const patch = useCodFormEditor((s) => s.setButtonStyle)

  return (
    <section className="border rounded-lg bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-3 font-medium text-sm"
      >
        <span>Botón de compra</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="p-3 border-t space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Texto del botón</Label>
              <Input value={buttonText} onChange={(e) => setText(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-0.5">
                Soporta variables como {"{total}"}.
              </p>
            </div>
            <div>
              <Label className="text-xs">Subtítulo</Label>
              <Input
                value={style.subtitle ?? ""}
                onChange={(e) => patch({ subtitle: e.target.value || null })}
                placeholder="Subtítulo opcional"
              />
            </div>
            <div>
              <Label className="text-xs">Tamaño (px)</Label>
              <Input
                type="number"
                value={style.fontSize ?? 16}
                onChange={(e) => patch({ fontSize: Number(e.target.value) })}
                min={8}
                max={72}
              />
            </div>
            <div>
              <Label className="text-xs">Color del texto</Label>
              <Input
                type="color"
                value={style.textColor ?? "#ffffff"}
                onChange={(e) => patch({ textColor: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Color de fondo</Label>
              <Input
                type="color"
                value={style.bgColor ?? "#000000"}
                onChange={(e) => patch({ bgColor: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Color del borde</Label>
              <Input
                type="color"
                value={style.borderColor ?? "#000000"}
                onChange={(e) => patch({ borderColor: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Ancho del borde (px)</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={style.borderWidth ?? 0}
                onChange={(e) => patch({ borderWidth: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Esquinas redondeadas (px)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={style.borderRadius ?? 8}
                onChange={(e) => patch({ borderRadius: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Sombra (0-10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={style.shadow ?? 0}
                onChange={(e) => patch({ shadow: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Animación</Label>
              <select
                className="w-full border rounded h-9 px-2"
                value={style.animation ?? "none"}
                onChange={(e) =>
                  patch({ animation: e.target.value as ButtonStyle["animation"] })
                }
              >
                <option value="none">Ninguna</option>
                <option value="pulse">Pulsar</option>
                <option value="shake">Sacudir</option>
                <option value="bounce">Rebotar</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Ícono (lucide)</Label>
              <Input
                value={style.icon ?? ""}
                onChange={(e) => patch({ icon: e.target.value || null })}
                placeholder="ShoppingBag, ShoppingCart, ..."
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant={style.fontWeight === "bold" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                patch({ fontWeight: style.fontWeight === "bold" ? "normal" : "bold" })
              }
            >
              <strong>B</strong>
            </Button>
            <Button
              variant={style.fontStyle === "italic" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                patch({ fontStyle: style.fontStyle === "italic" ? "normal" : "italic" })
              }
            >
              <em>I</em>
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
