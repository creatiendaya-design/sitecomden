import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import type { ProductForRender } from "./types"
import { ProductGallery } from "./ProductGallery"
import { ProductTitle } from "./ProductTitle"
import { ProductPrice } from "./ProductPrice"
import { ProductVariantPicker } from "./ProductVariantPicker"
import { ProductBuyButton } from "./ProductBuyButton"
import { ProductDescription } from "./ProductDescription"
import { ProductMeta } from "./ProductMeta"
import { ProductRichText } from "./ProductRichText"

interface ProductMainSubBlockDispatcherProps {
  block: ResolvedThemeSectionBlock
  product: ProductForRender
}

/**
 * Server-side dispatcher for PRODUCT_MAIN sub-blocks. Maps `block.type`
 * to the corresponding renderer and passes the resolved content + the
 * static product props. Stateful sub-blocks (Price, VariantPicker, BuyButton)
 * use their own `useProductContext()` internally, so we don't need to wire
 * anything extra here — they only need the block's `content` for styling
 * settings.
 *
 * Returns `null` for unknown sub-block types so the storefront silently
 * tolerates legacy data after a registry refactor (the customizer's right-
 * sidebar will still show a "Tipo desconocido" warning, which is the right
 * place to surface this).
 */
export function ProductMainSubBlockDispatcher({
  block,
  product,
}: ProductMainSubBlockDispatcherProps) {
  switch (block.type) {
    case "PRODUCT_GALLERY":
      return <ProductGallery block={block} product={product} />
    case "PRODUCT_TITLE":
      return <ProductTitle block={block} product={product} />
    case "PRODUCT_PRICE":
      return <ProductPrice block={block} />
    case "PRODUCT_VARIANT_PICKER":
      return <ProductVariantPicker block={block} />
    case "PRODUCT_BUY_BUTTON":
      return <ProductBuyButton block={block} />
    case "PRODUCT_DESCRIPTION":
      return <ProductDescription block={block} product={product} />
    case "PRODUCT_META":
      return <ProductMeta block={block} product={product} />
    case "PRODUCT_RICH_TEXT":
      return <ProductRichText block={block} />
    default:
      return null
  }
}
