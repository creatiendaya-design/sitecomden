import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import RichTextContent from "@/components/RichTextContent"
import { SubBlockWrapper } from "../_helpers"

interface ProductRichTextProps {
  block: ResolvedThemeSectionBlock
}

interface ProductRichTextContent {
  body?: string
}

export function ProductRichText({ block }: ProductRichTextProps) {
  const content = block.content as ProductRichTextContent
  const body = content.body?.trim() ?? ""
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )

  if (!body) return null

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      <RichTextContent content={body} />
    </SubBlockWrapper>
  )
}
