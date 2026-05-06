// components/shop/cod-form/blocks/ShippingOptionsBlock.tsx
"use client"

import type { ShippingOptionsContent } from "@/lib/cod-forms/types"

export type ShippingOption = {
  id: string
  label: string
  price: number  // 0 = free
}

export default function ShippingOptionsBlock({
  content,
  options,
  selectedId,
  onSelect,
}: {
  content: ShippingOptionsContent
  options: ShippingOption[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const filtered = content.showFreeShipping
    ? options
    : options.filter((o) => o.price > 0)

  if (filtered.length === 0) {
    return <p className="text-xs text-muted-foreground">No hay opciones de envío disponibles</p>
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Opciones de envío</p>
      {filtered.map((o) => (
        <label
          key={o.id}
          className="flex items-center justify-between border rounded p-2 cursor-pointer hover:bg-muted/30"
        >
          <span className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="shipping-option"
              checked={selectedId === o.id}
              onChange={() => onSelect(o.id)}
            />
            {o.label}
          </span>
          <span className="text-sm font-medium">
            {o.price === 0 ? "Gratis" : `S/ ${o.price.toFixed(2)}`}
          </span>
        </label>
      ))}
    </div>
  )
}
