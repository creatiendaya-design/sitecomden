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
    <section className="landing-section py-14">
      <div className="container mx-auto px-4">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-4xl mb-4">{card.icon}</span>
              <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
