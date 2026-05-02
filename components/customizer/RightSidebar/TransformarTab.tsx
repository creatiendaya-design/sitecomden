// components/customizer/RightSidebar/TransformarTab.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBuilderStore } from "../store";

export function TransformarTab() {
  const layer = useBuilderStore((s) => s.getSelectedLayer());
  const update = useBuilderStore((s) => s.updateLayer);
  if (!layer) return null;

  return (
    <div className="space-y-4">
      <div>
        <Label>Rotación: {Math.round(layer.rotation)}°</Label>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={layer.rotation}
          onChange={(e) =>
            update(layer.id, { rotation: Number(e.target.value) })
          }
          className="w-full"
        />
        <div className="flex gap-1 mt-1">
          {[0, 90, 180, 270].map((deg) => (
            <button
              key={deg}
              onClick={() => update(layer.id, { rotation: deg })}
              className="text-xs px-2 py-1 border rounded hover:bg-muted"
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Ancho (%)</Label>
          <Input
            type="number"
            value={layer.width.toFixed(1)}
            onChange={(e) => update(layer.id, { width: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Alto (%)</Label>
          <Input
            type="number"
            value={layer.height.toFixed(1)}
            onChange={(e) =>
              update(layer.id, { height: Number(e.target.value) })
            }
          />
        </div>
      </div>
    </div>
  );
}
