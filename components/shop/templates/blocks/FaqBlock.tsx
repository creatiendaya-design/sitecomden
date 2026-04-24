"use client";

import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqContent {
  title?: string;
  items: FaqItem[];
  allowMultipleOpen?: boolean;
  defaultOpenFirst?: boolean;
}

interface FaqBlockProps {
  content: FaqContent | unknown;
}

export default function FaqBlock({ content: rawContent }: FaqBlockProps) {
  const content = readContent<FaqContent>(rawContent, "FAQ");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const items = content.items ?? [];
  if (items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: stripHtml(item.answer),
      },
    })),
  };

  const firstId = items[0]?.id;

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 max-w-3xl">
        {content.title && (
          <h2 className="text-2xl @md:text-3xl font-bold mb-6 text-center">{content.title}</h2>
        )}
        {content.allowMultipleOpen ? (
          <Accordion
            type="multiple"
            defaultValue={content.defaultOpenFirst && firstId ? [firstId] : []}
          >
            {items.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                <AccordionContent>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeRichText(item.answer),
                    }}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Accordion
            type="single"
            collapsible
            defaultValue={content.defaultOpenFirst ? firstId : undefined}
          >
            {items.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                <AccordionContent>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeRichText(item.answer),
                    }}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </section>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
