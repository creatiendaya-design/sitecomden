import { SectionWrapper } from "../_helpers"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import type { ProductForRender } from "./types"
import { getProductImageUrl } from "@/lib/image-utils"
import FrequentlyBoughtTogether, {
  type FbtItem,
  type FbtAddMode,
} from "@/components/shop/FrequentlyBoughtTogether"

interface FrequentlyBoughtTogetherSectionProps {
  section: ResolvedThemeSection
  product: ProductForRender
}

interface FbtSectionContent {
  heading?: string
  mode?: FbtAddMode
  limit?: number
}

/**
 * FREQUENTLY_BOUGHT_TOGETHER theme section. The recommendations come from
 * `product.frequentlyBoughtTogether` (resolved in page.tsx); the section's
 * `content` only controls presentation (heading, add mode, how many). Style,
 * position and visibility are handled by the customizer like any other section.
 *
 * Server component — it builds the combo items (current product + recos) and
 * hands them to the client body, which owns the add-to-cart interactions.
 */
export function FrequentlyBoughtTogetherSection({
  section,
  product,
}: FrequentlyBoughtTogetherSectionProps) {
  const content = section.content as FbtSectionContent
  const heading = content.heading ?? "Comprados juntos"
  const mode = content.mode ?? "add_all"
  const limit = content.limit ?? 3

  const recs = (product.frequentlyBoughtTogether ?? []).slice(0, limit)
  if (recs.length === 0) return null

  // Include the current product in the combo only when it has no variants
  // (a one-click combo can't pick an option). Mirrors the standalone behavior.
  const currentItem: FbtItem | null = product.hasVariants
    ? null
    : {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.basePrice,
        mainImage: getProductImageUrl(product.images),
        hasVariants: false,
        inStock: product.stock > 0,
        stock: product.stock,
        isCurrent: true,
      }

  const items: FbtItem[] = [
    ...(currentItem ? [currentItem] : []),
    ...recs.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      price: r.price,
      mainImage: r.mainImage,
      hasVariants: r.hasVariants,
      inStock: r.inStock,
      stock: r.stock,
      isCurrent: false,
    })),
  ]

  return (
    <SectionWrapper section={section} as="section">
      <div className="container mx-auto px-4 py-10">
        <h2
          className="mb-6 text-xl font-semibold sm:text-2xl"
          data-content-field="heading"
        >
          {heading}
        </h2>
        <FrequentlyBoughtTogether items={items} mode={mode} />
      </div>
    </SectionWrapper>
  )
}
