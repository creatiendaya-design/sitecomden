// lib/cod-forms/types.ts
import type { CodFormBlockType, PostSubmitAction } from "@prisma/client"

export type { CodFormBlockType, PostSubmitAction }

export type ButtonStyle = {
  textColor: string
  fontSize: number
  fontWeight: "normal" | "bold"
  fontStyle: "normal" | "italic"
  bgColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  shadow: number          // 0-10
  animation: "none" | "pulse" | "shake" | "bounce"
  icon: string | null     // lucide-react icon name
  subtitle: string | null
}

export type HeaderContent = {
  text: string
  align: "left" | "center" | "right"
  fontSize: number
  fontWeight: "normal" | "bold"
  fontStyle: "normal" | "italic"
  color: string
}

export type FieldContent = {
  label: string
  placeholder: string
  errorMessage: string
  hideLabel: boolean
}

export type CartItemsContent = {
  showThumbnail: boolean
  showVariant: boolean
  showQuantitySelector: boolean
}

// SHIPPING_OPTIONS no longer has block-level config. Las opciones (incluyendo
// "envío gratis" via `freeShippingMin`) se gestionan en /admin/envios.
export type ShippingOptionsContent = Record<string, never>

export type OrderSummaryContent = {
  showSubtotal: boolean
  showDiscount: boolean
  showShipping: boolean
  showTotal: boolean
}

export type SubmitButtonContent = Record<string, never>

export type BlockContent =
  | { type: "HEADER"; content: HeaderContent }
  | { type: "CART_ITEMS"; content: CartItemsContent }
  | { type: "SHIPPING_OPTIONS"; content: ShippingOptionsContent }
  | { type: "ORDER_SUMMARY"; content: OrderSummaryContent }
  | { type: "SUBMIT_BUTTON"; content: SubmitButtonContent }
  | { type: `FIELD_${string}`; content: FieldContent }

export type CodFormBlock = {
  id: string
  position: number
  type: CodFormBlockType
  content: Record<string, unknown>
  visible: boolean
  required: boolean
}

export type CodFormTemplateData = {
  id: string
  name: string
  isDefault: boolean
  buttonText: string
  buttonStyle: ButtonStyle
  postSubmitAction: PostSubmitAction
  thankYouTitle: string | null
  thankYouMessage: string | null
  whatsappNumber: string | null
  whatsappMessage: string | null
  thankYouPageId: string | null
  thankYouPageSlug: string | null
  blocks: CodFormBlock[]
  /// Per-template shipping profile (Shopify-style). When non-empty, only
  /// these rates appear in the COD modal for products bound to this
  /// template. When empty, the modal falls back to the regular (non-
  /// excluded) rates for the customer's district.
  shippingRateIds: string[]
}

export type ShippingRestriction = {
  enabled: boolean
  allowedDepartmentIds: string[]
  allowedProvinceIds: string[]
  allowedDistrictCodes: string[]
  restrictionMessage: string | null
}

export const FIELD_BLOCK_TYPES: CodFormBlockType[] = [
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
]

export const STRUCTURAL_BLOCK_TYPES: CodFormBlockType[] = [
  "HEADER",
  "CART_ITEMS",
  "SHIPPING_OPTIONS",
  "ORDER_SUMMARY",
  "SUBMIT_BUTTON",
]

export const SINGLETON_BLOCK_TYPES: CodFormBlockType[] = [
  "CART_ITEMS",
  "SHIPPING_OPTIONS",
  "ORDER_SUMMARY",
  "SUBMIT_BUTTON",
]
