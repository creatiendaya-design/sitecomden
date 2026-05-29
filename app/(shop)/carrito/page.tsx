import LandingBlockRenderer from "@/components/shop/templates/blocks/LandingBlockRenderer"
import CartView from "@/components/shop/cart/CartView"
import { getActiveThemeCart } from "@/lib/themes/get-active-theme-cart"
import type { LandingBlock } from "@/lib/types/landing-blocks"

/**
 * Cart route. The theme's cart page (Theme.cartPageId) drives layout via
 * a single CART_MAIN block that owns the cart UI itself, plus any number
 * of decorative blocks ordered by `position`:
 *
 *   - Blocks with `position < CART_MAIN.position` → render ABOVE the cart UI.
 *   - The CART_MAIN block → renders the cart UI itself
 *     (with the admin's customized labels/colors).
 *   - Blocks with `position > CART_MAIN.position` → render BELOW the cart UI.
 *
 * Admins reorder blocks in the customizer to move decoration above/below
 * the pivot. Without a CART_MAIN block (legacy cart pages pre-Plan-17.2),
 * the route renders every block above and falls back to the un-customized
 * stand-alone CartView — zero regression with the previous behavior.
 */
export default async function CartPage() {
  const themeCart = await getActiveThemeCart()

  const blocks: LandingBlock[] = themeCart
    ? themeCart.blocks
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((b) => ({
          id: b.id,
          productId: "",
          type: b.type as LandingBlock["type"],
          position: b.position,
          content: b.content as LandingBlock["content"],
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
    : []

  const cartMainIndex = blocks.findIndex((b) => b.type === "CART_MAIN")
  const hasCartMain = cartMainIndex >= 0

  const above = hasCartMain ? blocks.slice(0, cartMainIndex) : blocks
  const below = hasCartMain ? blocks.slice(cartMainIndex + 1) : []
  const cartMainBlock = hasCartMain ? blocks[cartMainIndex] : null

  return (
    <>
      {above.length > 0 && (
        <div className="flex flex-col">
          <LandingBlockRenderer blocks={above} />
        </div>
      )}
      {cartMainBlock ? (
        <LandingBlockRenderer blocks={[cartMainBlock]} />
      ) : (
        <CartView />
      )}
      {below.length > 0 && (
        <div className="flex flex-col">
          <LandingBlockRenderer blocks={below} />
        </div>
      )}
    </>
  )
}
