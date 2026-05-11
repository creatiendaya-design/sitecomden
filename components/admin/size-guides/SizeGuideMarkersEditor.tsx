// components/admin/size-guides/SizeGuideMarkersEditor.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import type { SizeGuideMarker } from "@/lib/size-guides/types";

interface Props {
  value: SizeGuideMarker[];
  onChange: (next: SizeGuideMarker[]) => void;
}

export function SizeGuideMarkersEditor({ value, onChange }: Props) {
  const addMarker = () =>
    onChange([...value, { key: "", label: "", description: "" }]);

  const updateMarker = (i: number, patch: Partial<SizeGuideMarker>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const removeMarker = (i: number) =>
    onChange(value.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      {value.map((m, i) => (
        <div key={i} className="border rounded p-2 space-y-2">
          <div className="flex gap-2">
            <Input
              value={m.key}
              onChange={(e) => updateMarker(i, { key: e.target.value })}
              placeholder="A"
              className="w-16 font-mono"
              maxLength={4}
            />
            <Input
              value={m.label}
              onChange={(e) => updateMarker(i, { label: e.target.value })}
              placeholder="Label (Largo, Ancho…)"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeMarker(i)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Textarea
            value={m.description}
            onChange={(e) =>
              updateMarker(i, { description: e.target.value })
            }
            placeholder="Cómo medir…"
            rows={2}
          />
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addMarker}>
        <Plus className="mr-1 size-4" /> Marcador
      </Button>
    </div>
  );
}
