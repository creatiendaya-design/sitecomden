// components/customizer/LeftSidebar/LayersTab.tsx
"use client";

import { Plus, Type as TypeIcon, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "../store";
import type { TextLayer } from "@/lib/customizer/types";

const newTextLayer = (): TextLayer => ({
  id: crypto.randomUUID(),
  type: "TEXT",
  text: "Tu texto aquí",
  font: "Inter",
  size: 32,
  color: "#000000",
  letterSpacing: 0,
  rotation: 0,
  x: 50,
  y: 50,
  width: 30,
  height: 5,
  align: "center",
});

export function LayersTab() {
  const layers = useBuilderStore((s) => s.getLayersForActiveZone());
  const selectedId = useBuilderStore((s) => s.selectedLayerId);
  const addLayer = useBuilderStore((s) => s.addLayer);
  const setSelected = useBuilderStore((s) => s.setSelectedLayer);
  const deleteLayer = useBuilderStore((s) => s.deleteLayer);
  const duplicateLayer = useBuilderStore((s) => s.duplicateLayer);
  const template = useBuilderStore((s) => s.template);

  const canAdd = !template || layers.length < template.maxLayersPerZone;

  return (
    <div className="space-y-3">
      <Button
        size="sm"
        className="w-full"
        onClick={() => addLayer(newTextLayer())}
        disabled={!canAdd}
      >
        <Plus className="size-4 mr-1" /> Texto
      </Button>

      {!canAdd && template && (
        <p className="text-xs text-muted-foreground">
          Máximo {template.maxLayersPerZone} capas por zona
        </p>
      )}

      {layers.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Toca + Texto para empezar
        </p>
      ) : (
        <ul className="space-y-1">
          {layers.map((layer) => (
            <li
              key={layer.id}
              onClick={() => setSelected(layer.id)}
              className={`p-2 border rounded cursor-pointer flex items-center gap-2 group ${
                selectedId === layer.id
                  ? "bg-blue-50 border-blue-300"
                  : "hover:bg-muted"
              }`}
            >
              <TypeIcon className="size-4 flex-shrink-0" />
              <span className="text-xs flex-1 truncate">
                {layer.text || "(vacío)"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateLayer(layer.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition"
                title="Duplicar"
              >
                <Copy className="size-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLayer(layer.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition"
                title="Eliminar"
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
