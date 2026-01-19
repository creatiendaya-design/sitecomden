"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { adjustStock } from "@/actions/inventory";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Product {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  hasVariants: boolean;
  variants: {
    id: string;
    sku: string;
    options: Record<string, string>;
    stock: number;
  }[];
}

export default function AdjustStockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    productId: searchParams.get("productId") || "",
    variantId: "",
    newStock: "",
    reason: "",
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  // Buscar productos
  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      setProducts([]);
      return;
    }

    setSearchingProduct(true);
    try {
      const response = await fetch(
        `/api/admin/products/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error("Error searching products:", error);
    } finally {
      setSearchingProduct(false);
    }
  };

  // Cargar producto pre-seleccionado
  useEffect(() => {
    if (formData.productId && !selectedProduct) {
      setLoadingProduct(true);
      fetch(`/api/admin/products/${formData.productId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSelectedProduct(data.product);
            // Si no tiene variantes, establecer stock actual
            if (!data.product.hasVariants) {
              setCurrentStock(data.product.stock);
            }
          }
        })
        .finally(() => setLoadingProduct(false));
    }
  }, [formData.productId]);

  // Actualizar stock actual cuando se selecciona variante
  useEffect(() => {
    if (formData.variantId && selectedProduct) {
      const variant = selectedProduct.variants.find(
        (v) => v.id === formData.variantId
      );
      if (variant) {
        setCurrentStock(variant.stock);
      }
    }
  }, [formData.variantId, selectedProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newStock = parseInt(formData.newStock);

      if (isNaN(newStock) || newStock < 0) {
        toast({
          title: "Error",
          description: "El stock debe ser un número válido mayor o igual a 0",
        });
        setLoading(false);
        return;
      }

      if (!formData.reason.trim()) {
        toast({
          title: "Error",
          description: "Debes especificar un motivo para el ajuste",
        });
        setLoading(false);
        return;
      }

      const result = await adjustStock({
        productId: formData.variantId ? undefined : formData.productId,
        variantId: formData.variantId || undefined,
        newStock: newStock,
        reason: formData.reason,
      });

      if (result.success) {
        toast({
          title: "Stock ajustado",
          description: result.message || "El stock se ajustó correctamente",
        });
        router.push(`/admin/inventario/${formData.productId}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al ajustar stock",
        });
      }
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
      });
    } finally {
      setLoading(false);
    }
  };

  const stockDifference =
    currentStock !== null && formData.newStock
      ? parseInt(formData.newStock) - currentStock
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/inventario">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Ajustar Stock</h1>
          <p className="text-muted-foreground">
            Establece el stock a un valor específico
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          El ajuste de stock establece el inventario a un valor específico.
          Usa esto para corregir discrepancias encontradas en inventarios físicos.
        </AlertDescription>
      </Alert>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Ajuste</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProduct ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Search */}
              {!formData.productId && (
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar Producto</Label>
                  <Input
                    id="search"
                    placeholder="Escribe el nombre o SKU del producto..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchProducts(e.target.value);
                    }}
                  />
                  {searchingProduct && (
                    <p className="text-sm text-muted-foreground">Buscando...</p>
                  )}
                  {products.length > 0 && (
                    <div className="mt-2 space-y-2 rounded-lg border p-2">
                      {products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, productId: product.id });
                            setSelectedProduct(product);
                            setProducts([]);
                            setSearchQuery("");
                            if (!product.hasVariants) {
                              setCurrentStock(product.stock);
                            }
                          }}
                          className="w-full rounded-lg p-3 text-left hover:bg-slate-100"
                        >
                          <p className="font-medium">{product.name}</p>
                          {product.sku && (
                            <p className="text-sm text-muted-foreground">
                              SKU: {product.sku}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Stock actual: {product.stock}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Product */}
              {selectedProduct && (
                <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedProduct.name}</p>
                      {selectedProduct.sku && (
                        <p className="text-sm text-muted-foreground">
                          SKU: {selectedProduct.sku}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          productId: "",
                          variantId: "",
                          newStock: "",
                          reason: "",
                        });
                        setSelectedProduct(null);
                        setCurrentStock(null);
                      }}
                    >
                      Cambiar
                    </Button>
                  </div>

                  {/* Variant Selection */}
                  {selectedProduct.hasVariants &&
                    selectedProduct.variants.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="variant">Variante *</Label>
                        <Select
                          value={formData.variantId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, variantId: value })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una variante" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedProduct.variants.map((variant) => (
                              <SelectItem key={variant.id} value={variant.id}>
                                {variant.sku} -{" "}
                                {Object.entries(variant.options)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(", ")}{" "}
                                (Stock actual: {variant.stock})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                  {/* Current Stock Display */}
                  {currentStock !== null && (
                    <div className="rounded-lg border bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Stock Actual
                          </p>
                          <p className="text-3xl font-bold">{currentStock}</p>
                        </div>
                        {stockDifference !== null && (
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Diferencia
                            </p>
                            <p
                              className={`text-2xl font-bold ${
                                stockDifference > 0
                                  ? "text-green-600"
                                  : stockDifference < 0
                                  ? "text-red-600"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {stockDifference > 0 ? "+" : ""}
                              {stockDifference}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* New Stock */}
              {(currentStock !== null ||
                (selectedProduct && !selectedProduct.hasVariants)) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="newStock">Nuevo Stock *</Label>
                    <Input
                      id="newStock"
                      type="number"
                      min="0"
                      required
                      value={formData.newStock}
                      onChange={(e) =>
                        setFormData({ ...formData, newStock: e.target.value })
                      }
                      placeholder="Ej: 45"
                    />
                    <p className="text-xs text-muted-foreground">
                      El stock se establecerá exactamente a este valor
                    </p>
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo del Ajuste *</Label>
                    <Textarea
                      id="reason"
                      required
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                      placeholder="Ej: Ajuste por inventario físico, diferencia encontrada en almacén..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Explica por qué se está ajustando el stock
                    </p>
                  </div>

                  {/* Preview */}
                  {stockDifference !== null && formData.newStock && (
                    <Alert
                      className={
                        stockDifference > 0
                          ? "border-green-200 bg-green-50"
                          : stockDifference < 0
                          ? "border-red-200 bg-red-50"
                          : ""
                      }
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Resumen del ajuste:</strong>
                        <br />
                        Stock actual: {currentStock} →{" "}
                        <strong>Nuevo stock: {formData.newStock}</strong>
                        <br />
                        {stockDifference > 0 ? (
                          <span className="text-green-700">
                            Se agregarán {stockDifference} unidades
                          </span>
                        ) : stockDifference < 0 ? (
                          <span className="text-red-700">
                            Se removerán {Math.abs(stockDifference)} unidades
                          </span>
                        ) : (
                          <span>No habrá cambios en el stock</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Submit */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        loading ||
                        !formData.productId ||
                        !formData.newStock ||
                        !formData.reason ||
                        (selectedProduct?.hasVariants && !formData.variantId)
                      }
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Ajustar Stock
                    </Button>
                  </div>
                </>
              )}

              {/* Help Text */}
              {selectedProduct &&
                selectedProduct.hasVariants &&
                !formData.variantId && (
                  <p className="text-center text-sm text-muted-foreground">
                    Selecciona una variante para continuar
                  </p>
                )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}