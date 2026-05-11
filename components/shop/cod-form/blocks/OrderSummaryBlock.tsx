// components/shop/cod-form/blocks/OrderSummaryBlock.tsx
"use client"

import { Banknote } from "lucide-react"
import type { OrderSummaryContent } from "@/lib/cod-forms/types"

export type OrderTotals = {
  subtotal: number
  discount: number
  shipping: number
  total: number
}

export default function OrderSummaryBlock({
  content,
  totals,
}: {
  content: OrderSummaryContent
  totals: OrderTotals
}) {
  return (
    <div className="rounded-xl border-2 border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4 space-y-2">
      {content.showSubtotal && (
        <Row
          label="Subtotal"
          value={`S/ ${totals.subtotal.toFixed(2)}`}
        />
      )}
      {content.showDiscount && totals.discount > 0 && (
        <Row
          label="Descuento"
          value={`-S/ ${totals.discount.toFixed(2)}`}
          valueClass="text-emerald-600 font-semibold"
        />
      )}
      {content.showShipping && (
        <Row
          label="Envío"
          value={
            totals.shipping === 0 ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                Gratis
              </span>
            ) : (
              `S/ ${totals.shipping.toFixed(2)}`
            )
          }
        />
      )}
      {content.showTotal && (
        <div className="mt-2 flex items-center justify-between border-t border-dashed border-gray-300 pt-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Banknote className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-bold text-gray-900">Total a pagar</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                Pagas al recibir tu pedido
              </p>
            </div>
          </div>
          <span className="text-xl font-extrabold text-primary tabular-nums">
            S/ {totals.total.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string
  value: React.ReactNode
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`tabular-nums ${valueClass ?? "text-gray-900 font-medium"}`}>
        {value}
      </span>
    </div>
  )
}
