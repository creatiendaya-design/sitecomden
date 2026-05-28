import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import RichTextContent from "@/components/RichTextContent"
import { SubBlockWrapper } from "../_helpers"
import type { ProductForRender } from "./types"

interface ProductDescriptionProps {
  block: ResolvedThemeSectionBlock
  product: ProductForRender
}

interface ProductDescriptionContent {
  heading?: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

export function ProductDescription({
  block,
  product,
}: ProductDescriptionProps) {
  const content = block.content as ProductDescriptionContent
  const heading = content.heading?.trim() || "Descripción"
  const collapsible = content.collapsible ?? false
  const defaultExpanded = content.defaultExpanded ?? true
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )

  if (!product.description) {
    return null
  }

  const body = (
    <div className="prose prose-sm sm:prose max-w-none">
      <RichTextContent content={product.description} />
    </div>
  )

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      {collapsible ? (
        <details open={defaultExpanded}>
          <summary className="cursor-pointer text-lg sm:text-xl font-semibold mb-3">
            <span data-content-field="heading">{heading}</span>
          </summary>
          {body}
        </details>
      ) : (
        <>
          <h2
            className="text-lg sm:text-xl font-semibold mb-3"
            data-content-field="heading"
          >
            {heading}
          </h2>
          {body}
        </>
      )}
    </SubBlockWrapper>
  )
}
