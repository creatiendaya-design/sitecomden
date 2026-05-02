// components/customizer/ZoneTabs.tsx
"use client";

import { useBuilderStore } from "./store";

export function ZoneTabs() {
  const template = useBuilderStore((s) => s.template);
  const active = useBuilderStore((s) => s.activeZoneId);
  const setActive = useBuilderStore((s) => s.setActiveZone);
  if (!template) return null;
  return (
    <div className="border-b bg-white px-4 py-2 flex gap-2">
      {template.zones.map((z) => (
        <button
          key={z.id}
          onClick={() => setActive(z.id)}
          className={`px-3 py-1.5 text-sm rounded ${
            active === z.id
              ? "bg-blue-100 text-blue-700 font-medium"
              : "hover:bg-muted"
          }`}
        >
          {z.name}
        </button>
      ))}
    </div>
  );
}
