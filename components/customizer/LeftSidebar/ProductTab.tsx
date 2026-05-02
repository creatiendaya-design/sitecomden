// components/customizer/LeftSidebar/ProductTab.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "../store";
import { SizeGuideDrawer } from "./SizeGuideDrawer";
import type { BuilderProduct } from "../CustomizerLayout";

interface Props {
  product: BuilderProduct;
}

export function ProductTab({ product }: Props) {
  const variantId = useBuilderStore((s) => s.variantId);
  const setVariantId = useBuilderStore((s) => s.setVariantId);
  const template = useBuilderStore((s) => s.template);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const colorOption = product.options.find((o) =>
    o.name.toLowerCase().includes("color")
  );
  const sizeOption = product.options.find(
    (o) =>
      o.name.toLowerCase().includes("talla") ||
      o.name.toLowerCase().includes("size")
  );

  const currentVariant = product.variants.find((v) => v.id === variantId);
  const currentColorName = colorOption
    ? currentVariant?.options[colorOption.name]
    : undefined;
  const currentSizeName = sizeOption
    ? currentVariant?.options[sizeOption.name]
    : undefined;
  const currentColorId = currentColorName
    ? colorOption?.values.find((v) => v.value === currentColorName)?.id
    : undefined;
  const currentSizeId = currentSizeName
    ? sizeOption?.values.find((v) => v.value === currentSizeName)?.id
    : undefined;

  const findVariant = (
    colorValueId: string | undefined,
    sizeValueId: string | undefined
  ) => {
    const colorName = colorValueId
      ? colorOption?.values.find((v) => v.id === colorValueId)?.value
      : undefined;
    const sizeName = sizeValueId
      ? sizeOption?.values.find((v) => v.id === sizeValueId)?.value
      : undefined;
    return product.variants.find(
      (v) =>
        (!colorName || (colorOption && v.options[colorOption.name] === colorName)) &&
        (!sizeName || (sizeOption && v.options[sizeOption.name] === sizeName))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative size-16 flex-shrink-0 bg-muted rounded">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover rounded"
            />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-sm">{product.name}</h3>
          {product.reviewsCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              {product.reviewsAvg.toFixed(1)} · {product.reviewsCount} reseñas
            </div>
          )}
        </div>
      </div>

      {colorOption && (
        <div>
          <label className="text-xs font-medium block mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {colorOption.values.map((cv) => {
              const variant = findVariant(cv.id, currentSizeId);
              const inStock = (variant?.stock ?? 0) > 0;
              return (
                <button
                  key={cv.id}
                  onClick={() => variant && setVariantId(variant.id)}
                  disabled={!inStock}
                  className={`size-8 rounded-full border-2 ${
                    currentColorId === cv.id
                      ? "border-blue-600"
                      : "border-gray-200"
                  } ${!inStock ? "opacity-30" : ""}`}
                  style={{ backgroundColor: cv.swatch ?? "#ccc" }}
                  title={`${cv.value}${!inStock ? " (Agotado)" : ""}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {sizeOption && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium">Talla</label>
            {template?.sizeGuide && (
              <button
                onClick={() => setSizeGuideOpen(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Guía de tallas
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizeOption.values.map((sv) => {
              const variant = findVariant(currentColorId, sv.id);
              const inStock = (variant?.stock ?? 0) > 0;
              return (
                <Button
                  key={sv.id}
                  variant={currentSizeId === sv.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => variant && setVariantId(variant.id)}
                  disabled={!inStock}
                  className={!inStock ? "opacity-30" : ""}
                >
                  {sv.value}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {sizeGuideOpen && template?.sizeGuide && (
        <SizeGuideDrawer
          guide={template.sizeGuide}
          onClose={() => setSizeGuideOpen(false)}
        />
      )}
    </div>
  );
}
