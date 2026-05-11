// components/admin/cod-forms/PreviewPanel.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import CodFormBlockRenderer, {
  type LocationValue,
  type RendererContext,
} from "@/components/shop/cod-form/CodFormBlockRenderer"
import type { ShippingOption } from "@/components/shop/cod-form/blocks/ShippingOptionsBlock"
import { useCodFormEditor } from "./store"
import { resolveTemplateVariables } from "@/lib/cod-forms/template-variables"

const EMPTY_LOCATION: LocationValue = {
  departmentId: "",
  provinceId: "",
  districtCode: "",
  departmentName: "",
  provinceName: "",
  districtName: "",
}

const MOCK_ITEM = {
  productName: "Producto de ejemplo",
  variantName: "Variante",
  quantity: 1,
  unitPrice: 99.9,
  thumbnailUrl: null,
}

export default function PreviewPanel({
  shippingOptions,
}: {
  shippingOptions: ShippingOption[]
}) {
  const blocks = useCodFormEditor((s) => s.blocks)
  const buttonText = useCodFormEditor((s) => s.buttonText)
  const buttonStyle = useCodFormEditor((s) => s.buttonStyle)

  const [fieldValues] = useState<Record<string, string>>({})
  const [shipId, setShipId] = useState<string | null>(
    shippingOptions[0]?.id ?? null,
  )

  // Si las tarifas cambian (p. ej. el admin las edita en otra pestaña y vuelve),
  // re-seleccionamos la primera disponible para que `total` siga siendo coherente.
  useEffect(() => {
    if (shippingOptions.length === 0) {
      setShipId(null)
      return
    }
    if (!shipId || !shippingOptions.some((o) => o.id === shipId)) {
      setShipId(shippingOptions[0].id)
    }
  }, [shippingOptions, shipId])

  const subtotal = MOCK_ITEM.unitPrice * MOCK_ITEM.quantity
  const shipping =
    shippingOptions.find((o) => o.id === shipId)?.price ?? 0
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
      shippingOptions,
      selectedShippingId: shipId,
      onShippingSelect: setShipId,
      fieldValues,
      fieldErrors: {},
      onFieldChange: () => {
        // Preview is read-only — ignore field input.
      },
      location: EMPTY_LOCATION,
      onLocationChange: () => {
        // Preview is read-only — ignore location input.
      },
      shippingRestriction: null,
      submitDisabled: true,
    }),
    [
      buttonText,
      buttonStyle,
      fieldValues,
      shipId,
      subtotal,
      shipping,
      total,
      shippingOptions,
    ],
  )

  return (
    <div className="max-w-md mx-auto p-3 sm:p-4 min-h-full">
      <p className="text-[11px] sm:text-xs uppercase font-medium text-slate-500 mb-3 tracking-wide">
        Vista previa en vivo
      </p>
      {shippingOptions.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          No hay tarifas de envío activas. Configúralas en{" "}
          <a href="/admin/envios" target="_blank" rel="noreferrer" className="underline">
            Envíos
          </a>{" "}
          para ver opciones reales aquí.
        </p>
      )}
      <CodFormBlockRenderer blocks={blocks} ctx={ctx} />
    </div>
  )
}
