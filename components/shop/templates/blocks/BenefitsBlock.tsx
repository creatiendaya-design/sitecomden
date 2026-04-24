import type { BenefitsBlockContent } from "@/lib/types/landing-blocks";
import { readContent } from "./_normalizeContent";

interface BenefitsBlockProps {
  content: BenefitsBlockContent | unknown;
}

export default function BenefitsBlock({ content: rawContent }: BenefitsBlockProps) {
  const content = readContent<BenefitsBlockContent>(rawContent, "BENEFITS");
  const { cards } = content;
  if (!cards?.length) return null;

  return (
    // `@container` turns this section into a container query context so all
    // `@sm:`, `@md:`, `@3xl:` variants inside respond to THIS section's width,
    // not the browser viewport. That way the editor canvas (with a narrow
    // simulated frame) and the real storefront behave identically regardless
    // of the actual browser viewport width.
    <section className="landing-section py-8 @md:py-14 @container">
      <div className="container mx-auto px-4">
        <div className="grid gap-3 @md:gap-6 grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
          {cards.map((card, i) => (
            <div
              key={i}
              className="w-full flex flex-row @md:flex-col items-center gap-4 @md:gap-0 text-left @md:text-center p-4 @md:p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-3xl @md:text-4xl shrink-0 @md:mb-4">{card.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base @md:text-lg @md:mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
