"use client";

import { useState, useEffect } from "react";
import ProductOptions from "@/components/shop/ProductOptions";
import AddToCartButton from "@/components/shop/AddToCartButton";
import CodOrderModal from "@/components/shop/CodOrderModal";
import { DEFAULT_COD_FORM_SETTINGS, type CheckoutMode, type CodFormSettings } from "@/lib/types/cod-form";
import { getProductImageUrl } from "@/lib/image-utils";

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
  checkoutMode?: CheckoutMode;
  codFormSettings?: CodFormSettings | null;
}

export default function ProductActions({
  product,
  variants,
  options,
  checkoutMode,
  codFormSettings,
}: ProductActionsProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<VariantData | null>(null);
  const [codOpen, setCodOpen] = useState(false);

  const mode: CheckoutMode = checkoutMode ?? "STANDARD";
  const codSettings: CodFormSettings = (codFormSettings as CodFormSettings) ?? DEFAULT_COD_FORM_SETTINGS;

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
      
      // 🆕 Resetear imagen de variante si no hay variante seleccionada
      window.dispatchEvent(
        new CustomEvent("variant-image-changed", {
          detail: { imageUrl: null },
        })
      );
      
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

  // ✅ Notificar cambio de precio y/o imagen cuando cambie la variante
  useEffect(() => {
    if (selectedVariant) {


      // Actualizar precio
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

      // 🆕 Actualizar imagen (o resetear si no tiene)
      window.dispatchEvent(
        new CustomEvent("variant-image-changed", {
          detail: {
            imageUrl: selectedVariant.image, // Puede ser string o null
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

      {/* Checkout mode buttons */}
      <div className="space-y-2">
        {(mode === "COD_ONLY" || mode === "COD_AND_CART") && (
          <button
            onClick={() => {
              if (!inStock) return;
              setCodOpen(true);
            }}
            disabled={!inStock}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-base"
          >
            🛒 Comprar ahora
          </button>
        )}

        {(mode === "STANDARD" || mode === "COD_AND_CART") && (
          <div className={mode === "COD_AND_CART" ? "opacity-90 [&_button]:bg-white [&_button]:border [&_button]:border-gray-300 [&_button]:text-gray-700 [&_button]:hover:bg-gray-50 [&_button]:shadow-none" : ""}>
            <AddToCartButton
              product={product}
              variants={variants}
              selectedVariant={selectedVariant}
              disabled={!inStock || (selectedVariant ? selectedVariant.stock <= 0 : false)}
            />
          </div>
        )}
      </div>

      {!inStock && (
        <p className="text-center text-sm text-destructive">
          Este producto está agotado
        </p>
      )}

      {product.hasVariants && Object.keys(selectedOptions).length < options.length && (
        <p className="text-center text-sm text-slate-600">
          Por favor selecciona todas las opciones
        </p>
      )}

      <CodOrderModal
        open={codOpen}
        onClose={() => setCodOpen(false)}
        items={[{
          productId: product.id,
          variantId: selectedVariant?.id,
          quantity: 1,
          name: product.name,
          price: selectedVariant ? Number(selectedVariant.price) : Number(product.basePrice),
          image: getProductImageUrl(product.images) ?? undefined,
        }]}
        settings={codSettings}
      />
    </div>
  );
}