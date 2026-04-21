"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ColorsBlockContent } from "@/lib/types/landing-blocks";

interface ColorsBlockFormProps {
  content: ColorsBlockContent;
  onChange: (content: ColorsBlockContent) => void;
}

const COLOR_FIELDS: { key: keyof ColorsBlockContent; label: string }[] = [
  { key: "primary", label: "Color primario" },
  { key: "background", label: "Fondo de secciones" },
  { key: "cta", label: "Color de botones CTA" },
  { key: "text", label: "Color de texto" },
];

export default function ColorsBlockForm({ content, onChange }: ColorsBlockFormProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {COLOR_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <Label className="text-xs">{label}</Label>
          <div className="flex gap-2 mt-1 items-center">
            <input
              type="color"
              value={content[key] ?? "#000000"}
              onChange={(e) => onChange({ ...content, [key]: e.target.value })}
              className="h-8 w-10 rounded border cursor-pointer p-0.5"
            />
            <Input
              value={content[key] ?? ""}
              onChange={(e) => onChange({ ...content, [key]: e.target.value })}
              className="text-xs h-8"
              placeholder="#000000"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
