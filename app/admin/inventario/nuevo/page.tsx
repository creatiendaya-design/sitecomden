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
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createInventoryMovement } from "@/actions/inventory";

interface Product {
  id: string;
  name: string;
  sku?: string;
  hasVariants: boolean;
  variants: {
    id: string;
    sku: string;
    options: Record<string, string>;
  }[];
}

export default function NewInventoryMovementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    productId: searchParams.get("productId") || "",
    variantId: "",
    type: "PURCHASE" as "PURCHASE" | "ADJUSTMENT" | "DAMAGE" | "RETURN",
    quantity: "",
    reason: "",
    reference: "",
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
    if (formData.productId) {
      fetch(`/api/admin/products/${formData.productId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSelectedProduct(data.product);
          }
        });
    }
  }, [formData.productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const quantity = parseInt(formData.quantity);

      if (isNaN(quantity)) {
        toast({
          title: "Error",
          description: "La cantidad debe ser un número válido",
        });
        setLoading(false);
        return;
      }

      // Para tipos de movimiento que reducen stock, hacer la cantidad negativa
      const adjustedQuantity =
        formData.type === "DAMAGE" ? -Math.abs(quantity) : quantity;

      const result = await createInventoryMovement({
        productId: formData.variantId ? undefined : formData.productId,
        variantId: formData.variantId || undefined,
        type: formData.type,
        quantity: adjustedQuantity,
        reason: formData.reason || undefined,
        reference: formData.reference || undefined,
      });

      if (result.success) {
        toast({
          title: "Movimiento creado",
          description: "El movimiento de inventario se registró correctamente",
        });
        router.push(`/admin/inventario/${formData.productId}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al crear movimiento",
        });
      }
    } catch (error) {
      console.error("Error creating movement:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold">Nuevo Movimiento</h1>
          <p className="text-muted-foreground">
            Registra compras, ajustes o daños de inventario
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Movimiento</CardTitle>
        </CardHeader>
        <CardContent>
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
                        }}
                        className="w-full rounded-lg p-3 text-left hover:bg-slate-100"
                      >
                        <p className="font-medium">{product.name}</p>
                        {product.sku && (
                          <p className="text-sm text-muted-foreground">
                            SKU: {product.sku}
                          </p>
                        )}
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
                      setFormData({ ...formData, productId: "", variantId: "" });
                      setSelectedProduct(null);
                    }}
                  >
                    Cambiar
                  </Button>
                </div>

                {/* Variant Selection */}
                {selectedProduct.hasVariants &&
                  selectedProduct.variants.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="variant">Variante</Label>
                      <Select
                        value={formData.variantId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, variantId: value })
                        }
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
                                .join(", ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
              </div>
            )}

            {/* Movement Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Movimiento</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PURCHASE">
                    Compra / Entrada de Stock
                  </SelectItem>
                  <SelectItem value="RETURN">
                    Devolución de Cliente
                  </SelectItem>
                  <SelectItem value="ADJUSTMENT">
                    Ajuste Manual
                  </SelectItem>
                  <SelectItem value="DAMAGE">
                    Daño / Pérdida / Merma
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.type === "DAMAGE"
                  ? "Reducirá el stock automáticamente"
                  : "Incrementará el stock automáticamente"}
              </p>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Cantidad {formData.type === "DAMAGE" ? "(a reducir)" : ""}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="Ej: 50"
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo / Descripción</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Ej: Compra a proveedor XYZ, Producto dañado en transporte, etc."
                rows={3}
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">
                Referencia (Opcional)
              </Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) =>
                  setFormData({ ...formData, reference: e.target.value })
                }
                placeholder="Ej: Factura #12345, Orden de compra #XYZ"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !formData.productId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Movimiento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}