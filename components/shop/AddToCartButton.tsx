"use client";

import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import {
  useCartStore,
  type AppliedPromotion,
  type SubscriptionOptIn,
} from "@/store/cart";
import { useCartDrawer } from "@/store/cart-drawer";
import { toast } from "sonner";
import { getProductImageUrl } from "@/lib/image-utils";
import { useTracking } from "@/hooks/useTracking";

interface AddToCartButtonProps {
  product: any;
  variants: any[];
  selectedVariant?: any;
  disabled?: boolean;
  quantity?: number;
  appliedPromotion?: AppliedPromotion;
  subscriptionOptIn?: SubscriptionOptIn;
}

export default function AddToCartButton({
  product,
  variants,
  selectedVariant,
  disabled,
  quantity = 1,
  appliedPromotion,
  subscriptionOptIn,
}: AddToCartButtonProps) {
  const openCartDrawer = useCartDrawer((state) => state.open);
  const addItem = useCartStore((state) => state.addItem);
  const { trackEvent } = useTracking();

  const handleAddToCart = () => {
    // Validar si el producto tiene variantes pero no hay ninguna seleccionada
    if (product.hasVariants && !selectedVariant) {
      toast.error("Por favor selecciona todas las opciones del producto");
      return;
    }

    const safeQty = Math.max(1, Math.floor(quantity));

    if (product.hasVariants && selectedVariant) {
      if (selectedVariant.stock <= 0) {
        toast.error("Este producto está agotado");
        return;
      }

      if (safeQty > selectedVariant.stock) {
        toast.error(`Solo hay ${selectedVariant.stock} unidades en stock`);
        return;
      }

      const variantOptions = selectedVariant.options as Record<string, string>;
      const variantName = Object.entries(variantOptions)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      const imageUrl = selectedVariant.image || getProductImageUrl(product.images);

      const baseUnitPrice = Number(selectedVariant.price);
      const volumeDiscount = appliedPromotion?.discountPerUnit ?? 0;
      const subscriptionDiscount = subscriptionOptIn?.discountPerUnit ?? 0;
      const finalUnitPrice = Math.max(
        0,
        baseUnitPrice - volumeDiscount - subscriptionDiscount
      );

      addItem(
        {
          id: selectedVariant.id,
          productId: product.id,
          variantId: selectedVariant.id,
          slug: product.slug,
          name: product.name,
          variantName,
          price: finalUnitPrice,
          originalUnitPrice: baseUnitPrice,
          image: imageUrl ?? undefined,
          maxStock: selectedVariant.stock,
          options: variantOptions,
          appliedPromotion,
          subscriptionOptIn,
        },
        safeQty
      );

      trackEvent("AddToCart", {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        value: finalUnitPrice * safeQty,
        currency: "PEN",
        contents: [
          {
            id: selectedVariant.sku || selectedVariant.id,
            quantity: safeQty,
            item_price: finalUnitPrice,
          },
        ],
      });

      toast.success(
        appliedPromotion
          ? `${safeQty} unidades agregadas con descuento aplicado`
          : "Producto agregado al carrito"
      );

      openCartDrawer();
    } else {
      if (product.stock <= 0) {
        toast.error("Este producto está agotado");
        return;
      }

      if (safeQty > product.stock) {
        toast.error(`Solo hay ${product.stock} unidades en stock`);
        return;
      }

      const imageUrl = getProductImageUrl(product.images);

      const baseUnitPrice = Number(product.basePrice);
      const volumeDiscount = appliedPromotion?.discountPerUnit ?? 0;
      const subscriptionDiscount = subscriptionOptIn?.discountPerUnit ?? 0;
      const finalUnitPrice = Math.max(
        0,
        baseUnitPrice - volumeDiscount - subscriptionDiscount
      );

      addItem(
        {
          id: product.id,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: finalUnitPrice,
          originalUnitPrice: baseUnitPrice,
          image: imageUrl ?? undefined,
          maxStock: product.stock,
          appliedPromotion,
          subscriptionOptIn,
        },
        safeQty
      );

      trackEvent("AddToCart", {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        value: finalUnitPrice * safeQty,
        currency: "PEN",
        contents: [
          {
            id: product.sku || product.id,
            quantity: safeQty,
            item_price: finalUnitPrice,
          },
        ],
      });

      toast.success(
        appliedPromotion
          ? `${safeQty} unidades agregadas con descuento aplicado`
          : "Producto agregado al carrito"
      );

      openCartDrawer();
    }
  };

  const isDisabled =
    disabled ||
    (product.hasVariants && !selectedVariant) ||
    (selectedVariant && selectedVariant.stock <= 0) ||
    (!product.hasVariants && product.stock <= 0);

  const ctaLabel =
    quantity > 1 ? `Agregar ${quantity} al carrito` : "Agregar al Carrito";

  return (
    <Button
      variant="cta"
      size="lg"
      className="w-full"
      onClick={handleAddToCart}
      disabled={isDisabled}
    >
      <ShoppingCart className="mr-2 h-5 w-5" />
      {ctaLabel}
    </Button>
  );
}
