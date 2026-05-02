// components/customizer/RightSidebar/TextoTab.tsx
"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useBuilderStore } from "../store";

export function TextoTab() {
  const layer = useBuilderStore((s) => s.getSelectedLayer());
  const update = useBuilderStore((s) => s.updateLayer);
  const template = useBuilderStore((s) => s.template);
  if (!layer || !template) return null;

  return (
    <div className="space-y-4">
      <div>
        <Label>Texto</Label>
        <Textarea
          value={layer.text}
          onChange={(e) =>
            update(layer.id, {
              text: e.target.value.slice(0, template.maxCharsPerLayer),
            })
          }
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {layer.text.length}/{template.maxCharsPerLayer}
        </p>
      </div>
      <div>
        <Label>Espaciado entre letras: {layer.letterSpacing.toFixed(1)}</Label>
        <input
          type="range"
          min={-10}
          max={50}
          step={0.5}
          value={layer.letterSpacing}
          onChange={(e) =>
            update(layer.id, { letterSpacing: Number(e.target.value) })
          }
          className="w-full"
        />
      </div>
      <div>
        <Label>Tamaño: {layer.size}px</Label>
        <input
          type="range"
          min={8}
          max={200}
          step={1}
          value={layer.size}
          onChange={(e) => update(layer.id, { size: Number(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}
