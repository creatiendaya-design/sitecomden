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
import { Edit, Eye, Trash2, Pencil, Loader2 } from "lucide-react";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import BulkAssignCodTemplateModal from "@/components/admin/products/BulkAssignCodTemplateModal";
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
  const [codAssignOpen, setCodAssignOpen] = useState(false);
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
        <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border bg-background px-3 py-2.5 sm:px-4 sm:py-3 shadow-md mb-3">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <span className="text-sm font-medium">
              {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden h-7 px-2"
              onClick={() => setSelected(new Set())}
            >
              Limpiar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setSelected(new Set())}
            >
              Deseleccionar
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-initial">
                <Link href={`/admin/productos/bulk-edit?ids=${[...selected].join(",")}`}>
                  <Pencil className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Editar seleccionados</span>
                  <span className="sm:hidden ml-1.5">Editar</span>
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCodAssignOpen(true)}
                className="flex-1 sm:flex-initial"
              >
                <span className="hidden sm:inline">Asignar plantilla COD</span>
                <span className="sm:hidden">Plantilla COD</span>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDialogOpen(true)}
                className="flex-1 sm:flex-initial"
              >
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Eliminar seleccionados</span>
                <span className="sm:hidden ml-1.5">Eliminar</span>
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

      <div className="divide-y sm:divide-y-0 sm:space-y-3 -mx-2 sm:mx-0 mt-2 sm:mt-3">
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
          const imgUrl = getProductImageUrl(product.images as any);
          const categoryLine =
            product.categories.length > 0
              ? product.categories.map((pc) => pc.category.name).join(", ")
              : "Sin categoría";
          const lowStock = totalStock <= 5;

          return (
            <div key={product.id}>
              {/* ============ MOBILE: compact row ============ */}
              <div
                className={`sm:hidden flex items-start gap-2.5 px-2 py-2.5 transition-colors ${
                  isSelected ? "bg-primary/5" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(product.id)}
                  className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer"
                  aria-label={`Seleccionar ${product.name}`}
                />

                <Link
                  href={`/admin/productos/${product.id}`}
                  className="flex items-start gap-2.5 flex-1 min-w-0 active:opacity-70"
                >
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={getProductImageAlt(product.images as any, product.name)}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground text-center px-1">
                        Sin foto
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm leading-snug line-clamp-1 min-w-0">
                        {product.name}
                      </span>
                      <span className="text-sm font-semibold tabular-nums whitespace-nowrap shrink-0">
                        {pricePrefix}
                        {formatPrice(displayPrice)}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate min-w-0">
                        {categoryLine}
                        {product.sku && ` · ${product.sku}`}
                        {product.hasVariants && ` · ${product.variants.length} var`}
                      </span>
                      <span
                        className={`whitespace-nowrap tabular-nums shrink-0 ${
                          lowStock ? "text-amber-600 font-medium" : ""
                        }`}
                      >
                        Stock: {totalStock}
                      </span>
                    </div>

                    {(!product.active || product.featured) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {!product.active && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 px-1.5 leading-none"
                          >
                            Inactivo
                          </Badge>
                        )}
                        {product.featured && (
                          <Badge
                            variant="default"
                            className="text-[10px] h-4 px-1.5 leading-none"
                          >
                            Destacado
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    asChild
                  >
                    <Link
                      href={`/productos/${product.slug}`}
                      target="_blank"
                      aria-label="Ver en tienda"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  {canDelete && (
                    <DeleteProductButton
                      productId={product.id}
                      productName={product.name}
                      variant="ghost"
                      className="h-7 w-7"
                      iconClassName="h-3.5 w-3.5"
                    />
                  )}
                </div>
              </div>

              {/* ============ DESKTOP: original card ============ */}
              <div
                className={`hidden sm:flex sm:items-center gap-4 rounded-lg border p-4 transition-colors ${
                  isSelected ? "bg-primary/5 border-primary/30" : "hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(product.id)}
                  className="h-4 w-4 flex-shrink-0 cursor-pointer self-center"
                  aria-label={`Seleccionar ${product.name}`}
                />

                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={getProductImageAlt(product.images as any, product.name)}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/productos/${product.id}`}
                      className="font-semibold hover:underline truncate"
                    >
                      {product.name}
                    </Link>
                    {!product.active && <Badge variant="secondary">Inactivo</Badge>}
                    {product.featured && <Badge variant="default">Destacado</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {categoryLine}
                    {product.sku && ` • SKU: ${product.sku}`}
                    {product.hasVariants && ` • ${product.variants.length} variantes`}
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-base">
                    {pricePrefix}
                    {formatPrice(displayPrice)}
                  </p>
                  <p className={`text-sm ${lowStock ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                    Stock: {totalStock}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/productos/${product.slug}`} target="_blank">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  {canEdit && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/productos/${product.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {canDelete && (
                    <DeleteProductButton
                      productId={product.id}
                      productName={product.name}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk assign COD template modal */}
      <BulkAssignCodTemplateModal
        open={codAssignOpen}
        onClose={() => setCodAssignOpen(false)}
        selectedIds={[...selected]}
        onApplied={() => {
          setSelected(new Set());
          router.refresh();
        }}
      />

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
