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
import CodLocationSelector from "./CodLocationSelector"
import type {
  CodFormBlock,
  CodFormBlockType,
  HeaderContent,
  CartItemsContent,
  OrderSummaryContent,
  FieldContent,
  ButtonStyle,
  ShippingRestriction,
} from "@/lib/cod-forms/types"

export type LocationValue = {
  departmentId: string
  provinceId: string
  districtCode: string
  departmentName: string
  provinceName: string
  districtName: string
}

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
  onFieldBlur?: (type: CodFormBlockType) => void
  location: LocationValue
  onLocationChange: (next: LocationValue) => void
  shippingRestriction?: ShippingRestriction | null
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
  "FIELD_REFERENCE",
  "FIELD_NOTES",
])

const LOCATION_TYPES: ReadonlySet<CodFormBlockType> = new Set([
  "FIELD_PROVINCE",
  "FIELD_CITY",
])

export default function CodFormBlockRenderer({
  blocks,
  ctx,
}: {
  blocks: CodFormBlock[]
  ctx: RendererContext
}) {
  // FIELD_PROVINCE and FIELD_CITY both collapse to a single LocationSelector
  // combo (departamento → provincia → distrito). Render it once at the
  // first occurrence and skip subsequent ones.
  let locationRendered = false

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
          if (LOCATION_TYPES.has(b.type)) {
            if (locationRendered) return null
            // eslint-disable-next-line react-hooks/immutability -- deduplication flag: rendered once per .map() call, not persisted across renders
            locationRendered = true
            const restriction = ctx.shippingRestriction
            return (
              <CodLocationSelector
                key={b.id}
                value={{
                  departmentId: ctx.location.departmentId,
                  provinceId: ctx.location.provinceId,
                  districtCode: ctx.location.districtCode,
                }}
                onChange={ctx.onLocationChange}
                allowedDepartmentIds={restriction?.enabled ? restriction.allowedDepartmentIds : undefined}
                allowedProvinceIds={restriction?.enabled ? restriction.allowedProvinceIds : undefined}
                allowedDistrictCodes={restriction?.enabled ? restriction.allowedDistrictCodes : undefined}
                restrictionMessage={restriction?.enabled ? restriction.restrictionMessage ?? undefined : undefined}
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
                onBlur={() => ctx.onFieldBlur?.(b.type)}
              />
            )
          }
          return null
        })}
    </div>
  )
}
