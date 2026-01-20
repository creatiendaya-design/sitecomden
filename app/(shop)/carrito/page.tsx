"use client";

import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/image-utils";
import { checkCartStock } from "@/actions/stock";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Minus, Plus, Trash2, ShoppingBag, AlertTriangle, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotalPrice, getTotalItems } =
    useCartStore();
  
  const [stockCheck, setStockCheck] = useState<{
    loading: boolean;
    errors: string[];
    itemsStatus: Record<string, { available: boolean; currentStock: number; message?: string }>;
  }>({
    loading: false,
    errors: [],
    itemsStatus: {},
  });

  // Verificar stock al cargar la página
  useEffect(() => {
    if (items.length > 0) {
      verifyStock();
    }
  }, []);

  const verifyStock = async () => {
    setStockCheck({ loading: true, errors: [], itemsStatus: {} });

    const stockItems = items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
    }));

    const result = await checkCartStock(stockItems);

    const itemsStatus: Record<string, { available: boolean; currentStock: number; message?: string }> = {};
    result.items.forEach((item) => {
      itemsStatus[item.id] = {
        available: item.available,
        currentStock: item.currentStock,
        message: item.message,
      };
    });

    setStockCheck({
      loading: false,
      errors: result.errors,
      itemsStatus,
    });
  };

  // Helper para obtener la URL de imagen correcta
  const getItemImage = (item: any) => {
    if (typeof item.image === 'string') {
      return item.image;
    }
    if (item.image) {
      return getProductImageUrl(item.image);
    }
    return null;
  };

  if (items.length === 0) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-md text-center">
          <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Tu carrito está vacío</h1>
          <p className="mt-2 text-muted-foreground">
            Agrega productos para comenzar tu compra
          </p>
          <Button asChild className="mt-6">
            <Link href="/productos">Ver Productos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasStockErrors = stockCheck.errors.length > 0;
  const canProceedToCheckout = !hasStockErrors && !stockCheck.loading;

  return (
    <div className="container py-8 mx-auto">
      <h1 className="mb-8 text-3xl font-bold">Carrito de Compras</h1>

      {/* Alertas de stock */}
      {hasStockErrors && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Problemas con el stock:</div>
            <ul className="list-disc list-inside space-y-1">
              {stockCheck.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={verifyStock}
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Verificar nuevamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => {
              const imageUrl = getItemImage(item);
              const itemStatus = stockCheck.itemsStatus[item.id];
              const hasStockIssue = itemStatus && !itemStatus.available;
              const lowStock = itemStatus && itemStatus.currentStock > 0 && itemStatus.currentStock <= 10;
              
              return (
                <Card key={item.id} className={`p-4 ${hasStockIssue ? 'border-destructive' : ''}`}>
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.name}
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
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.variantName && (
                            <p className="text-sm text-muted-foreground">
                              {item.variantName}
                            </p>
                          )}
                          
                          {/* Stock status badges */}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {hasStockIssue && (
                              <Badge variant="destructive" className="text-xs">
                                {itemStatus.message || "Sin stock"}
                              </Badge>
                            )}
                            {!hasStockIssue && lowStock && (
                              <Badge variant="secondary" className="text-xs">
                                Solo quedan {itemStatus.currentStock} unidades
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newQty = item.quantity + 1;
                              const maxAllowed = itemStatus 
                                ? Math.min(item.maxStock, itemStatus.currentStock)
                                : item.maxStock;
                              
                              if (newQty <= maxAllowed) {
                                updateQuantity(item.id, newQty);
                              }
                            }}
                            disabled={
                              item.quantity >= item.maxStock ||
                              (itemStatus && item.quantity >= itemStatus.currentStock)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(item.price)} c/u
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Continue Shopping */}
          <Button variant="outline" asChild className="mt-6">
            <Link href="/productos">← Seguir Comprando</Link>
          </Button>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="p-6 sticky top-24">
            <h2 className="text-xl font-semibold">Resumen del Pedido</h2>
            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal ({getTotalItems()}{" "}
                  {getTotalItems() === 1 ? "producto" : "productos"})
                </span>
                <span className="font-medium">
                  {formatPrice(getTotalPrice())}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envío</span>
                <span className="font-medium">Calculado en checkout</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(getTotalPrice())}</span>
            </div>

            <Button 
              asChild 
              size="lg" 
              className="mt-6 w-full"
              disabled={!canProceedToCheckout}
            >
              <Link href="/checkout">
                {stockCheck.loading ? "Verificando stock..." : "Proceder al Pago"}
              </Link>
            </Button>

            {!canProceedToCheckout && !stockCheck.loading && (
              <p className="mt-3 text-center text-xs text-destructive">
                Corrige los problemas de stock para continuar
              </p>
            )}

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Métodos de pago: Yape, Plin, Tarjeta, PayPal
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}