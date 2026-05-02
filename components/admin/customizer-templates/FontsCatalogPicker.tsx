// components/admin/customizer-templates/FontsCatalogPicker.tsx
"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEFAULT_FONTS } from "@/lib/customizer/default-fonts";
import { FONT_CATEGORIES, type FontCategory } from "@/lib/customizer/types";

interface FontsCatalogPickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

export function FontsCatalogPicker({ selected, onChange }: FontsCatalogPickerProps) {
  const [search, setSearch] = useState("");
  const selectedSet = new Set(selected);

  const toggle = (key: string) => {
    if (selectedSet.has(key)) onChange(selected.filter((k) => k !== key));
    else onChange([...selected, key]);
  };

  const selectCategory = (cat: FontCategory) => {
    const keys = DEFAULT_FONTS.filter((f) => f.category === cat).map((f) => f.key);
    onChange(Array.from(new Set([...selected, ...keys])));
  };

  const filtered = DEFAULT_FONTS.filter(
    (f) => !search || f.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Buscar fuente"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_FONTS.map((f) => f.key))}
        >
          Todas
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
          Ninguna
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        {selected.length} de {DEFAULT_FONTS.length} fuentes
      </div>
      {FONT_CATEGORIES.map((cat) => {
        const items = filtered.filter((f) => f.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium capitalize text-sm">{cat}</h4>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => selectCategory(cat)}
              >
                Seleccionar todas
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((f) => (
                <label
                  key={f.key}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selectedSet.has(f.key)}
                    onCheckedChange={() => toggle(f.key)}
                  />
                  <span>{f.key}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
