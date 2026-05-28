import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import type { ProductForRender } from "./types"

interface ProductTitleProps {
  block: ResolvedThemeSectionBlock
  product: ProductForRender
}

// Stub — full implementation lands in Task C3 (stateless sub-blocks).
export function ProductTitle(_props: ProductTitleProps) {
  return null
}
