import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import type { ProductForRender } from "./types"

interface ProductMetaProps {
  block: ResolvedThemeSectionBlock
  product: ProductForRender
}

// Stub — full implementation lands in Task C3 (stateless sub-blocks).
export function ProductMeta(_props: ProductMetaProps) {
  return null
}
