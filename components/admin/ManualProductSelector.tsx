"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, X, Package } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
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
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);

  // Cargar productos seleccionados al montar
  useEffect(() => {
    if (selectedProductIds.length > 0) {
      fetchSelectedProducts();
    }
  }, [selectedProductIds]);

  // Fetch productos seleccionados para mostrarlos
  const fetchSelectedProducts = async () => {
    try {
      const response = await fetch("/api/admin/products/by-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedProductIds }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedProducts(data.products);
      }
    } catch (error) {
      console.error("Error fetching selected products:", error);
    }
  };

  // Cargar TODOS los productos cuando se abre el modal
  const fetchAllProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/products/all");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setTempSelectedIds([...selectedProductIds]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal y cargar productos
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchAllProducts();
      setSearchQuery("");
    }
  };

  // Toggle selección de producto
  const toggleProduct = (productId: string) => {
    setTempSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  // Seleccionar todos los productos filtrados
  const selectAll = () => {
    const filteredIds = filteredProducts.map((p) => p.id);
    const newIds = [...new Set([...tempSelectedIds, ...filteredIds])];
    setTempSelectedIds(newIds);
  };

  // Deseleccionar todos los productos filtrados
  const deselectAll = () => {
    const filteredIds = filteredProducts.map((p) => p.id);
    setTempSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
  };

  // Aplicar selección
  const handleApplySelection = () => {
    onSelectionChange(tempSelectedIds);
    setOpen(false);
    
    // Actualizar la lista de productos seleccionados mostrados
    const newSelectedProducts = products.filter((p) =>
      tempSelectedIds.includes(p.id)
    );
    setSelectedProducts(newSelectedProducts);
  };

  // Remover producto de la selección
  const removeProduct = (productId: string) => {
    const newIds = selectedProductIds.filter((id) => id !== productId);
    onSelectionChange(newIds);
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Filtrar productos por búsqueda
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Lista de productos seleccionados */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Productos seleccionados ({selectedProducts.length})
            </p>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto rounded-lg border p-2">
            {selectedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                {/* Imagen */}
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border bg-slate-50">
                  {getProductImageUrl(product.images) ? (
                    <Image
                      src={getProductImageUrl(product.images)!}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-6 w-6 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {product.sku && (
                      <p className="text-xs text-muted-foreground">
                        SKU: {product.sku}
                      </p>
                    )}
                    <p className="text-xs font-medium">
                      S/. {product.basePrice.toFixed(2)}
                    </p>
                    {!product.active && (
                      <Badge variant="secondary" className="text-xs">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Botón remover */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProduct(product.id)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón para abrir modal */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            <Search className="mr-2 h-4 w-4" />
            Buscar productos
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Seleccionar productos</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Barra de búsqueda */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos por nombre o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Acciones de selección masiva */}
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  {tempSelectedIds.length} productos seleccionados
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    disabled={loading}
                  >
                    Seleccionar todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                    disabled={loading}
                  >
                    Deseleccionar todos
                  </Button>
                </div>
              </div>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Cargando productos...
                    </p>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Package className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {searchQuery
                        ? "No se encontraron productos"
                        : "No hay productos disponibles"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredProducts.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={tempSelectedIds.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />

                      {/* Imagen */}
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded border bg-slate-50">
                        {getProductImageUrl(product.images) ? (
                          <Image
                            src={getProductImageUrl(product.images)!}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-8 w-8 text-slate-300" />
                          </div>
                        )}
                      </div>

                      {/* Info del producto */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {product.sku}
                            </p>
                          )}
                          <p className="text-xs font-medium">
                            S/. {product.basePrice.toFixed(2)}
                          </p>
                          {!product.active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactivo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleApplySelection}
                className="flex-1"
                disabled={loading}
              >
                Agregar productos ({tempSelectedIds.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedProducts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay productos seleccionados. Haz clic en &quot;Buscar productos&quot; para
          comenzar.
        </p>
      )}
    </div>
  );
}