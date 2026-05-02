// components/customizer/RightSidebar/index.tsx
"use client";

import { useState } from "react";
import { useBuilderStore } from "../store";
import { TextoTab } from "./TextoTab";
import { ColorTab } from "./ColorTab";
import { FuenteTab } from "./FuenteTab";
import { TransformarTab } from "./TransformarTab";
import { PosicionTab } from "./PosicionTab";

type TabKey = "texto" | "color" | "fuente" | "transformar" | "posicion";

export function RightSidebar() {
  const [tab, setTab] = useState<TabKey>("texto");
  const selected = useBuilderStore((s) => s.getSelectedLayer());
  const template = useBuilderStore((s) => s.template);

  if (!selected) {
    return (
      <div className="p-4 text-sm text-muted-foreground space-y-3">
        <h3 className="font-medium text-foreground">Plantilla</h3>
        <p>{template?.name}</p>
        {template?.surcharge ? (
          <p className="text-xs">Sobrecargo: S/ {template.surcharge.toFixed(2)}</p>
        ) : null}
        <p className="text-xs italic mt-6">
          Selecciona una capa para editarla, o ve a &quot;Capas&quot; en el sidebar
          izquierdo para añadir texto.
        </p>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "texto", label: "Texto" },
    { key: "color", label: "Color" },
    { key: "fuente", label: "Fuente" },
    { key: "transformar", label: "Transformar" },
    { key: "posicion", label: "Posición" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "texto" && <TextoTab />}
        {tab === "color" && <ColorTab />}
        {tab === "fuente" && <FuenteTab />}
        {tab === "transformar" && <TransformarTab />}
        {tab === "posicion" && <PosicionTab />}
      </div>
    </div>
  );
}
