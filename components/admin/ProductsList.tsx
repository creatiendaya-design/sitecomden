"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Eye, Trash2, Loader2 } from "lucide-react";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl, getProductImageAlt } from "@/lib/image-utils";

interface Variant {
  id: string;
  price: number | string;
  stock: number;
}

interface Category {
  category: { name: string };
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  active: boolean;
  featured: boolean;
  basePrice: number | string;
  stock: number;
  hasVariants: boolean;
  images: unknown;
  variants: Variant[];
  categories: Category[];
}

interface ProductsListProps {
  products: Product[];
  canEdit: boolean;
  canDelete: boolean;
}

export default function ProductsList({ products, canEdit, canDelete }: ProductsListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al eliminar");
        return;
      }
      setSelected(new Set());
      setBulkDialogOpen(false);
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setDeleting(false);
    }
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No hay productos que coincidan con los filtros
      </div>
    );
  }

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 flex items-center justify-between rounded-lg border bg-background px-4 py-3 shadow-md mb-3">
          <span className="text-sm font-medium">
            {selected.size} producto{selected.size !== 1 ? "s" : ""} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Deseleccionar
            </Button>
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={() => setBulkDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar seleccionados
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Select all row */}
      <div className="flex items-center gap-3 px-1 pb-2 border-b">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = someSelected; }}
          onChange={toggleAll}
          className="h-4 w-4 cursor-pointer"
          aria-label="Seleccionar todos"
        />
        <span className="text-xs text-muted-foreground">Seleccionar todos</span>
      </div>

      <div className="space-y-3 sm:space-y-4 mt-3">
        {products.map((product) => {
          const totalStock = product.hasVariants
            ? product.variants.reduce((sum, v) => sum + v.stock, 0)
            : product.stock;

          let displayPrice = Number(product.basePrice);
          let pricePrefix = "";
          if (product.hasVariants && product.variants.length > 0) {
            const prices = product.variants.map((v) => Number(v.price));
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            displayPrice = minPrice;
            if (minPrice !== maxPrice) pricePrefix = "Desde ";
          }

          const isSelected = selected.has(product.id);

          return (
            <div
              key={product.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4 transition-colors ${
                isSelected ? "bg-primary/5 border-primary/30" : "hover:bg-slate-50"
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOne(product.id)}
                className="h-4 w-4 flex-shrink-0 cursor-pointer self-start sm:self-center"
                aria-label={`Seleccionar ${product.name}`}
              />

              {/* Mobile Layout */}
              <div className="flex gap-3 sm:hidden flex-1">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                  {getProductImageUrl(product.images as any) ? (
                    <Image
                      src={getProductImageUrl(product.images as any)!}
                      alt={getProductImageAlt(product.images as any, product.name)}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sin imagen</div>
                  )}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <Link href={`/admin/productos/${product.id}`} className="font-semibold text-sm hover:underline line-clamp-2">
                    {product.name}
                  </Link>
                  <div className="flex flex-wrap gap-1">
                    {!product.active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                    {product.featured && <Badge variant="default" className="text-xs">Destacado</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {product.categories.length > 0 ? product.categories.map((pc) => pc.category.name).join(", ") : "Sin categoría"}
                  </div>
                  {product.hasVariants && <div className="text-xs text-muted-foreground">{product.variants.length} variantes</div>}
                </div>
              </div>

              {/* Desktop Image */}
              <div className="hidden sm:block relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                {getProductImageUrl(product.images as any) ? (
                  <Image
                    src={getProductImageUrl(product.images as any)!}
                    alt={getProductImageAlt(product.images as any, product.name)}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sin imagen</div>
                )}
              </div>

              {/* Desktop Info */}
              <div className="hidden sm:block flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/productos/${product.id}`} className="font-semibold hover:underline">
                    {product.name}
                  </Link>
                  {!product.active && <Badge variant="secondary">Inactivo</Badge>}
                  {product.featured && <Badge variant="default">Destacado</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">
                  {product.categories.length > 0 ? product.categories.map((pc) => pc.category.name).join(", ") : "Sin categoría"}
                  {product.sku && ` • SKU: ${product.sku}`}
                  {product.hasVariants && ` • ${product.variants.length} variantes`}
                </div>
              </div>

              {/* Price & Stock + Actions */}
              <div className="flex items-center justify-between sm:block sm:text-right">
                <div>
                  <p className="font-semibold text-sm sm:text-base">
                    {pricePrefix}{formatPrice(displayPrice)}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Stock: {totalStock}</p>
                </div>

                {/* Mobile Actions */}
                <div className="flex gap-2 sm:hidden">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/productos/${product.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                  </Button>
                  {canEdit && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/productos/${product.id}`}><Edit className="h-4 w-4" /></Link>
                    </Button>
                  )}
                  {canDelete && <DeleteProductButton productId={product.id} productName={product.name} />}
                </div>
              </div>

              {/* Desktop Actions */}
              <div className="hidden sm:flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/productos/${product.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                </Button>
                {canEdit && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/productos/${product.id}`}><Edit className="h-4 w-4" /></Link>
                  </Button>
                )}
                {canDelete && <DeleteProductButton productId={product.id} productName={product.name} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selected.size} producto{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta acción no se puede deshacer. Se eliminarán todas sus variantes e imágenes.</p>
              <p className="text-muted-foreground text-sm">Las órdenes existentes mantendrán su historial.</p>
              {error && (
                <p className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</> : `Eliminar ${selected.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
