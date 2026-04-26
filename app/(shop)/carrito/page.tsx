import LandingBlockRenderer from "@/components/shop/templates/blocks/LandingBlockRenderer"
import CartView from "@/components/shop/cart/CartView"
import { getActiveThemeCart } from "@/lib/themes/get-active-theme-cart"
import type { LandingBlock } from "@/lib/types/landing-blocks"

/**
 * Cart route. Plan 10 wraps the existing CartView (Zustand-backed client UI)
 * in a server component that renders any blocks the active theme has assigned
 * via Theme.cartPageId. With no theme cart page, the route renders just the
 * CartView — zero regression vs. the previous behavior.
 */
export default async function CartPage() {
  const themeCart = await getActiveThemeCart()

  const blocks: LandingBlock[] = themeCart
    ? themeCart.blocks.map((b) => ({
        id: b.id,
        productId: "",
        type: b.type as LandingBlock["type"],
        position: b.position,
        content: b.content as LandingBlock["content"],
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    : []

  return (
    <>
      {blocks.length > 0 && (
        <div className="flex flex-col">
          <LandingBlockRenderer blocks={blocks} />
        </div>
      )}
      <CartView />
    </>
  )
}
