import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import { SectionWrapper } from "../_helpers"
import {
  ProductProvider,
  type ProductOption,
  type ProductVariant,
} from "./ProductContext"
import { ProductMainSubBlockDispatcher } from "./ProductMainSubBlockDispatcher"
import type { ProductForRender } from "./types"

interface ProductMainProps {
  section: ResolvedThemeSection
  product: ProductForRender
  variants: ProductVariant[]
  options: ProductOption[]
}

/**
 * Wrapper for the PRODUCT_MAIN theme-section. Server component.
 *
 * Layout: a 2-column grid on desktop (gallery / info), single column on
 * mobile. Sub-blocks decide where they belong via CSS: the gallery uses
 * `grid-column: 1`, the rest stack inside `grid-column: 2`. When the
 * admin reorders sub-blocks the order respects gallery-first if a
 * PRODUCT_GALLERY exists; otherwise everything stacks linearly.
 *
 * The ProductProvider must wrap children so the stateful sub-blocks
 * (Price, VariantPicker, BuyButton) can share `selectedVariant`,
 * `quantity`, etc. The provider is itself a client component — the
 * server wrapper just passes the initial values.
 */
export function ProductMain({
  section,
  product,
  variants,
  options,
}: ProductMainProps) {
  const gallery = section.blocks.find((b) => b.type === "PRODUCT_GALLERY")
  const rest = section.blocks.filter((b) => b.type !== "PRODUCT_GALLERY")

  return (
    <SectionWrapper section={section} as="section">
      <ProductProvider
        productId={product.id}
        productName={product.name}
        basePrice={product.basePrice}
        baseComparePrice={product.compareAtPrice}
        baseStock={product.stock}
        hasVariants={product.hasVariants}
        variants={variants}
        options={options}
      >
        <div className="product-detail-grid">
          {gallery && (
            <div className="product-gallery-column">
              <ProductMainSubBlockDispatcher
                block={gallery}
                product={product}
              />
            </div>
          )}
          <div className="product-info-column">
            {rest.map((block) => (
              <ProductMainSubBlockDispatcher
                key={block.id}
                block={block}
                product={product}
              />
            ))}
          </div>
        </div>
      </ProductProvider>
    </SectionWrapper>
  )
}
