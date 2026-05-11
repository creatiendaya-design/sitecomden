import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface FooterRichTextContent {
  body?: string
}

export function FooterRichText({ section }: Props) {
  const data = section.content as FooterRichTextContent
  const html = sanitizeRichText(data.body)
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  return (
    <div
      className={`container mx-auto px-4 py-6 prose max-w-none ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
