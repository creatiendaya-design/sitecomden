"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductImageAlt } from "@/lib/image-utils";
import { ShoppingCart, Heart } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    compareAtPrice: number | null;
    images: any;
    hasVariants: boolean;
    featured: boolean;
    stock?: number;
    category?: {
      name: string;
      slug: string;
    } | null;
    variants?: Array<{
      id: string;
      price: number;
      compareAtPrice: number | null;
      stock?: number;
      options?: any;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const addToCart = useCartStore((state) => state.addItem);

  const selectedVariant = product.hasVariants && product.variants && product.variants.length > 0
    ? product.variants[0]
    : null;

  const displayPrice = selectedVariant ? selectedVariant.price : product.basePrice;
  const comparePrice = selectedVariant ? selectedVariant.compareAtPrice : product.compareAtPrice;
  const displayStock = selectedVariant?.stock ?? product.stock ?? 999;

  const discount = comparePrice
    ? Math.round(((comparePrice - displayPrice) / comparePrice) * 100)
    : 0;

  // ✅ CORREGIDO: Extraer URLs de objetos
  let mainImage: string | null = null;
  let secondImage: string | null = null;

  if (product.images && Array.isArray(product.images)) {
    // Extraer URL del primer objeto
    if (product.images[0]) {
      mainImage = typeof product.images[0] === 'string' 
        ? product.images[0] 
        : product.images[0]?.url || null;
    }

    // Extraer URL del segundo objeto
    if (product.images[1]) {
      secondImage = typeof product.images[1] === 'string' 
        ? product.images[1] 
        : product.images[1]?.url || null;
    }
  }

  const hasSecondImage = !!secondImage;
  const imageAlt = getProductImageAlt(product.images, product.name);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (displayStock <= 0) {
      toast.error("Producto sin stock");
      return;
    }

    let variantOptions: Record<string, string> | undefined;
    if (selectedVariant?.options) {
      try {
        if (typeof selectedVariant.options === 'object' && selectedVariant.options !== null) {
          variantOptions = Object.entries(selectedVariant.options).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>);
        }
      } catch (error) {
        console.warn('Error al procesar options:', error);
      }
    }

    const cartItem = {
      id: selectedVariant ? selectedVariant.id : product.id,
      productId: product.id,
      variantId: selectedVariant?.id,
      slug: product.slug,
      name: product.name,
      variantName: variantOptions
        ? Object.entries(variantOptions)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ")
        : undefined,
      price: displayPrice,
      image: mainImage ?? undefined,
      maxStock: displayStock,
      options: variantOptions,
    };

    addToCart(cartItem);

    toast.success("¡Agregado al carrito!", {
      description: product.name,
      action: {
        label: "Ver carrito",
        onClick: () => (window.location.href = "/carrito"),
      },
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    toast.info(isWishlisted ? "Removido de favoritos" : "Agregado a favoritos");
  };

  const outOfStock = displayStock <= 0;

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-xl">
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        {product.featured && (
          <Badge className="bg-primary text-primary-foreground shadow-md">
            Destacado
          </Badge>
        )}
        {discount > 0 && (
          <Badge variant="destructive" className="shadow-md">
            -{discount}%
          </Badge>
        )}
        {outOfStock && (
          <Badge variant="secondary" className="shadow-md">
            Sin stock
          </Badge>
        )}
      </div>

      <button
        onClick={handleWishlist}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
        aria-label="Agregar a favoritos"
      >
        <Heart
          className={`h-4 w-4 transition-all ${
            isWishlisted ? "fill-red-500 text-red-500" : "text-gray-600"
          }`}
        />
      </button>

      <Link href={`/productos/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {mainImage ? (
            <>
              {/* Imagen principal */}
              <Image
                src={mainImage}
                alt={imageAlt}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-cover transition-opacity duration-300 ${
                  hasSecondImage ? 'group-hover:opacity-0' : ''
                }`}
                priority={product.featured}
              />
              
              {/* Segunda imagen - Solo si existe */}
              {hasSecondImage && secondImage && (
                <Image
                  src={secondImage}
                  alt={`${product.name} - vista alternativa`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="mb-2 text-4xl">📦</div>
                <p className="text-sm">Sin imagen</p>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 hidden translate-y-full bg-gradient-to-t from-black/60 to-transparent p-4 transition-transform duration-300 group-hover:translate-y-0 sm:block">
            <Button
              size="sm"
              className="w-full bg-white text-black hover:bg-gray-100"
              onClick={handleAddToCart}
              disabled={outOfStock}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {outOfStock ? "Sin stock" : "Agregar al carrito"}
            </Button>
          </div>
        </div>

        <div className="p-4">
          {product.category && (
            <Link
              href={`/productos?category=${product.category.slug}`}
              className="mb-1 inline-block text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {product.category.name}
            </Link>
          )}

          <h3 className="mb-2 line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-foreground">
              S/ {displayPrice.toFixed(2)}
            </span>
            {comparePrice && comparePrice > displayPrice && (
              <span className="text-sm text-muted-foreground line-through">
                S/ {comparePrice.toFixed(2)}
              </span>
            )}
          </div>

          {product.hasVariants && product.variants && product.variants.length > 1 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Desde S/ {displayPrice.toFixed(2)}
            </p>
          )}

          {displayStock > 0 && displayStock <= 5 && (
            <p className="mt-1 text-xs text-orange-600">
              ¡Solo quedan {displayStock}!
            </p>
          )}
        </div>

        <div className="p-4 pt-0 sm:hidden">
          <Button
            size="sm"
            className="w-full"
            onClick={handleAddToCart}
            disabled={outOfStock}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {outOfStock ? "Sin stock" : "Agregar"}
          </Button>
        </div>
      </Link>
    </div>
  );
}