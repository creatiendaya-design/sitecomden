// components/shop/cod-form/blocks/CartItemsBlock.tsx
"use client"

import Image from "next/image"
import type { CartItemsContent } from "@/lib/cod-forms/types"
import { Minus, Plus } from "lucide-react"

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
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 border rounded p-2">
          {content.showThumbnail && it.thumbnailUrl && (
            <div className="relative w-12 h-12 shrink-0">
              <Image src={it.thumbnailUrl} alt="" fill className="object-cover rounded" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{it.productName}</p>
            {content.showVariant && it.variantName && (
              <p className="text-xs text-muted-foreground truncate">{it.variantName}</p>
            )}
          </div>
          {content.showQuantitySelector && onQuantityChange ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onQuantityChange(i, Math.max(1, it.quantity - 1))}
                className="p-1 border rounded"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-sm">{it.quantity}</span>
              <button
                type="button"
                onClick={() => onQuantityChange(i, it.quantity + 1)}
                className="p-1 border rounded"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="text-sm">x{it.quantity}</span>
          )}
          <span className="text-sm font-medium ml-2">
            S/ {(it.unitPrice * it.quantity).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}
