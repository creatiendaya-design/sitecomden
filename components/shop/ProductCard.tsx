import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProductImageUrl, getProductImageAlt } from "@/lib/image-utils";

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

  return (
    <Link href={`/productos/${product.slug}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg">
        {/* Imagen */}
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          {getProductImageUrl(product.images) ? (
            <Image
              src={getProductImageUrl(product.images)!}
              alt={getProductImageAlt(product.images, product.name)}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sin imagen
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-2">
            {product.featured && (
              <Badge className="bg-yellow-500 hover:bg-yellow-600">
                Destacado
              </Badge>
            )}
            {discount > 0 && (
              <Badge variant="destructive">-{discount}%</Badge>
            )}
          </div>
        </div>

        {/* Contenido */}
        <CardContent className="p-4">
          {/* Categoría */}
          {product.category && (
            <p className="text-xs text-muted-foreground mb-1">
              {product.category.name}
            </p>
          )}

          {/* Nombre */}
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </CardContent>

        {/* Footer con precio */}
        <CardFooter className="p-4 pt-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">
              S/ {displayPrice.toFixed(2)}
            </span>
            {comparePrice && comparePrice > displayPrice && (
              <span className="text-sm text-muted-foreground line-through">
                S/ {comparePrice.toFixed(2)}
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}