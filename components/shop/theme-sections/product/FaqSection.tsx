"use client"

import type {
  ResolvedThemeSection,
  ResolvedThemeSectionBlock,
} from "@/lib/theme-sections/types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import RichTextContent from "@/components/RichTextContent"
import { SectionWrapper, ArrayItem } from "../_helpers"

interface FaqSectionProps {
  section: ResolvedThemeSection
}

interface FaqSectionContent {
  heading?: string
  allowMultipleOpen?: boolean
  openFirstByDefault?: boolean
}

interface FaqItemContent {
  question?: string
  answer?: string
}

export function FaqSection({ section }: FaqSectionProps) {
  const content = section.content as FaqSectionContent
  const heading = content.heading?.trim() ?? ""
  const allowMultiple = content.allowMultipleOpen ?? false
  const openFirst = content.openFirstByDefault ?? false

  const items = section.blocks.filter((b) => b.type === "FAQ_ITEM")
  if (items.length === 0) return null

  const defaultValue = openFirst ? [items[0].id] : []

  return (
    <SectionWrapper section={section} as="section" className="py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {heading && (
          <h2
            className="text-2xl sm:text-3xl font-bold mb-6"
            data-content-field="heading"
          >
            {heading}
          </h2>
        )}
        {allowMultiple ? (
          <Accordion type="multiple" defaultValue={defaultValue}>
            {items.map((block, i) => (
              <FaqRow key={block.id} block={block} index={i} />
            ))}
          </Accordion>
        ) : (
          <Accordion
            type="single"
            collapsible
            defaultValue={openFirst ? items[0]?.id : undefined}
          >
            {items.map((block, i) => (
              <FaqRow key={block.id} block={block} index={i} />
            ))}
          </Accordion>
        )}
      </div>
    </SectionWrapper>
  )
}

function FaqRow({
  block,
  index,
}: {
  block: ResolvedThemeSectionBlock
  index: number
}) {
  const content = block.content as FaqItemContent
  const question = content.question?.trim() ?? ""
  const answer = content.answer?.trim() ?? ""

  if (!question) return null

  return (
    <ArrayItem array="faqs" index={index}>
      <AccordionItem value={block.id} data-preview-target={`subblock:${block.id}`}>
        <AccordionTrigger>
          <span data-content-field="question">{question}</span>
        </AccordionTrigger>
        <AccordionContent>
          {answer ? (
            <RichTextContent content={answer} />
          ) : (
            <p className="text-sm opacity-60">Sin respuesta.</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </ArrayItem>
  )
}
