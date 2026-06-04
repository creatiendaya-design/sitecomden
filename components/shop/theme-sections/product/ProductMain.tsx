import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import { getProductImageUrl } from "@/lib/image-utils"
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

interface ProductMainContent {
  galleryPosition?: "left" | "right"
  columnRatio?: "50_50" | "60_40" | "40_60"
  infoSticky?: boolean
  fullWidth?: boolean
}

const COLUMN_GRID: Record<NonNullable<ProductMainContent["columnRatio"]>, string> = {
  "50_50": "md:grid-cols-2",
  "60_40": "md:grid-cols-[3fr_2fr]",
  "40_60": "md:grid-cols-[2fr_3fr]",
}

/**
 * Wrapper for the PRODUCT_MAIN theme-section. Server component.
 *
 * Layout: a 2-column grid on desktop, single column on mobile (gallery
 * always first on mobile regardless of admin settings — narrow screens
 * don't have room for the info column above the imagery).
 *
 * Sub-blocks decide where they belong via CSS: the gallery uses the
 * first column, the rest stack inside the second column. When the admin
 * reorders sub-blocks the order respects gallery-first; the rest follow
 * their stored position.
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
  const content = section.content as ProductMainContent
  const galleryPosition = content.galleryPosition === "right" ? "right" : "left"
  const columnGrid = COLUMN_GRID[content.columnRatio ?? "50_50"]
  const infoSticky = content.infoSticky ?? false
  const fullWidth = content.fullWidth ?? false

  const gallery = section.blocks.find((b) => b.type === "PRODUCT_GALLERY")
  const rest = section.blocks.filter((b) => b.type !== "PRODUCT_GALLERY")

  const galleryColumn = gallery ? (
    <div className="product-gallery-column">
      <ProductMainSubBlockDispatcher block={gallery} product={product} />
    </div>
  ) : null

  const infoColumn = (
    <div
      className={`product-info-column flex flex-col gap-4 ${
        infoSticky ? "md:sticky md:top-24 md:self-start" : ""
      }`}
    >
      {rest.map((block) => (
        <ProductMainSubBlockDispatcher
          key={block.id}
          block={block}
          product={product}
        />
      ))}
    </div>
  )

  return (
    <SectionWrapper section={section} as="section">
      <ProductProvider
        productId={product.id}
        productName={product.name}
        productSlug={product.slug}
        basePrice={product.basePrice}
        baseComparePrice={product.compareAtPrice}
        baseStock={product.stock}
        baseImage={getProductImageUrl(product.images)}
        hasVariants={product.hasVariants}
        variants={variants}
        options={options}
      >
        <div
          className={
            fullWidth ? "w-full px-4 py-6" : "container mx-auto px-4 py-6"
          }
        >
          <div className={`grid grid-cols-1 ${columnGrid} gap-6 md:gap-10`}>
            {galleryPosition === "left" ? (
              <>
                {galleryColumn}
                {infoColumn}
              </>
            ) : (
              <>
                {infoColumn}
                {galleryColumn}
              </>
            )}
          </div>
        </div>
      </ProductProvider>
    </SectionWrapper>
  )
}
