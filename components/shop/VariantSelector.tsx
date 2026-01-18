"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface VariantSelectorProps {
  product: any;
  variants: any[];
  options: any[];
  onVariantChange?: (variant: any | null) => void;
}

export default function VariantSelector({
  product,
  variants,
  options,
  onVariantChange,
}: VariantSelectorProps) {
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});

  const handleOptionSelect = (optionName: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  };

  // Encontrar variante seleccionada
  const selectedVariant = variants.find((variant) => {
    const variantOptions = variant.options as Record<string, string>;
    return Object.entries(selectedOptions).every(
      ([key, value]) => variantOptions[key] === value
    );
  });

  // Notificar cambio de variante
  useEffect(() => {
    // Solo notificar si todas las opciones están seleccionadas
    const allOptionsSelected = options.every(
      (option) => selectedOptions[option.name]
    );

    if (allOptionsSelected && selectedVariant) {
      onVariantChange?.(selectedVariant);
    } else {
      onVariantChange?.(null);
    }
  }, [selectedOptions, selectedVariant, options, onVariantChange]);

  return (
    <div className="space-y-4">
      {options.map((option) => (
        <div key={option.id}>
          <h3 className="mb-2 text-sm font-medium">
            {option.name}
            {selectedOptions[option.name] && (
              <span className="ml-2 text-muted-foreground">
                : {selectedOptions[option.name]}
              </span>
            )}
          </h3>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value: any) => {
              const isSelected = selectedOptions[option.name] === value.value;
              
              // Verificar si esta opción está disponible
              const isAvailable = variants.some((variant) => {
                const variantOptions = variant.options as Record<string, string>;
                const matchesCurrentSelections = Object.entries(
                  selectedOptions
                ).every(([key, val]) => {
                  if (key === option.name) return true; // Ignorar la opción actual
                  return variantOptions[key] === val;
                });
                return (
                  matchesCurrentSelections &&
                  variantOptions[option.name] === value.value &&
                  variant.stock > 0
                );
              });

              return (
                <Button
                  key={value.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleOptionSelect(option.name, value.value)}
                  disabled={!isAvailable}
                  className="min-w-[60px]"
                >
                  {value.value}
                </Button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedVariant && (
        <div className="space-y-2 rounded-lg bg-muted p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Precio:</span>
            <span className="font-semibold">
              {formatPrice(Number(selectedVariant.price))}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stock disponible:</span>
            <Badge variant={selectedVariant.stock > 0 ? "outline" : "destructive"}>
              {selectedVariant.stock > 0 ? `${selectedVariant.stock} unidades` : "Agotado"}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}