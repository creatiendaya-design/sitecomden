import Image from "next/image"
import type {
  ResolvedThemeSection,
  ResolvedThemeSectionBlock,
} from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { Quote } from "lucide-react"
import { SectionWrapper, SubBlockWrapper, ArrayItem } from "../_helpers"

interface TestimonialsProps {
  section: ResolvedThemeSection
}

interface TestimonialsContent {
  heading?: string
  layout?: "grid" | "carousel" | "stacked"
}

interface TestimonialItemContent {
  name?: string
  role?: string
  quote?: string
  avatar?: string
}

function TestimonialCard({
  block,
  index,
}: {
  block: ResolvedThemeSectionBlock
  index: number
}) {
  const content = block.content as TestimonialItemContent
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )
  const name = content.name?.trim() ?? ""
  const role = content.role?.trim() ?? ""
  const quote = content.quote?.trim() ?? ""
  const avatar = content.avatar?.trim() ?? ""

  if (!name && !quote) return null

  return (
    <ArrayItem array="testimonials" index={index}>
      <SubBlockWrapper
        block={block}
        className={`rounded-lg p-6 shadow-sm border ${className ?? ""}`}
        style={style}
        colorScheme={dataColorScheme}
      >
        <Quote className="h-6 w-6 opacity-40 mb-3" aria-hidden="true" />
        {quote && (
          <p
            className="text-sm sm:text-base mb-4"
            data-content-field="quote"
          >
            {quote}
          </p>
        )}
        <div className="flex items-center gap-3">
          {avatar && (
            <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0">
              <Image src={avatar} alt={name} fill sizes="40px" className="object-cover" />
            </div>
          )}
          <div>
            {name && (
              <p className="font-semibold text-sm" data-content-field="name">
                {name}
              </p>
            )}
            {role && (
              <p
                className="text-xs opacity-70"
                data-content-field="role"
              >
                {role}
              </p>
            )}
          </div>
        </div>
      </SubBlockWrapper>
    </ArrayItem>
  )
}

export function Testimonials({ section }: TestimonialsProps) {
  const content = section.content as TestimonialsContent
  const heading = content.heading?.trim() ?? ""
  const layout = content.layout ?? "grid"

  if (section.blocks.length === 0) return null

  const cards = section.blocks.map((block, i) => (
    <TestimonialCard key={block.id} block={block} index={i} />
  ))

  return (
    <SectionWrapper section={section} as="section" className="py-12">
      <div className="container mx-auto px-4">
        {heading && (
          <h2
            className="text-2xl sm:text-3xl font-bold mb-6 text-center"
            data-content-field="heading"
          >
            {heading}
          </h2>
        )}
        {layout === "carousel" ? (
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {cards.map((card, i) => (
              <div key={i} className="snap-start shrink-0 w-72">
                {card}
              </div>
            ))}
          </div>
        ) : layout === "stacked" ? (
          <div className="max-w-2xl mx-auto flex flex-col gap-4">{cards}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {cards}
          </div>
        )}
      </div>
    </SectionWrapper>
  )
}
