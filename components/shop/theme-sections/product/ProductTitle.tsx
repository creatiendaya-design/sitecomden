import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { Badge } from "@/components/ui/badge"
import { SubBlockWrapper } from "../_helpers"
import type { ProductForRender } from "./types"

interface ProductTitleProps {
  block: ResolvedThemeSectionBlock
  product: ProductForRender
}

interface ProductTitleContent {
  showCategoryBadges?: boolean
  showShortDescription?: boolean
  headingTag?: "h1" | "h2"
}

export function ProductTitle({ block, product }: ProductTitleProps) {
  const content = block.content as ProductTitleContent
  const headingTag = content.headingTag === "h2" ? "h2" : "h1"
  const showBadges = content.showCategoryBadges ?? true
  const showShort = content.showShortDescription ?? true
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )
  const Heading = headingTag

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      {showBadges && product.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {product.categories.map((pc) => (
            <Badge
              key={pc.category.id}
              variant="secondary"
              className="text-xs sm:text-sm"
            >
              {pc.category.name}
            </Badge>
          ))}
        </div>
      )}
      <Heading
        className="product-title"
        data-content-field="productName"
      >
        {product.name}
      </Heading>
      {showShort && product.shortDescription && (
        <p className="product-description mt-2">{product.shortDescription}</p>
      )}
    </SubBlockWrapper>
  )
}
