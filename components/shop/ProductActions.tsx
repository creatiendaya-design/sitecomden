"use client";

import { useState, useEffect } from "react";
import VariantSelector from "@/components/shop/VariantSelector";
import AddToCartButton from "@/components/shop/AddToCartButton";

interface ProductActionsProps {
  product: any;
  variants: any[];
  options: any[];
}

export default function ProductActions({
  product,
  variants,
  options,
}: ProductActionsProps) {
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  // ✅ FUNCIÓN PARA NOTIFICAR CAMBIO DE PRECIO
  const notifyPriceChange = (variant: any) => {
    if (!variant || !variant.price) return;
    
    console.log("📢 Actualizando precio principal a:", variant.price);
    
    window.dispatchEvent(
      new CustomEvent("variant-changed", {
        detail: {
          price: Number(variant.price),
          compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
        },
      })
    );
  };

  // ✅ DISPARAR EVENTO CUANDO CAMBIE LA VARIANTE SELECCIONADA
  useEffect(() => {
    if (selectedVariant) {
      notifyPriceChange(selectedVariant);
    }
  }, [selectedVariant]);

  // Calcular stock total
  const totalStock = product.hasVariants
    ? variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;

  const inStock = totalStock > 0;

  return (
    <div className="space-y-6">
      {/* Variant Selector */}
      {product.hasVariants && options.length > 0 && (
        <VariantSelector
          product={product}
          variants={variants}
          options={options}
          onVariantChange={setSelectedVariant}
        />
      )}

      {/* Add to Cart */}
      <AddToCartButton
        product={product}
        variants={variants}
        selectedVariant={selectedVariant}
        disabled={!inStock}
      />

      {!inStock && (
        <p className="text-center text-sm text-destructive">
          Este producto está agotado
        </p>
      )}
    </div>
  );
}