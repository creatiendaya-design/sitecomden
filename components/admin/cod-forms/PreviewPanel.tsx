// components/admin/cod-forms/PreviewPanel.tsx
"use client"

import { useMemo, useState } from "react"
import CodFormBlockRenderer, {
  type RendererContext,
} from "@/components/shop/cod-form/CodFormBlockRenderer"
import { useCodFormEditor } from "./store"
import { resolveTemplateVariables } from "@/lib/cod-forms/template-variables"

const MOCK_ITEM = {
  productName: "Producto de ejemplo",
  variantName: "Variante",
  quantity: 1,
  unitPrice: 99.9,
  thumbnailUrl: null,
}

const MOCK_SHIPPING = [
  { id: "free", label: "Envío gratis", price: 0 },
  { id: "lima", label: "Envío estándar Lima", price: 10 },
]

export default function PreviewPanel() {
  const blocks = useCodFormEditor((s) => s.blocks)
  const buttonText = useCodFormEditor((s) => s.buttonText)
  const buttonStyle = useCodFormEditor((s) => s.buttonStyle)

  const [fieldValues] = useState<Record<string, string>>({})
  const [shipId, setShipId] = useState("free")

  const subtotal = MOCK_ITEM.unitPrice * MOCK_ITEM.quantity
  const shipping = MOCK_SHIPPING.find((s) => s.id === shipId)?.price ?? 0
  const total = subtotal + shipping

  const ctx: RendererContext = useMemo(
    () => ({
      buttonText: resolveTemplateVariables(buttonText, {
        total: `S/ ${total.toFixed(2)}`,
        producto: MOCK_ITEM.productName,
      }),
      buttonStyle,
      cartItems: [MOCK_ITEM],
      totals: { subtotal, discount: 0, shipping, total },
      shippingOptions: MOCK_SHIPPING,
      selectedShippingId: shipId,
      onShippingSelect: setShipId,
      fieldValues,
      fieldErrors: {},
      onFieldChange: () => {
        // Preview is read-only — ignore field input.
      },
      submitDisabled: true,
    }),
    [buttonText, buttonStyle, fieldValues, shipId, subtotal, shipping, total],
  )

  return (
    <div className="max-w-md mx-auto bg-white border rounded-lg p-4">
      <p className="text-xs uppercase font-medium text-muted-foreground mb-3">
        Vista previa en vivo
      </p>
      <CodFormBlockRenderer blocks={blocks} ctx={ctx} />
    </div>
  )
}
