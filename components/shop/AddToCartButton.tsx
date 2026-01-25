"use client";

import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";
import { getProductImageUrl } from "@/lib/image-utils";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
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
        slug: product.slug, // ✅ AGREGADO
        name: product.name,
        variantName,
        price: Number(selectedVariant.price),
        image: imageUrl ?? undefined,
        maxStock: selectedVariant.stock,
        options: variantOptions,
      });

      toast.success("Producto agregado al carrito");
      
      // Redirigir al carrito inmediatamente
      router.push('/carrito');
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
        slug: product.slug, // ✅ AGREGADO
        name: product.name,
        price: Number(product.basePrice),
        image: imageUrl ?? undefined,
        maxStock: product.stock,
      });

      toast.success("Producto agregado al carrito");
      
      // Redirigir al carrito inmediatamente
      router.push('/carrito');
    }
  };

  // Determinar si el botón debe estar deshabilitado
  const isDisabled = disabled || 
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
      <ShoppingCart className="mr-2 h-5 w-5" />
      Agregar al Carrito
    </Button>
  );
}