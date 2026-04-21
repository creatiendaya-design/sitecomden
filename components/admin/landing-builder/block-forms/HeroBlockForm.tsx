"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HeroBlockContent } from "@/lib/types/landing-blocks";

interface HeroBlockFormProps {
  content: HeroBlockContent;
  onChange: (content: HeroBlockContent) => void;
}

export default function HeroBlockForm({ content, onChange }: HeroBlockFormProps) {
  const update = (field: keyof HeroBlockContent, value: string) =>
    onChange({ ...content, [field]: value });

  return (
    <div className="space-y-3">
      <div>
        <Label>Título</Label>
        <Input value={content.title} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div>
        <Label>Subtítulo</Label>
        <Input value={content.subtitle ?? ""} onChange={(e) => update("subtitle", e.target.value)} />
      </div>
      <div>
        <Label>Imagen de fondo (URL)</Label>
        <Input value={content.bgImage ?? ""} onChange={(e) => update("bgImage", e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <Label>Color de overlay</Label>
        <Input value={content.overlayColor ?? "rgba(0,0,0,0.3)"} onChange={(e) => update("overlayColor", e.target.value)} placeholder="rgba(0,0,0,0.3)" />
      </div>
      <div>
        <Label>Texto del botón CTA</Label>
        <Input value={content.ctaText ?? ""} onChange={(e) => update("ctaText", e.target.value)} />
      </div>
    </div>
  );
}
