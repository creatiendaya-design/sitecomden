"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart";

/**
 * Vacía el carrito al llegar a la confirmación.
 *
 * Los pagos por pasarela externa (Mercado Pago / PayPal) NO vacían el carrito al
 * saltar a la pasarela: así, si el cliente se arrepiente y vuelve atrás sin
 * pagar, conserva su carrito y sus datos (igual que Shopify). Recién aquí —ya de
 * vuelta del pago, en la página de "gracias"— lo limpiamos. Solo se monta para
 * esos métodos (los demás ya vacían el carrito al confirmar el pedido).
 */
export default function ClearCartOnConfirmation() {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return null;
}
