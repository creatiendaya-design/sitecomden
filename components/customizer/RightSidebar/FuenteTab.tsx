// components/customizer/RightSidebar/FuenteTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useBuilderStore } from "../store";
import {
  DEFAULT_FONTS,
  POPULAR_FONT_KEYS,
} from "@/lib/customizer/default-fonts";
import { loadGoogleFont, preloadFonts } from "@/lib/customizer/lazy-fonts";

type FilterMode = "all" | "popular";

export function FuenteTab() {
  const layer = useBuilderStore((s) => s.getSelectedLayer());
  const update = useBuilderStore((s) => s.updateLayer);
  const template = useBuilderStore((s) => s.template);
  const allLayers = useBuilderStore((s) => s.zones);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<FilterMode>("all");

  useEffect(() => {
    preloadFonts(POPULAR_FONT_KEYS);
  }, []);

  const usedFonts = useMemo(() => {
    const set = new Set<string>();
    for (const arr of Object.values(allLayers))
      for (const l of arr) set.add(l.font);
    return Array.from(set);
  }, [allLayers]);

  if (!layer || !template) return null;

  const allowed = new Set(template.allowedFonts);
  const available = DEFAULT_FONTS.filter((f) => allowed.has(f.key));

  const filtered = available.filter((f) => {
    if (mode === "popular" && !POPULAR_FONT_KEYS.includes(f.key)) return false;
    if (search && !f.key.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const usedAvailable = available.filter((f) => usedFonts.includes(f.key));

  const renderItem = (key: string, family: string) => {
    const isSelected = layer.font === key;
    return (
      <button
        key={key}
        onClick={() => {
          loadGoogleFont(family);
          update(layer.id, { font: key });
        }}
        onMouseEnter={() => loadGoogleFont(family)}
        className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between ${
          isSelected ? "bg-blue-50" : ""
        }`}
        style={{ fontFamily: `"${family}", sans-serif` }}
      >
        <span>{key}</span>
        {isSelected && <Check className="size-4 text-blue-600" />}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar fuente"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex border-b text-sm">
        <button
          onClick={() => setMode("all")}
          className={`px-3 py-1.5 ${
            mode === "all"
              ? "border-b-2 border-blue-600 font-medium"
              : "text-muted-foreground"
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setMode("popular")}
          className={`px-3 py-1.5 ${
            mode === "popular"
              ? "border-b-2 border-blue-600 font-medium"
              : "text-muted-foreground"
          }`}
        >
          Populares
        </button>
      </div>

      {usedAvailable.length > 0 && search === "" && (
        <div>
          <p className="text-xs uppercase text-muted-foreground px-3 py-1">
            Utilizadas en el diseño
          </p>
          {usedAvailable.map((f) => renderItem(f.key, f.family))}
        </div>
      )}

      <div>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">Sin resultados</p>
        ) : (
          filtered.map((f) => renderItem(f.key, f.family))
        )}
      </div>
    </div>
  );
}
