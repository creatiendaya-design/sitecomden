"use client";

import { useTracking } from "@/hooks/useTracking";

interface ProductCardTrackingProps {
  product: {
    id: string;
    name: string;
    price: number;
    slug: string;
  };
  onAddToCart?: () => void;
  children: (handleAddToCart: () => void) => React.ReactNode;
}

export default function ProductCardTracking({
  product,
  onAddToCart,
  children,
}: ProductCardTrackingProps) {
  const { trackEvent } = useTracking();

  const handleAddToCart = () => {
    // Track AddToCart
    trackEvent("AddToCart", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: product.price,
      currency: "PEN",
      contents: [
        {
          id: product.id,
          quantity: 1,
          item_price: product.price,
        },
      ],
    });

    // Ejecutar callback original si existe
    if (onAddToCart) {
      onAddToCart();
    }
  };

  return <>{children(handleAddToCart)}</>;
}