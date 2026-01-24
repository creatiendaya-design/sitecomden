"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductImageUrl, getProductImageAlt } from "@/lib/image-utils";
import { ShoppingCart, Heart } from "lucide-react";
import { useState } from "react";

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
    category?: {
      name: string;
      slug: string;
    } | null;
    variants?: Array<{
      price: number;
      compareAtPrice: number | null;
    }>;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Determinar precio a mostrar
  const displayPrice = product.hasVariants && product.variants && product.variants.length > 0
    ? product.variants[0].price
    : product.basePrice;

  const comparePrice = product.hasVariants && product.variants && product.variants.length > 0
    ? product.variants[0].compareAtPrice
    : product.compareAtPrice;

  // Calcular descuento si existe
  const discount = comparePrice
    ? Math.round(((comparePrice - displayPrice) / comparePrice) * 100)
    : 0;

  // Obtener imágenes
  const mainImage = getProductImageUrl(product.images);
  const imageAlt = getProductImageAlt(product.images, product.name);

  // Segunda imagen para efecto hover (si existe)
  const secondImage = product.images && Array.isArray(product.images) && product.images.length > 1
    ? product.images[1]
    : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implementar lógica de agregar al carrito
    console.log("Agregar al carrito:", product.id);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    // TODO: Implementar lógica de wishlist
    console.log("Toggle wishlist:", product.id);
  };

  return (
    <Card className="group relative overflow-hidden rounded-xl border transition-all hover:shadow-xl">
      {/* Badges superiores */}
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
      </div>

      {/* Botón Wishlist */}
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

      {/* Link a página del producto */}
      <Link href={`/productos/${product.slug}`} className="block">
        {/* Imagen */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {mainImage ? (
            <>
              {/* Imagen principal */}
              <Image
                src={mainImage}
                alt={imageAlt}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-opacity duration-300 group-hover:opacity-0"
                priority={product.featured}
              />
              
              {/* Segunda imagen para hover (si existe) */}
              {secondImage && (
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

          {/* Quick Add Button - Solo desktop */}
          <div className="absolute inset-x-0 bottom-0 hidden translate-y-full bg-gradient-to-t from-black/60 to-transparent p-4 transition-transform duration-300 group-hover:translate-y-0 sm:block">
            <Button
              size="sm"
              className="w-full bg-white text-black hover:bg-gray-100"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Agregar al carrito
            </Button>
          </div>
        </div>

        {/* Contenido */}
        <CardContent className="p-4">
          {/* Categoría */}
          {product.category && (
            <Link
              href={`/productos?category=${product.category.slug}`}
              className="mb-1 inline-block text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {product.category.name}
            </Link>
          )}

          {/* Nombre */}
          <h3 className="mb-2 line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>

          {/* Precio */}
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

          {/* Indicador de variantes */}
          {product.hasVariants && product.variants && product.variants.length > 1 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Desde S/ {displayPrice.toFixed(2)}
            </p>
          )}
        </CardContent>

        {/* Footer - Add to cart mobile */}
        <CardFooter className="p-4 pt-0 sm:hidden">
          <Button
            size="sm"
            className="w-full"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Agregar
          </Button>
        </CardFooter>
      </Link>
    </Card>
  );
}