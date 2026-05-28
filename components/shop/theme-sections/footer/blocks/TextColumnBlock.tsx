import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text"
import { SubBlockWrapper } from "../../_helpers"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"

interface Props {
  block: ResolvedThemeSectionBlock
}

interface TextColumnContent {
  title?: string
  body?: string
}

export function TextColumnBlock({ block }: Props) {
  const c = block.content as TextColumnContent
  return (
    <SubBlockWrapper block={block}>
      {c.title && (
        <h3
          data-content-field="title"
          className="mb-4 text-lg font-semibold"
        >
          {c.title}
        </h3>
      )}
      {c.body && (
        <div
          className="text-sm"
          dangerouslySetInnerHTML={{
            __html: sanitizeRichText(c.body),
          }}
        />
      )}
    </SubBlockWrapper>
  )
}
