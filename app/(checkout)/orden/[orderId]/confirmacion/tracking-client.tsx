"use client";

import { useEffect } from "react";
import { useTracking } from "@/hooks/useTracking";

interface TrackingClientProps {
  orderNumber: string;
  total: number;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
  }>;
}

export default function TrackingClient({
  orderNumber,
  total,
  items,
}: TrackingClientProps) {
  const { trackEvent } = useTracking();

  useEffect(() => {
    // ✅ Mapear items para usar 'item_price' en lugar de 'price'
    const trackingItems = items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      item_price: item.price, // ✅ Renombrar price a item_price
    }));

    // Track Purchase event (client-side)
    trackEvent("Purchase", {
      value: total,
      currency: "PEN",
      transaction_id: orderNumber,
      contents: trackingItems, // ✅ Usar trackingItems
      num_items: items.reduce((acc, item) => acc + item.quantity, 0),
    });

    // También enviar a Google Ads si está configurado
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "conversion", {
        send_to: "AW-CONVERSION_ID/CONVERSION_LABEL", // Se configurará dinámicamente
        value: total,
        currency: "PEN",
        transaction_id: orderNumber,
      });
    }
  }, []); // Solo ejecutar una vez al montar

  return null; // Este componente solo hace tracking
}