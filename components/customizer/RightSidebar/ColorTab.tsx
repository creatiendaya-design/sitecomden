// components/customizer/RightSidebar/ColorTab.tsx
"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { useBuilderStore } from "../store";
import { DEFAULT_COLORS, getColorByHex } from "@/lib/customizer/default-colors";
import { CustomColorPicker } from "./CustomColorPicker";

export function ColorTab() {
  const layer = useBuilderStore((s) => s.getSelectedLayer());
  const update = useBuilderStore((s) => s.updateLayer);
  const template = useBuilderStore((s) => s.template);
  const [showPicker, setShowPicker] = useState(false);
  if (!layer || !template) return null;

  const allowed = new Set(template.allowedColors.map((c) => c.toUpperCase()));
  const swatches = DEFAULT_COLORS.filter((c) => allowed.has(c.hex.toUpperCase()));
  const groups = Array.from(new Set(swatches.map((c) => c.group)));

  const currentMatch = getColorByHex(layer.color);

  return (
    <div className="space-y-3">
      <div>
        <Label>Color del texto</Label>
        <p className="text-xs text-muted-foreground mt-1">
          {currentMatch?.name ?? "Custom"} ·{" "}
          <span className="font-mono">{layer.color.toUpperCase()}</span>
        </p>
      </div>

      {template.allowCustomColors && (
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="w-full text-sm border rounded p-2 hover:bg-muted text-left"
        >
          🎨 Color personalizado
        </button>
      )}
      {showPicker && template.allowCustomColors && (
        <CustomColorPicker
          value={layer.color}
          onChange={(hex) => update(layer.id, { color: hex })}
        />
      )}

      {groups.map((g) => {
        const items = swatches.filter((c) => c.group === g);
        if (items.length === 0) return null;
        return (
          <div key={g}>
            <Label className="text-xs capitalize">{g.replace("-", " ")}</Label>
            <div className="grid grid-cols-8 gap-1 mt-1">
              {items.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => update(layer.id, { color: c.hex })}
                  title={c.name}
                  className={`aspect-square rounded ${
                    layer.color.toUpperCase() === c.hex.toUpperCase()
                      ? "ring-2 ring-blue-500"
                      : "ring-1 ring-gray-200"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
