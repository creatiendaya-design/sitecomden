"use client";

/**
 * Admin card to curate the "comprados juntos" (frequently bought together)
 * list for a product. This is the MANUAL side of the hybrid recommender:
 * whatever the admin picks here takes priority over automatic co-purchase
 * inference on the storefront. Leave it empty to let the system decide.
 *
 * Self-contained like ProductPromotionsCard: loads + saves on its own,
 * independent of the main product form submit.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
  Save,
  Package,
} from "lucide-react";
import { searchProductsForPicker } from "@/actions/related-products";
import {
  getProductRelationsForAdmin,
  saveProductRelations,
} from "@/actions/recommendations";
import { toast } from "sonner";

interface PickedProduct {
  id: string;
  name: string;
  price: number;
  mainImage: string | null;
}

interface Props {
  productId: string;
}

export default function ProductRelationsCard({ productId }: Props) {
  const [selected, setSelected] = useState<PickedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProductRelationsForAdmin(productId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSelected(
            res.items.map((i) => ({
              id: i.id,
              name: i.name,
              price: i.price,
              mainImage: i.mainImage,
            })),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const move = (index: number, dir: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  const remove = (id: string) => {
    setSelected((prev) => prev.filter((p) => p.id !== id));
    setDirty(true);
  };

  const applyPicked = (picked: PickedProduct[]) => {
    setSelected((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const additions = picked.filter(
        (p) => p.id !== productId && !seen.has(p.id),
      );
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveProductRelations(
        productId,
        selected.map((p) => p.id),
      );
      if (res.success) {
        toast.success("Productos relacionados guardados");
        setDirty(false);
      } else {
        toast.error(res.error ?? "No se pudo guardar");
      }
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" />
          Comprados juntos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Elige a mano los productos que se sugieren con este. Si lo dejas
          vacío, el sistema los deduce de las compras reales y la categoría.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {selected.length > 0 ? (
              <ul className="space-y-1.5">
                {selected.map((p, index) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border bg-card p-1.5"
                  >
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
                      {p.mainImage ? (
                        <Image
                          src={p.mainImage}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        S/ {p.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Subir"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === selected.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Bajar"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        aria-label={`Quitar ${p.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                Sin selección manual — recomendación automática activa.
              </p>
            )}

            <RelationPickerDialog
              selectedIds={selected.map((p) => p.id)}
              currentProductId={productId}
              onApply={applyPicked}
            />

            {dirty && (
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="mr-2 h-3.5 w-3.5" />
                {saving ? "Guardando…" : "Guardar comprados juntos"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RelationPickerDialog({
  selectedIds,
  currentProductId,
  onApply,
}: {
  selectedIds: string[];
  currentProductId: string;
  onApply: (picked: PickedProduct[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setPending(new Set());
    setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      let cancelled = false;
      setLoading(true);
      searchProductsForPicker(query, 30)
        .then((rows) => {
          if (cancelled) return;
          setResults(
            rows.map((r) => ({
              id: r.id,
              name: r.name,
              price: r.price,
              mainImage: r.mainImage,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) toast.error("Error al buscar");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, 300);
    return () => clearTimeout(handle);
  }, [query, open]);

  const toggle = (id: string) => {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = () => {
    const byId = new Map(results.map((r) => [r.id, r]));
    onApply(
      Array.from(pending)
        .map((id) => byId.get(id))
        .filter((p): p is PickedProduct => Boolean(p)),
    );
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full">
          <Plus className="mr-1 h-3 w-3" />
          Agregar productos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar productos comprados juntos</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o slug…"
            className="pl-8"
            autoFocus
          />
        </div>

        <div className="max-h-[400px] overflow-auto rounded-md border">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {query ? "No hay productos que coincidan." : "No hay productos."}
            </p>
          ) : (
            <ul className="divide-y">
              {results
                .filter(
                  (p) =>
                    p.id !== currentProductId && !selectedIds.includes(p.id),
                )
                .map((p) => {
                  const checked = pending.has(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        className="flex w-full items-center gap-3 p-2 text-left hover:bg-muted"
                      >
                        <Checkbox
                          checked={checked}
                          className="pointer-events-none"
                        />
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                          {p.mainImage ? (
                            <Image
                              src={p.mainImage}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {p.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            S/ {p.price.toFixed(2)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {pending.size}{" "}
            {pending.size === 1 ? "seleccionado" : "seleccionados"}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleApply}>
              Agregar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
