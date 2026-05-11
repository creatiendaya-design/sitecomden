"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, X, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/image-utils";
import CodOrderModal, { type CodOrderItem } from "@/components/shop/CodOrderModal";
import CartFreeGiftsPreview from "@/components/shop/cart/CartFreeGiftsPreview";
import type { CodFormTemplateData, ShippingRestriction } from "@/lib/cod-forms/types";

interface LandingCartDrawerProps {
  template: CodFormTemplateData | null;
  shippingRestriction?: ShippingRestriction | null;
}

export default function LandingCartDrawer({ template, shippingRestriction }: LandingCartDrawerProps) {
  const [open, setOpen] = useState(false);
  const [codOpen, setCodOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const {
    items,
    updateQuantity,
    removeItem,
    getTotalItems,
    getTotalPrice,
    getOriginalSubtotal,
  } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-open drawer when first item is added
  useEffect(() => {
    if (mounted && items.length > 0) {
      setOpen(true);
    }
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const totalItems = getTotalItems();

  const getItemImage = (item: any): string | null => {
    if (typeof item.image === "string") return item.image;
    if (item.image) return getProductImageUrl(item.image);
    return null;
  };

  const codItems: CodOrderItem[] = items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    name: item.name + (item.variantName ? ` (${item.variantName})` : ""),
    price: item.price,
    originalUnitPrice: item.originalUnitPrice,
    image: getItemImage(item) ?? undefined,
    promotionId:
      item.appliedPromotion?.type === "VOLUME"
        ? item.appliedPromotion.promotionId
        : undefined,
    subscriptionOptIn: item.subscriptionOptIn
      ? {
          promotionId: item.subscriptionOptIn.promotionId,
          email: item.subscriptionOptIn.email,
        }
      : undefined,
  }));

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 active:scale-95 transition-transform"
        aria-label="Ver carrito"
      >
        <ShoppingCart className="h-6 w-6" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-600 text-xs font-bold shadow">
            {totalItems > 9 ? "9+" : totalItems}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrito
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalItems} {totalItems === 1 ? "producto" : "productos"})
              </span>
            )}
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            items.map((item) => {
              const imageUrl = getItemImage(item);
              return (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        Sin img
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.variantName && (
                      <p className="text-xs text-muted-foreground">{item.variantName}</p>
                    )}
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <p className="text-sm font-bold text-red-600">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      {item.originalUnitPrice &&
                        item.originalUnitPrice > item.price && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPrice(
                              item.originalUnitPrice * item.quantity
                            )}
                          </p>
                        )}
                    </div>
                    {item.appliedPromotion && (
                      <p className="mt-0.5 inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                        {item.appliedPromotion.tierLabel}
                      </p>
                    )}
                    {item.subscriptionOptIn && (
                      <p className="mt-0.5 ml-1 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        Suscripción
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="h-6 w-6 rounded border flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="h-6 w-6 rounded border flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {items.length > 0 && (
            <div className="px-4 pb-2">
              <CartFreeGiftsPreview
                productIds={items.map((i) => i.productId)}
                subtotal={getOriginalSubtotal()}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-4 py-4 space-y-3 shrink-0">
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-red-600">{formatPrice(getTotalPrice())}</span>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setCodOpen(true);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              🛒 Confirmar pedido
            </button>
          </div>
        )}
      </div>

      {/* COD Modal con todos los ítems del carrito */}
      <CodOrderModal
        open={codOpen}
        onClose={() => setCodOpen(false)}
        items={codItems}
        template={template}
        shippingRestriction={shippingRestriction ?? null}
      />
    </>
  );
}
