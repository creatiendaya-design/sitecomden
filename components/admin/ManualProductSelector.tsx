"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X } from "lucide-react";
import Image from "next/image";
import { getProductImageUrl } from "@/lib/image-utils";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  basePrice: number;
  images: any;
  active: boolean;
}

interface ManualProductSelectorProps {
  selectedProductIds: string[];
  onSelectionChange: (productIds: string[]) => void;
}

export default function ManualProductSelector({
  selectedProductIds,
  onSelectionChange,
}: ManualProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  // Buscar productos
  const searchProducts = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/products/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error buscando productos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar productos seleccionados inicialmente
  useEffect(() => {
    if (selectedProductIds.length > 0) {
      fetch(`/api/admin/products/by-ids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedProductIds }),
      })
        .then((res) => res.json())
        .then((data) => setSelectedProducts(data.products || []))
        .catch(console.error);
    }
  }, []);

  const toggleProduct = (product: Product) => {
    const isSelected = selectedProductIds.includes(product.id);
    
    if (isSelected) {
      // Remover
      const newIds = selectedProductIds.filter((id) => id !== product.id);
      const newProducts = selectedProducts.filter((p) => p.id !== product.id);
      onSelectionChange(newIds);
      setSelectedProducts(newProducts);
    } else {
      // Agregar
      const newIds = [...selectedProductIds, product.id];
      const newProducts = [...selectedProducts, product];
      onSelectionChange(newIds);
      setSelectedProducts(newProducts);
    }
  };

  const removeProduct = (productId: string) => {
    const newIds = selectedProductIds.filter((id) => id !== productId);
    const newProducts = selectedProducts.filter((p) => p.id !== productId);
    onSelectionChange(newIds);
    setSelectedProducts(newProducts);
  };

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                searchProducts();
              }
            }}
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={searchProducts} disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      {/* Productos seleccionados */}
      {selectedProducts.length > 0 && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 font-semibold">
            {selectedProducts.length} producto(s) seleccionado(s)
          </h4>
          <div className="space-y-2">
            {selectedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                {/* Imagen */}
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-slate-100">
                  {getProductImageUrl(product.images) ? (
                    <Image
                      src={getProductImageUrl(product.images)!}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Sin imagen
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className="text-sm font-medium">{product.name}</p>
                  {product.sku && (
                    <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                  )}
                </div>

                {/* Precio */}
                <p className="text-sm font-semibold">
                  S/ {product.basePrice.toFixed(2)}
                </p>

                {/* Botón remover */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProduct(product.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultados de búsqueda */}
      {products.length > 0 && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 font-semibold">Resultados de búsqueda</h4>
          <div className="space-y-2">
            {products.map((product) => {
              const isSelected = selectedProductIds.includes(product.id);
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-md border p-2 hover:bg-slate-50"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleProduct(product)}
                  />

                  {/* Imagen */}
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-slate-100">
                    {getProductImageUrl(product.images) ? (
                      <Image
                        src={getProductImageUrl(product.images)!}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{product.name}</p>
                    {product.sku && (
                      <p className="text-xs text-muted-foreground">
                        SKU: {product.sku}
                      </p>
                    )}
                  </div>

                  {/* Precio */}
                  <p className="text-sm font-semibold">
                    S/ {product.basePrice.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {products.length === 0 && searchQuery && !loading && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No se encontraron productos. Intenta con otra búsqueda.
        </p>
      )}
    </div>
  );
}