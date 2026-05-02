// components/customizer/MobileFAB.tsx
"use client";

import { useState } from "react";
import { Plus, Package, Layers, X } from "lucide-react";
import { useBuilderStore } from "./store";
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

interface Props {
  onShowProduct: () => void;
  onShowLayers: () => void;
}

export function MobileFAB({ onShowProduct, onShowLayers }: Props) {
  const [open, setOpen] = useState(false);
  const addLayer = useBuilderStore((s) => s.addLayer);

  return (
    <div className="fixed bottom-20 left-4 z-30">
      {open && (
        <div className="absolute bottom-14 left-0 flex flex-col gap-2">
          <button
            onClick={() => {
              onShowProduct();
              setOpen(false);
            }}
            className="size-12 rounded-full bg-white border shadow-md flex items-center justify-center"
            title="Producto"
          >
            <Package className="size-5" />
          </button>
          <button
            onClick={() => {
              onShowLayers();
              setOpen(false);
            }}
            className="size-12 rounded-full bg-white border shadow-md flex items-center justify-center"
            title="Capas"
          >
            <Layers className="size-5" />
          </button>
          <button
            onClick={() => {
              addLayer(newTextLayer());
              setOpen(false);
            }}
            className="size-12 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center font-bold"
            title="Añadir texto"
          >
            T
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="size-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center"
      >
        {open ? <X className="size-6" /> : <Plus className="size-6" />}
      </button>
    </div>
  );
}
