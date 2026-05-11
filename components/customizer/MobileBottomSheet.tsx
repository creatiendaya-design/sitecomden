// components/customizer/MobileBottomSheet.tsx
"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useBuilderStore } from "./store";
import { RightSidebar } from "./RightSidebar";

export function MobileBottomSheet() {
  const [open, setOpen] = useState(false);
  const layersCount = useBuilderStore((s) => s.getLayersForActiveZone().length);

  return (
    <div
      className={`fixed bottom-16 left-0 right-0 bg-white border-t shadow-lg transition-transform duration-200 z-30 ${
        open ? "translate-y-0 max-h-[60vh]" : "translate-y-0 max-h-12"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm border-b"
      >
        <span>{layersCount} capas · Toca para editar</span>
        {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>
      {open && (
        <div className="overflow-y-auto" style={{ maxHeight: "calc(60vh - 48px)" }}>
          <RightSidebar />
        </div>
      )}
    </div>
  );
}
