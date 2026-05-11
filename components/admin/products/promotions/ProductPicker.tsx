"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchProductsForPromotion } from "@/actions/promotions";

interface PickerProduct {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  basePrice: number;
}

interface ProductPickerProps {
  excludeProductIds?: string[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
}

export default function ProductPicker({
  excludeProductIds,
  selectedIds,
  onChange,
  multi = true,
}: ProductPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const hydrated = useRef(false);
  const excludeKey = (excludeProductIds ?? []).join(",");

  useEffect(() => {
    let cancelled = false;
    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchProductsForPromotion(query, excludeProductIds);
        if (!cancelled) setResults(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, excludeKey]);

  useEffect(() => {
    if (hydrated.current) return;
    if (selectedIds.length === 0) {
      hydrated.current = true;
      return;
    }
    hydrated.current = true;
    (async () => {
      const data = await searchProductsForPromotion("", excludeProductIds);
      const matched = data.filter((p) => selectedIds.includes(p.id));
      setSelectedProducts(matched);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, excludeKey]);

  const togglePick = (product: PickerProduct) => {
    if (selectedIds.includes(product.id)) {
      onChange(selectedIds.filter((id) => id !== product.id));
      setSelectedProducts((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      const next = multi ? [...selectedIds, product.id] : [product.id];
      onChange(next);
      setSelectedProducts((prev) => (multi ? [...prev, product] : [product]));
    }
  };

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-3">
      {selectedProducts.length > 0 && (
        <div className="space-y-1.5">
          {selectedProducts.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-md border bg-muted/30 p-2"
            >
              <div className="relative h-10 w-10 overflow-hidden rounded bg-muted">
                {p.image && (
                  <Image src={p.image} alt={p.name} fill className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  S/ {p.basePrice.toFixed(2)}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => remove(p.id)}
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
          placeholder="Buscar producto…"
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
            No hay productos.
          </div>
        )}
        {!loading &&
          results.map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => togglePick(p)}
                className="flex w-full items-center gap-2 border-b p-2 text-left last:border-b-0 hover:bg-accent"
              >
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
                  {p.image && (
                    <Image src={p.image} alt={p.name} fill className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    S/ {p.basePrice.toFixed(2)}
                  </div>
                </div>
                <input
                  type={multi ? "checkbox" : "radio"}
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
