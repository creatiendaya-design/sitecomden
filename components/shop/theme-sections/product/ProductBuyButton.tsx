"use client"

import { Minus, Plus, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { Button } from "@/components/ui/button"
import { useCartStore } from "@/store/cart"
import { useTracking } from "@/hooks/useTracking"
import { SubBlockWrapper } from "../_helpers"
import { useProductContext } from "./ProductContext"

interface ProductBuyButtonProps {
  block: ResolvedThemeSectionBlock
}

interface ProductBuyButtonContent {
  buttonText?: string
  showQuantityPicker?: boolean
  quantityMin?: number
  quantityMax?: number
}

export function ProductBuyButton({ block }: ProductBuyButtonProps) {
  const {
    productId,
    productName,
    hasVariants,
    selectedVariant,
    currentPrice,
    currentComparePrice,
    currentStock,
    inStock,
    quantity,
    setQuantity,
  } = useProductContext()

  const content = block.content as ProductBuyButtonContent
  const label = content.buttonText?.trim() || "Agregar al carrito"
  const showQty = content.showQuantityPicker ?? true
  const qtyMin = Math.max(1, content.quantityMin ?? 1)
  const qtyMax = Math.max(qtyMin, content.quantityMax ?? 99)
  const addItem = useCartStore((s) => s.addItem)
  const { trackEvent } = useTracking()

  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )

  const handleAdd = () => {
    if (hasVariants && !selectedVariant) {
      toast.error("Seleccioná las opciones del producto")
      return
    }
    if (!inStock) {
      toast.error("Producto agotado")
      return
    }
    const safeQty = Math.min(Math.max(quantity, qtyMin), qtyMax)
    if (safeQty > currentStock) {
      toast.error(`Sólo hay ${currentStock} unidades en stock`)
      return
    }

    const cartItemId = selectedVariant ? selectedVariant.id : productId
    const variantName = selectedVariant
      ? Object.values(selectedVariant.options).join(" / ")
      : undefined

    const ok = addItem(
      {
        id: cartItemId,
        productId,
        variantId: selectedVariant?.id,
        name: productName,
        variantName,
        slug: "",
        price: currentPrice,
        originalUnitPrice: currentComparePrice ?? currentPrice,
        maxStock: currentStock,
        options: selectedVariant?.options,
      },
      safeQty,
    )

    if (ok) {
      toast.success(`${productName} agregado al carrito`)
      trackEvent("AddToCart", {
        value: currentPrice * safeQty,
        currency: "PEN",
        content_ids: [productId],
        content_name: productName,
        content_type: "product",
        num_items: safeQty,
      })
    }
  }

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      <div className="flex flex-col gap-3">
        {showQty && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(qtyMin, quantity - 1))}
              disabled={!inStock || quantity <= qtyMin}
              aria-label="Disminuir cantidad"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <input
              type="number"
              inputMode="numeric"
              min={qtyMin}
              max={qtyMax}
              value={quantity}
              onChange={(e) => {
                const next = Number(e.target.value)
                if (!Number.isFinite(next)) return
                setQuantity(Math.min(Math.max(qtyMin, Math.floor(next)), qtyMax))
              }}
              className="w-16 h-10 text-center rounded-md border border-input bg-background"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.min(qtyMax, quantity + 1))}
              disabled={!inStock || quantity >= qtyMax}
              aria-label="Aumentar cantidad"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Button
          type="button"
          size="lg"
          onClick={handleAdd}
          disabled={!inStock}
          className="w-full"
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          <span data-content-field="buttonText">
            {inStock ? label : "Agotado"}
          </span>
        </Button>
      </div>
    </SubBlockWrapper>
  )
}
