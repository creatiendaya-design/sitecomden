import Image from "next/image";
import { Star } from "lucide-react";
import type { TestimonialsBlockContent } from "@/lib/types/landing-blocks";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface TestimonialsBlockProps {
  content: TestimonialsBlockContent | unknown;
}

export default function TestimonialsBlock({ content: rawContent }: TestimonialsBlockProps) {
  const content = readContent<TestimonialsBlockContent>(rawContent, "TESTIMONIALS");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);
  const { items } = content;
  if (!items?.length) return null;

  return (
    <section className={cn("landing-section py-8 @md:py-14 @container", styleClass)} style={inlineStyle}>
      <div className="container mx-auto px-4">
        <div className="grid gap-6 grid-cols-1 @md:grid-cols-2 @5xl:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={i}
              data-content-array="items"
              data-content-index={i}
              className="flex flex-col gap-3 rounded-2xl border bg-white p-6 shadow-sm"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`h-4 w-4 ${j < item.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
                  />
                ))}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                &ldquo;<span data-content-field="text">{item.text}</span>&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-2 border-t">
                {item.photo ? (
                  <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0">
                    <Image src={item.photo} alt={item.name} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span data-content-field="name" className="font-medium text-sm">{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
