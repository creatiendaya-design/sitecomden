// components/shop/cod-form/blocks/ShippingOptionsBlock.tsx
"use client"

import { Check, Truck } from "lucide-react"

export type ShippingOption = {
  id: string
  label: string
  price: number // 0 = free
}

export default function ShippingOptionsBlock({
  options,
  selectedId,
  onSelect,
}: {
  options: ShippingOption[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-center text-xs text-muted-foreground">
        No hay opciones de envío disponibles
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        Opciones de envío
      </p>
      <div className="space-y-2">
        {options.map((o) => {
          const selected = selectedId === o.id
          const isFree = o.price === 0
          return (
            <label
              key={o.id}
              className={`group flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 transition-all ${
                selected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="shipping-option"
                checked={selected}
                onChange={() => onSelect(o.id)}
                className="sr-only"
              />
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  selected
                    ? "border-primary bg-primary"
                    : "border-gray-300 bg-white"
                }`}
                aria-hidden
              >
                {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  selected ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
                }`}
                aria-hidden
              >
                <Truck className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-medium text-gray-900">
                {o.label}
              </span>
              {isFree ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Gratis
                </span>
              ) : (
                <span className="text-sm font-bold text-gray-900">
                  S/ {o.price.toFixed(2)}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}
