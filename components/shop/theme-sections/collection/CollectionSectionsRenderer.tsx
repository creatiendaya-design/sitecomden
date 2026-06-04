import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import { RichTextSection } from "../product/RichTextSection"
import { ImageWithText } from "../product/ImageWithText"
import { FeaturedCollection } from "../product/FeaturedCollection"
import { Testimonials } from "../product/Testimonials"
import { FaqSection } from "../product/FaqSection"
import {
  CollectionGrid,
  type CollectionGridProduct,
  type CollectionGridCategory,
  type CollectionGridFilters,
} from "./CollectionGrid"

interface CollectionSectionsRendererProps {
  sections: ResolvedThemeSection[]
  products: CollectionGridProduct[]
  categories: CollectionGridCategory[]
  filters: CollectionGridFilters
}

/**
 * Plan 19 — top-level dispatcher for COLLECTION-group theme sections, used
 * from `app/(shop)/productos/page.tsx`. Maps each section by `type` to its
 * renderer. `COLLECTION_GRID` receives the page-fetched products /
 * categories / filters; the generic banner-style sections (rich text,
 * image+text, featured collection, testimonials, FAQ) are reused verbatim
 * from the PRODUCT-group renderers since they only depend on their own
 * `section` content. Unknown types are silently skipped so a registry
 * refactor doesn't break the storefront.
 */
export function CollectionSectionsRenderer({
  sections,
  products,
  categories,
  filters,
}: CollectionSectionsRendererProps) {
  return (
    <>
      {sections.map((section) => {
        switch (section.type) {
          case "COLLECTION_GRID":
            return (
              <CollectionGrid
                key={section.id}
                section={section}
                products={products}
                categories={categories}
                filters={filters}
              />
            )
          case "RICH_TEXT_SECTION":
            return <RichTextSection key={section.id} section={section} />
          case "IMAGE_WITH_TEXT":
            return <ImageWithText key={section.id} section={section} />
          case "FEATURED_COLLECTION":
            // No "current product" context on the index — pass an empty id
            // so the related-products query excludes nothing meaningful.
            return (
              <FeaturedCollection
                key={section.id}
                section={section}
                currentProductId=""
              />
            )
          case "TESTIMONIALS":
            return <Testimonials key={section.id} section={section} />
          case "FAQ_SECTION":
            return <FaqSection key={section.id} section={section} />
          default:
            return null
        }
      })}
    </>
  )
}
