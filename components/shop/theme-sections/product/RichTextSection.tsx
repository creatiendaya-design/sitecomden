import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import RichTextContent from "@/components/RichTextContent"
import { SectionWrapper } from "../_helpers"

interface RichTextSectionProps {
  section: ResolvedThemeSection
}

interface RichTextSectionContent {
  heading?: string
  body?: string
}

export function RichTextSection({ section }: RichTextSectionProps) {
  const content = section.content as RichTextSectionContent
  const heading = content.heading?.trim() ?? ""
  const body = content.body?.trim() ?? ""

  if (!heading && !body) return null

  return (
    <SectionWrapper section={section} as="section" className="py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {heading && (
          <h2
            className="text-2xl sm:text-3xl font-bold mb-4"
            data-content-field="heading"
          >
            {heading}
          </h2>
        )}
        {body && <RichTextContent content={body} />}
      </div>
    </SectionWrapper>
  )
}
