"use client";

import { useEffect, useRef, useState } from "react";
import { Folder, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchCategoriesForPromotion } from "@/actions/promotions";

interface PickerCategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface CategoryPickerProps {
  selectedIds: string[];
  onChange: (next: string[]) => void;
}

export default function CategoryPicker({ selectedIds, onChange }: CategoryPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickerCategory[]>([]);
  const [selectedCats, setSelectedCats] = useState<PickerCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchCategoriesForPromotion(query);
        if (!cancelled) setResults(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    if (hydrated.current) return;
    if (selectedIds.length === 0) {
      hydrated.current = true;
      return;
    }
    hydrated.current = true;
    (async () => {
      const data = await searchCategoriesForPromotion("");
      const matched = data.filter((c) => selectedIds.includes(c.id));
      setSelectedCats(matched);
    })();
  }, [selectedIds]);

  const toggle = (cat: PickerCategory) => {
    if (selectedIds.includes(cat.id)) {
      onChange(selectedIds.filter((id) => id !== cat.id));
      setSelectedCats((prev) => prev.filter((c) => c.id !== cat.id));
    } else {
      onChange([...selectedIds, cat.id]);
      setSelectedCats((prev) => [...prev, cat]);
    }
  };

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
    setSelectedCats((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-3">
      {selectedCats.length > 0 && (
        <div className="space-y-1.5">
          {selectedCats.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-md border bg-muted/30 p-2"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                <Folder className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.productCount} producto{c.productCount === 1 ? "" : "s"}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => remove(c.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar categoría…"
          className="h-9 pl-8"
        />
      </div>

      <div className="max-h-48 overflow-y-auto rounded-md border">
        {loading && (
          <div className="p-3 text-center text-xs text-muted-foreground">
            Buscando…
          </div>
        )}
        {!loading && results.length === 0 && (
          <div className="p-3 text-center text-xs text-muted-foreground">
            No hay categorías.
          </div>
        )}
        {!loading &&
          results.map((c) => {
            const checked = selectedIds.includes(c.id);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => toggle(c)}
                className="flex w-full items-center gap-2 border-b p-2 text-left last:border-b-0 hover:bg-accent"
              >
                <Folder className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.productCount} producto{c.productCount === 1 ? "" : "s"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="ml-2 pointer-events-none"
                />
              </button>
            );
          })}
      </div>
    </div>
  );
}
