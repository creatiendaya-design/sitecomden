// components/customizer/LeftSidebar/ProductTab.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "../store";
import { SizeGuideModal } from "@/components/shop/size-guide/SizeGuideModal";
import type { BuilderProduct } from "../CustomizerLayout";

interface Props {
  product: BuilderProduct;
}

type SelectionMap = Record<string, string>; // optionId -> valueId

export function ProductTab({ product }: Props) {
  const variantId = useBuilderStore((s) => s.variantId);
  const setVariantId = useBuilderStore((s) => s.setVariantId);
  const template = useBuilderStore((s) => s.template);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // Derive current selection map (optionId -> valueId) from the current variant
  const currentVariant = product.variants.find((v) => v.id === variantId);
  const currentSelection: SelectionMap = {};
  if (currentVariant) {
    for (const opt of product.options) {
      const variantValueName = currentVariant.options[opt.name];
      if (!variantValueName) continue;
      const matched = opt.values.find((v) => v.value === variantValueName);
      if (matched) currentSelection[opt.id] = matched.id;
    }
  }

  // Helper: when the user clicks a value for one option, find the variant that
  // matches the new full selection (existing selections + the new one).
  const pickValue = (optionId: string, valueId: string) => {
    const next: SelectionMap = { ...currentSelection, [optionId]: valueId };

    // Translate selection map (id-based) into name-based map for variant lookup
    const nameMap: Record<string, string> = {};
    for (const opt of product.options) {
      const vid = next[opt.id];
      if (!vid) continue;
      const v = opt.values.find((x) => x.id === vid);
      if (v) nameMap[opt.name] = v.value;
    }

    const matchingVariant = product.variants.find((v) =>
      Object.entries(nameMap).every(([optName, valName]) => v.options[optName] === valName)
    );
    if (matchingVariant) setVariantId(matchingVariant.id);
  };

  // Stock for a hypothetical (option=value) selection assuming all OTHER
  // current selections stay the same. Used to grey out unavailable values.
  const stockFor = (optionId: string, valueId: string): number => {
    const trial: SelectionMap = { ...currentSelection, [optionId]: valueId };
    const nameMap: Record<string, string> = {};
    for (const opt of product.options) {
      const vid = trial[opt.id];
      if (!vid) continue;
      const v = opt.values.find((x) => x.id === vid);
      if (v) nameMap[opt.name] = v.value;
    }
    const variant = product.variants.find((v) =>
      Object.entries(nameMap).every(([optName, valName]) => v.options[optName] === valName)
    );
    return variant?.stock ?? 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative size-16 flex-shrink-0 bg-muted rounded">
          {typeof product.images[0] === "string" && product.images[0].length > 0 && (
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

      {product.options.map((option) => {
        const isSizeOption =
          option.name.toLowerCase().includes("talla") ||
          option.name.toLowerCase().includes("size");
        return (
          <div key={option.id}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium">{option.name}</label>
              {isSizeOption && product.sizeGuide && (
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Guía de tallas
                </button>
              )}
            </div>

            {option.displayStyle === "SWATCHES" && (
              <div className="flex flex-wrap gap-2">
                {option.values.map((val) => {
                  const isSelected = currentSelection[option.id] === val.id;
                  const inStock = stockFor(option.id, val.id) > 0;
                  return (
                    <button
                      key={val.id}
                      type="button"
                      onClick={() => inStock && pickValue(option.id, val.id)}
                      disabled={!inStock}
                      title={`${val.value}${!inStock ? " (Agotado)" : ""}`}
                      className={`relative ${!inStock ? "opacity-30 cursor-not-allowed" : ""}`}
                    >
                      {val.swatchType === "COLOR" && val.colorHex ? (
                        <span
                          className={`block size-8 rounded-full border-2 ${
                            isSelected ? "border-blue-600" : "border-gray-200"
                          }`}
                          style={{ backgroundColor: val.colorHex }}
                        />
                      ) : val.swatchType === "IMAGE" && val.swatchImage ? (
                        <span
                          className={`block size-8 rounded-full border-2 overflow-hidden ${
                            isSelected ? "border-blue-600" : "border-gray-200"
                          }`}
                        >
                          <Image
                            src={val.swatchImage}
                            alt={val.value}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        </span>
                      ) : (
                        <span
                          className={`block px-3 py-1 text-xs rounded border-2 ${
                            isSelected
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200"
                          }`}
                        >
                          {val.value}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {option.displayStyle === "BUTTONS" && (
              <div className="flex flex-wrap gap-2">
                {option.values.map((val) => {
                  const isSelected = currentSelection[option.id] === val.id;
                  const inStock = stockFor(option.id, val.id) > 0;
                  return (
                    <Button
                      key={val.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => pickValue(option.id, val.id)}
                      disabled={!inStock}
                      className={!inStock ? "opacity-30" : ""}
                    >
                      {val.value}
                    </Button>
                  );
                })}
              </div>
            )}

            {option.displayStyle === "DROPDOWN" && (
              <select
                value={currentSelection[option.id] ?? ""}
                onChange={(e) => pickValue(option.id, e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">Selecciona {option.name}</option>
                {option.values.map((val) => {
                  const inStock = stockFor(option.id, val.id) > 0;
                  return (
                    <option key={val.id} value={val.id} disabled={!inStock}>
                      {val.value}
                      {!inStock ? " (Agotado)" : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        );
      })}

      {product.sizeGuide && (
        <SizeGuideModal
          guide={product.sizeGuide}
          open={sizeGuideOpen}
          onOpenChange={setSizeGuideOpen}
        />
      )}
    </div>
  );
}
