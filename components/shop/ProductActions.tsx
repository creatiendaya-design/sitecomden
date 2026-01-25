"use client";

import { useState, useEffect } from "react";
import ProductOptions from "@/components/shop/ProductOptions";
import AddToCartButton from "@/components/shop/AddToCartButton";

// 🔧 TIPOS EXPLÍCITOS
interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  sku: string | null;
  stock: number;
  images: any;
  hasVariants: boolean;
  weight: number | null;
}

interface VariantData {
  id: string;
  productId: string;
  sku: string | null;
  barcode: string | null;
  options: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockAlert: number | null;
  weight: number | null;
  image: string | null;
  active: boolean;
}

interface OptionValue {
  id: string;
  value: string;
  position: number;
  swatchType: string;
  colorHex: string | null;
  swatchImage: string | null;
}

interface OptionData {
  id: string;
  name: string;
  displayStyle: string;
  position: number;
  values: OptionValue[];
}

interface ProductActionsProps {
  product: ProductData;
  variants: VariantData[];
  options: OptionData[];
}

export default function ProductActions({
  product,
  variants,
  options,
}: ProductActionsProps) {
  // Estado: { optionId: valueId }
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<VariantData | null>(null);

  // 🆕 Manejar cambio de opción
  const handleOptionChange = (optionId: string, valueId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: valueId,
    }));
  };

  // 🆕 Encontrar variante que coincida con las opciones seleccionadas
  useEffect(() => {
    // Si no todas las opciones están seleccionadas, no buscar
    if (Object.keys(selectedOptions).length !== options.length) {
      setSelectedVariant(null);
      return;
    }

    // Construir objeto de opciones seleccionadas { "Color": "Rojo", "Talla": "M" }
    const selectedOptionsMap: Record<string, string> = {};

    options.forEach((option) => {
      const selectedValueId = selectedOptions[option.id];
      const selectedValue = option.values.find((v) => v.id === selectedValueId);
      if (selectedValue) {
        selectedOptionsMap[option.name] = selectedValue.value;
      }
    });

    // Buscar variante que coincida
    const matchingVariant = variants.find((variant) => {
      return Object.keys(selectedOptionsMap).every((optionName) => {
        return variant.options[optionName] === selectedOptionsMap[optionName];
      });
    });

    setSelectedVariant(matchingVariant || null);
  }, [selectedOptions, options, variants]);

  // ✅ Notificar cambio de precio cuando cambie la variante
  useEffect(() => {
    if (selectedVariant) {
      console.log("📢 Actualizando precio principal a:", selectedVariant.price);

      window.dispatchEvent(
        new CustomEvent("variant-changed", {
          detail: {
            price: Number(selectedVariant.price),
            compareAtPrice: selectedVariant.compareAtPrice
              ? Number(selectedVariant.compareAtPrice)
              : null,
          },
        })
      );
    }
  }, [selectedVariant]);

  // Calcular stock total
  const totalStock = product.hasVariants
    ? variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;

  const inStock = totalStock > 0;

  return (
    <div className="space-y-6">
      {/* 🆕 Opciones con Swatches */}
      {product.hasVariants && options.length > 0 && (
        <ProductOptions
          options={options}
          selectedOptions={selectedOptions}
          onOptionChange={handleOptionChange}
        />
      )}

      {/* 🆕 Información de la Variante Seleccionada */}
      {selectedVariant && (
        <div className="rounded-lg bg-slate-50 p-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">SKU:</span>
            <span className="font-medium">{selectedVariant.sku}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Precio:</span>
            <span className="text-xl font-bold text-blue-600">
              S/ {selectedVariant.price.toFixed(2)}
            </span>
          </div>
          {selectedVariant.compareAtPrice && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Antes:</span>
              <span className="text-sm text-slate-500 line-through">
                S/ {selectedVariant.compareAtPrice.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Disponibilidad:</span>
            <span
              className={`font-medium ${
                selectedVariant.stock > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {selectedVariant.stock > 0
                ? `${selectedVariant.stock} en stock`
                : "Sin stock"}
            </span>
          </div>
        </div>
      )}

      {/* Add to Cart */}
      <AddToCartButton
        product={product}
        variants={variants}
        selectedVariant={selectedVariant}
        disabled={!inStock || (selectedVariant ? selectedVariant.stock <= 0 : false)}
      />

      {!inStock && (
        <p className="text-center text-sm text-destructive">
          Este producto está agotado
        </p>
      )}

      {/* 🆕 Mensaje si no ha seleccionado todas las opciones */}
      {product.hasVariants &&
        Object.keys(selectedOptions).length < options.length && (
          <p className="text-center text-sm text-slate-600">
            Por favor selecciona todas las opciones
          </p>
        )}
    </div>
  );
}