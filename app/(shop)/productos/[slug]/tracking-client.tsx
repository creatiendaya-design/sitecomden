"use client";

import { useEffect } from "react";
import { useTracking } from "@/hooks/useTracking";

interface ProductTrackingProps {
  product: {
    id: string;
    name: string;
    price: number;
    categoryName?: string;
    sku?: string;
  };
}

export default function ProductTracking({ product }: ProductTrackingProps) {
  const { trackEvent } = useTracking();

  useEffect(() => {
    // Track ViewContent cuando se carga la página
    trackEvent("ViewContent", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      content_category: product.categoryName,
      value: product.price,
      currency: "PEN",
      contents: [
        {
          id: product.sku || product.id,
          quantity: 1,
          item_price: product.price,
        },
      ],
    });

    console.log("📊 ViewContent tracked:", product.name);
  }, [product.id]); // Solo ejecutar cuando cambia el producto

  return null; // Este componente solo hace tracking, no renderiza nada
}