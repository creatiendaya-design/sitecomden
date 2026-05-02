// components/customizer/BottomBar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useBuilderStore } from "./store";
import { getPriceBreakdown } from "@/lib/customizer/pricing";
import type { BuilderProduct } from "./CustomizerLayout";

interface Props {
  product: BuilderProduct;
  previewMode: boolean;
  cartItemId: string | null;
}

export function BottomBar({ product, previewMode, cartItemId }: Props) {
  const template = useBuilderStore((s) => s.template);
  const variantId = useBuilderStore((s) => s.variantId);
  const uploading = useBuilderStore((s) => s.uploading);
  const hasContent = useBuilderStore((s) => s.hasContent());

  const variant = product.variants.find((v) => v.id === variantId);
  const basePrice = variant?.price ?? product.basePrice;
  const breakdown = getPriceBreakdown(basePrice, template?.surcharge ?? null);

  const handleAddToCart = async () => {
    // Phase 11 — implementar upload + add a cart store
    alert("Phase 11 — implementar upload y añadir al cart");
  };

  if (previewMode) {
    return (
      <footer className="border-t px-4 py-3 bg-yellow-50 text-center text-sm">
        Modo vista previa (admin) — no se puede añadir al carrito
      </footer>
    );
  }

  return (
    <footer className="border-t px-4 py-3 bg-white flex items-center justify-between">
      <div className="text-sm">
        <span className="text-muted-foreground">S/ {breakdown.base.toFixed(2)}</span>
        {breakdown.surcharge > 0 && (
          <span className="text-muted-foreground ml-1">
            + S/ {breakdown.surcharge.toFixed(2)} personalización
          </span>
        )}
      </div>
      <Button
        size="lg"
        className="bg-red-600 hover:bg-red-700 text-white"
        disabled={!hasContent || uploading}
        onClick={handleAddToCart}
      >
        {uploading
          ? "Subiendo tu diseño…"
          : cartItemId
          ? "Guardar cambios"
          : `Añadir al carrito · S/ ${breakdown.total.toFixed(2)}`}
      </Button>
    </footer>
  );
}
