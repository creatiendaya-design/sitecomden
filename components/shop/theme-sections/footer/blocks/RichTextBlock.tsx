import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text"
import { SubBlockWrapper } from "../../_helpers"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"

interface Props {
  block: ResolvedThemeSectionBlock
}

interface RichTextContent {
  title?: string
  body?: string
}

export function RichTextBlock({ block }: Props) {
  const data = block.content as RichTextContent
  const html = sanitizeRichText(data.body)
  return (
    <SubBlockWrapper block={block} className="prose max-w-none">
      {data.title && (
        <h3
          data-content-field="title"
          className="mb-3 text-lg font-semibold not-prose"
        >
          {data.title}
        </h3>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </SubBlockWrapper>
  )
}
