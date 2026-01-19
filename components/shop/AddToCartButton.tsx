"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, AlertCircle } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";
import { getProductImageUrl } from "@/lib/image-utils";

interface AddToCartButtonProps {
  product: any;
  variants: any[];
  selectedVariant?: any;
  disabled?: boolean;
}

export default function AddToCartButton({
  product,
  variants,
  selectedVariant,
  disabled,
}: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    // Validar si el producto tiene variantes pero no hay ninguna seleccionada
    if (product.hasVariants && !selectedVariant) {
      toast.error("Por favor selecciona todas las opciones del producto");
      return;
    }

    // Si el producto tiene variantes
    if (product.hasVariants && selectedVariant) {
      // Validar stock
      if (selectedVariant.stock <= 0) {
        toast.error("Este producto está agotado");
        return;
      }

      const variantOptions = selectedVariant.options as Record<string, string>;
      const variantName = Object.entries(variantOptions)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      // Obtener la URL correcta de la imagen
      const imageUrl = selectedVariant.image || getProductImageUrl(product.images);

      addItem({
        id: selectedVariant.id,
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        variantName,
        price: Number(selectedVariant.price),
        // ⭐ FIX: Convertir null a undefined
        image: imageUrl ?? undefined,
        maxStock: selectedVariant.stock,
        options: variantOptions,
      });

      toast.success("Producto agregado al carrito");
    } else {
      // Producto simple sin variantes
      if (product.stock <= 0) {
        toast.error("Este producto está agotado");
        return;
      }

      // Obtener la URL correcta de la imagen
      const imageUrl = getProductImageUrl(product.images);

      addItem({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: Number(product.basePrice),
        // ⭐ FIX: Convertir null a undefined
        image: imageUrl ?? undefined,
        maxStock: product.stock,
      });

      toast.success("Producto agregado al carrito");
    }

    // Mostrar feedback visual
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Determinar si el botón debe estar deshabilitado
  const isDisabled = disabled || added || 
    (product.hasVariants && !selectedVariant) ||
    (selectedVariant && selectedVariant.stock <= 0) ||
    (!product.hasVariants && product.stock <= 0);

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleAddToCart}
      disabled={isDisabled}
    >
      {added ? (
        <>
          <Check className="mr-2 h-5 w-5" />
          Agregado al Carrito
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-5 w-5" />
          Agregar al Carrito
        </>
      )}
    </Button>
  );
}