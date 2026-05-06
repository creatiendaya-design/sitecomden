// components/shop/cod-form/CodFormBlockRenderer.tsx
"use client"

import HeaderBlock from "./blocks/HeaderBlock"
import CartItemsBlock, { type CartItem } from "./blocks/CartItemsBlock"
import ShippingOptionsBlock, {
  type ShippingOption,
} from "./blocks/ShippingOptionsBlock"
import OrderSummaryBlock, { type OrderTotals } from "./blocks/OrderSummaryBlock"
import SubmitButtonBlock from "./blocks/SubmitButtonBlock"
import FieldBlock from "./blocks/FieldBlock"
import type {
  CodFormBlock,
  CodFormBlockType,
  HeaderContent,
  CartItemsContent,
  ShippingOptionsContent,
  OrderSummaryContent,
  FieldContent,
  ButtonStyle,
} from "@/lib/cod-forms/types"

export type RendererContext = {
  buttonText: string
  buttonStyle: ButtonStyle
  cartItems: CartItem[]
  totals: OrderTotals
  shippingOptions: ShippingOption[]
  selectedShippingId: string | null
  onShippingSelect: (id: string) => void
  fieldValues: Record<string, string>
  fieldErrors: Record<string, string | null>
  onFieldChange: (type: CodFormBlockType, value: string) => void
  submitDisabled?: boolean
  onSubmit?: () => void
  onQuantityChange?: (idx: number, q: number) => void
}

const FIELD_TYPES: ReadonlySet<CodFormBlockType> = new Set([
  "FIELD_NAME",
  "FIELD_PHONE",
  "FIELD_EMAIL",
  "FIELD_DNI",
  "FIELD_ADDRESS",
  "FIELD_ADDRESS_2",
  "FIELD_PROVINCE",
  "FIELD_CITY",
  "FIELD_REFERENCE",
  "FIELD_NOTES",
])

export default function CodFormBlockRenderer({
  blocks,
  ctx,
}: {
  blocks: CodFormBlock[]
  ctx: RendererContext
}) {
  return (
    <div className="space-y-3">
      {blocks
        .filter((b) => b.visible)
        .map((b) => {
          if (b.type === "HEADER") {
            return <HeaderBlock key={b.id} content={b.content as unknown as HeaderContent} />
          }
          if (b.type === "CART_ITEMS") {
            return (
              <CartItemsBlock
                key={b.id}
                content={b.content as unknown as CartItemsContent}
                items={ctx.cartItems}
                onQuantityChange={ctx.onQuantityChange}
              />
            )
          }
          if (b.type === "SHIPPING_OPTIONS") {
            return (
              <ShippingOptionsBlock
                key={b.id}
                content={b.content as unknown as ShippingOptionsContent}
                options={ctx.shippingOptions}
                selectedId={ctx.selectedShippingId}
                onSelect={ctx.onShippingSelect}
              />
            )
          }
          if (b.type === "ORDER_SUMMARY") {
            return (
              <OrderSummaryBlock
                key={b.id}
                content={b.content as unknown as OrderSummaryContent}
                totals={ctx.totals}
              />
            )
          }
          if (b.type === "SUBMIT_BUTTON") {
            return (
              <SubmitButtonBlock
                key={b.id}
                text={ctx.buttonText}
                style={ctx.buttonStyle}
                disabled={ctx.submitDisabled}
                onClick={ctx.onSubmit}
              />
            )
          }
          if (FIELD_TYPES.has(b.type)) {
            return (
              <FieldBlock
                key={b.id}
                type={b.type}
                content={b.content as unknown as FieldContent}
                required={b.required}
                value={ctx.fieldValues[b.type] ?? ""}
                errorMessage={ctx.fieldErrors[b.type] ?? null}
                onChange={(v) => ctx.onFieldChange(b.type, v)}
              />
            )
          }
          return null
        })}
    </div>
  )
}
