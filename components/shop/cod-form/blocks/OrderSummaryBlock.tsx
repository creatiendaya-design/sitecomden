// components/shop/cod-form/blocks/OrderSummaryBlock.tsx
"use client"

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
    <div className="border rounded p-3 space-y-1 text-sm bg-muted/20">
      {content.showSubtotal && (
        <Row label="Subtotal" value={`S/ ${totals.subtotal.toFixed(2)}`} />
      )}
      {content.showDiscount && totals.discount > 0 && (
        <Row label="Descuento" value={`-S/ ${totals.discount.toFixed(2)}`} valueClass="text-red-600" />
      )}
      {content.showShipping && (
        <Row
          label="Envío"
          value={totals.shipping === 0 ? "Gratis" : `S/ ${totals.shipping.toFixed(2)}`}
        />
      )}
      {content.showTotal && (
        <Row label="Total" value={`S/ ${totals.total.toFixed(2)}`} bold />
      )}
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  valueClass,
}: {
  label: string
  value: string
  bold?: boolean
  valueClass?: string
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold border-t pt-1 mt-1" : ""}`}>
      <span>{label}</span>
      <span className={valueClass ?? ""}>{value}</span>
    </div>
  )
}
