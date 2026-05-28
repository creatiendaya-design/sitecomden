import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import type {
  ProductOption,
  ProductVariant,
} from "./ProductContext"
import type { ProductForRender } from "./types"
import { ProductMain } from "./ProductMain"
import { RichTextSection } from "./RichTextSection"
import { ImageWithText } from "./ImageWithText"
import { FeaturedCollection } from "./FeaturedCollection"
import { Testimonials } from "./Testimonials"
import { FaqSection } from "./FaqSection"
import { LegacyBlockSection } from "./LegacyBlockSection"

interface ProductSectionsRendererProps {
  sections: ResolvedThemeSection[]
  product: ProductForRender
  variants: ProductVariant[]
  options: ProductOption[]
}

/**
 * Top-level dispatcher for PRODUCT-group theme sections, used from
 * `app/(shop)/productos/[slug]/page.tsx`. Maps each section by `type` to
 * its renderer. Unknown types are silently skipped so a registry refactor
 * doesn't break the storefront.
 *
 * `PRODUCT_MAIN` receives `product` + `variants` + `options` so its
 * sub-blocks can share state via ProductProvider. Every other section
 * only needs the section itself, plus `currentProductId` for
 * FEATURED_COLLECTION (to exclude the current product from the related
 * list and to source "same_category" picks).
 *
 * `LEGACY_BLOCK` is the Shopify-style adapter that wraps any universal
 * page-builder block (HERO, FRIENDLY, CAROUSEL, ICON_TEXT, FAQ_TWO, …)
 * as a PRODUCT-group section — see `LegacyBlockSection`.
 */
export function ProductSectionsRenderer({
  sections,
  product,
  variants,
  options,
}: ProductSectionsRendererProps) {
  return (
    <>
      {sections.map((section) => {
        switch (section.type) {
          case "PRODUCT_MAIN":
            return (
              <ProductMain
                key={section.id}
                section={section}
                product={product}
                variants={variants}
                options={options}
              />
            )
          case "RICH_TEXT_SECTION":
            return <RichTextSection key={section.id} section={section} />
          case "IMAGE_WITH_TEXT":
            return <ImageWithText key={section.id} section={section} />
          case "FEATURED_COLLECTION":
            return (
              <FeaturedCollection
                key={section.id}
                section={section}
                currentProductId={product.id}
              />
            )
          case "TESTIMONIALS":
            return <Testimonials key={section.id} section={section} />
          case "FAQ_SECTION":
            return <FaqSection key={section.id} section={section} />
          case "LEGACY_BLOCK":
            return (
              <LegacyBlockSection
                key={section.id}
                section={section}
                currentProductId={product.id}
              />
            )
          default:
            return null
        }
      })}
    </>
  )
}
