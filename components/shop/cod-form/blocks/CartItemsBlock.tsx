// components/shop/cod-form/blocks/CartItemsBlock.tsx
"use client"

import Image from "next/image"
import type { CartItemsContent } from "@/lib/cod-forms/types"
import { Minus, Plus, Package } from "lucide-react"

export type CartItem = {
  productName: string
  variantName: string | null
  quantity: number
  unitPrice: number
  thumbnailUrl: string | null
}

export default function CartItemsBlock({
  content,
  items,
  onQuantityChange,
}: {
  content: CartItemsContent
  items: CartItem[]
  onQuantityChange?: (idx: number, q: number) => void
}) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        Tu pedido
      </p>
      <div className="overflow-hidden rounded-xl border-2 border-gray-100 bg-white">
        {items.map((it, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 ${
              i > 0 ? "border-t border-gray-100" : ""
            }`}
          >
            {content.showThumbnail && it.thumbnailUrl ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-gray-200">
                <Image
                  src={it.thumbnailUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            ) : content.showThumbnail ? (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <Package className="h-5 w-5" />
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {it.productName}
              </p>
              {content.showVariant && it.variantName && (
                <p className="truncate text-xs text-gray-500">{it.variantName}</p>
              )}
              <p className="mt-0.5 text-xs text-gray-500">
                S/ {it.unitPrice.toFixed(2)} c/u
              </p>
            </div>

            {content.showQuantitySelector && onQuantityChange ? (
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={() => onQuantityChange(i, Math.max(1, it.quantity - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-white hover:text-gray-900"
                  aria-label="Disminuir"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">
                  {it.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(i, it.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-white hover:text-gray-900"
                  aria-label="Aumentar"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 tabular-nums">
                ×{it.quantity}
              </span>
            )}

            <span className="ml-1 shrink-0 text-sm font-bold text-gray-900 tabular-nums">
              S/ {(it.unitPrice * it.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
