"use client";

import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ProductPriceProps {
  initialPrice: number;
  initialComparePrice?: number | null;
  hasVariants: boolean;
}

export default function ProductPrice({
  initialPrice,
  initialComparePrice,
  hasVariants,
}: ProductPriceProps) {
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [currentComparePrice, setCurrentComparePrice] = useState(initialComparePrice);

  useEffect(() => {
    if (!hasVariants) return;

    // Escuchar evento de cambio de variante
    const handleVariantChange = (event: CustomEvent) => {
      const { price, compareAtPrice } = event.detail;
      setCurrentPrice(price);
      setCurrentComparePrice(compareAtPrice);
    };

    window.addEventListener("variant-changed" as any, handleVariantChange);

    return () => {
      window.removeEventListener("variant-changed" as any, handleVariantChange);
    };
  }, [hasVariants]);

  const discountPercentage = currentComparePrice
    ? Math.round(((currentComparePrice - currentPrice) / currentComparePrice) * 100)
    : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl font-bold">
        {formatPrice(currentPrice)}
      </span>
      {currentComparePrice && (
        <>
          <span className="text-xl text-muted-foreground line-through">
            {formatPrice(currentComparePrice)}
          </span>
          <Badge variant="secondary">
            {discountPercentage}% OFF
          </Badge>
        </>
      )}
    </div>
  );
}