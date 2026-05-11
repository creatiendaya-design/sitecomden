// components/admin/customizer-templates/ColorsPaletteEditor.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEFAULT_COLORS } from "@/lib/customizer/default-colors";

interface ColorsPaletteEditorProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function ColorsPaletteEditor({ selected, onChange }: ColorsPaletteEditorProps) {
  const [customHex, setCustomHex] = useState("");
  const sel = new Set(selected.map((c) => c.toUpperCase()));
  const groups = Array.from(new Set(DEFAULT_COLORS.map((c) => c.group)));

  const toggle = (hex: string) => {
    const upper = hex.toUpperCase();
    if (sel.has(upper)) onChange(selected.filter((c) => c.toUpperCase() !== upper));
    else onChange([...selected, hex]);
  };

  const addCustom = () => {
    if (HEX_RE.test(customHex) && !sel.has(customHex.toUpperCase())) {
      onChange([...selected, customHex]);
      setCustomHex("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="#RRGGBB"
          value={customHex}
          onChange={(e) => setCustomHex(e.target.value)}
          className="font-mono w-32"
        />
        <Button type="button" onClick={addCustom} disabled={!HEX_RE.test(customHex)}>
          + Añadir custom
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_COLORS.map((c) => c.hex))}
        >
          Toda la paleta
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
          Limpiar
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        {selected.length} colores seleccionados
      </div>
      {groups.map((g) => {
        const items = DEFAULT_COLORS.filter((c) => c.group === g);
        return (
          <div key={g} className="border rounded-lg p-3">
            <h4 className="font-medium capitalize text-sm mb-2">
              {g.replace("-", " ")}
            </h4>
            <div className="grid grid-cols-12 gap-1">
              {items.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => toggle(c.hex)}
                  className={`aspect-square rounded ${
                    sel.has(c.hex.toUpperCase())
                      ? "ring-2 ring-blue-500"
                      : "ring-1 ring-gray-200"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
