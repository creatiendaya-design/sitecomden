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
    <section className="landing-section py-8 sm:py-14">
      <div className="container mx-auto px-4">
        <div className="grid gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card, i) => (
            <div
              key={i}
              className="w-full flex flex-row sm:flex-col items-center gap-4 sm:gap-0 text-left sm:text-center p-4 sm:p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-3xl sm:text-4xl shrink-0 sm:mb-4">{card.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg sm:mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
