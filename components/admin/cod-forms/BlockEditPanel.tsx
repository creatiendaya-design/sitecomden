"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useCodFormEditor } from "./store"
import { blockTypeLabel } from "./SortableBlockItem"
import { FIELD_BLOCK_TYPES } from "@/lib/cod-forms/types"
import type { CodFormBlock } from "@/lib/cod-forms/types"

export default function BlockEditPanel({
  blockId,
  onClose,
}: {
  blockId: string | null
  onClose: () => void
}) {
  const block = useCodFormEditor(
    (s) => s.blocks.find((b) => b.id === blockId) ?? null,
  ) as CodFormBlock | null
  const patchBlock = useCodFormEditor((s) => s.patchBlock)

  const open = block !== null

  if (!block) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent />
      </Sheet>
    )
  }

  const isField = FIELD_BLOCK_TYPES.includes(block.type)
  const c = block.content as Record<string, unknown>

  const setContent = (patch: Record<string, unknown>) =>
    patchBlock(block.id, { content: { ...block.content, ...patch } })

  const str = (v: unknown): string => (typeof v === "string" ? v : "")
  const num = (v: unknown, fallback: number): number =>
    typeof v === "number" ? v : fallback
  const bool = (v: unknown): boolean => Boolean(v)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar: {blockTypeLabel(block.type)}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 text-sm">
          {isField && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="bep-required">Marcar como obligatorio</Label>
                <Switch
                  id="bep-required"
                  checked={block.required}
                  onCheckedChange={(v) => patchBlock(block.id, { required: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="bep-hide">Ocultar etiqueta</Label>
                <Switch
                  id="bep-hide"
                  checked={bool(c.hideLabel)}
                  onCheckedChange={(v) => setContent({ hideLabel: v })}
                />
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input
                  value={str(c.label)}
                  onChange={(e) => setContent({ label: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Marcador de posición</Label>
                <Input
                  value={str(c.placeholder)}
                  onChange={(e) => setContent({ placeholder: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Mensaje de error</Label>
                <Input
                  value={str(c.errorMessage)}
                  onChange={(e) => setContent({ errorMessage: e.target.value })}
                />
              </div>
            </>
          )}

          {block.type === "HEADER" && (
            <>
              <div>
                <Label className="text-xs">Texto</Label>
                <Textarea
                  value={str(c.text)}
                  onChange={(e) => setContent({ text: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-xs">Alineación</Label>
                <select
                  className="w-full border rounded h-9 px-2"
                  value={str(c.align) || "left"}
                  onChange={(e) => setContent({ align: e.target.value })}
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tamaño (px)</Label>
                  <Input
                    type="number"
                    value={num(c.fontSize, 18)}
                    min={8}
                    max={72}
                    onChange={(e) =>
                      setContent({ fontSize: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <Input
                    type="color"
                    value={str(c.color) || "#000000"}
                    onChange={(e) => setContent({ color: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Negrita</Label>
                <Switch
                  checked={c.fontWeight === "bold"}
                  onCheckedChange={(v) =>
                    setContent({ fontWeight: v ? "bold" : "normal" })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Cursiva</Label>
                <Switch
                  checked={c.fontStyle === "italic"}
                  onCheckedChange={(v) =>
                    setContent({ fontStyle: v ? "italic" : "normal" })
                  }
                />
              </div>
            </>
          )}

          {block.type === "CART_ITEMS" && (
            <>
              <ToggleRow
                label="Mostrar miniatura"
                value={bool(c.showThumbnail)}
                onChange={(v) => setContent({ showThumbnail: v })}
              />
              <ToggleRow
                label="Mostrar variante"
                value={bool(c.showVariant)}
                onChange={(v) => setContent({ showVariant: v })}
              />
              <ToggleRow
                label="Selector de cantidad"
                value={bool(c.showQuantitySelector)}
                onChange={(v) => setContent({ showQuantitySelector: v })}
              />
            </>
          )}

          {block.type === "SHIPPING_OPTIONS" && (
            <ToggleRow
              label="Mostrar 'Envío gratis'"
              value={bool(c.showFreeShipping)}
              onChange={(v) => setContent({ showFreeShipping: v })}
            />
          )}

          {block.type === "ORDER_SUMMARY" && (
            <>
              <ToggleRow
                label="Mostrar Subtotal"
                value={bool(c.showSubtotal)}
                onChange={(v) => setContent({ showSubtotal: v })}
              />
              <ToggleRow
                label="Mostrar Descuento"
                value={bool(c.showDiscount)}
                onChange={(v) => setContent({ showDiscount: v })}
              />
              <ToggleRow
                label="Mostrar Envío"
                value={bool(c.showShipping)}
                onChange={(v) => setContent({ showShipping: v })}
              />
              <ToggleRow
                label="Mostrar Total"
                value={bool(c.showTotal)}
                onChange={(v) => setContent({ showTotal: v })}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}
