import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl, getProductImageAlt } from "@/lib/image-utils";
import { Eye, Heart, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  compareAtPrice?: number | null;
  images: any;
  featured?: boolean;
  stock?: number;
}

interface ProductGridProps {
  title?: string;
  subtitle?: string;
  products: Product[];
  columns?: 2 | 3 | 4 | 5;
  showQuickActions?: boolean;
  viewAllHref?: string;
  layout?: "standard" | "compact" | "detailed";
  className?: string;
}

export function ProductGrid({
  title,
  subtitle,
  products,
  columns = 4,
  showQuickActions = false,
  viewAllHref,
  layout = "standard",
  className = "",
}: ProductGridProps) {
  const gridCols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  };

  if (layout === "compact") {
    return (
      <section className={`py-12 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          {title && (
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-1 text-muted-foreground">{subtitle}</p>
                )}
              </div>
              {viewAllHref && (
                <Button asChild variant="outline">
                  <Link href={viewAllHref}>Ver Todos</Link>
                </Button>
              )}
            </div>
          )}

          {/* Grid compacto */}
          <div className={`grid gap-4 ${gridCols[columns]}`}>
            {products.map((product) => {
              const imageUrl = getProductImageUrl(product.images);
              const discount = product.compareAtPrice
                ? Math.round(
                    ((Number(product.compareAtPrice) - Number(product.basePrice)) /
                      Number(product.compareAtPrice)) *
                      100
                  )
                : null;

              return (
                <Link
                  key={product.id}
                  href={`/productos/${product.slug}`}
                  className="group"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={getProductImageAlt(product.images, product.name)}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                    {discount && (
                      <Badge className="absolute left-2 top-2 bg-red-500">
                        -{discount}%
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="line-clamp-1 text-sm font-medium group-hover:text-primary">
                      {product.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-bold">
                        {formatPrice(Number(product.basePrice))}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(Number(product.compareAtPrice))}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (layout === "detailed") {
    return (
      <section className={`py-16 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          {title && (
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h2>
              {subtitle && (
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Grid con cards detalladas */}
          <div className={`grid gap-8 ${gridCols[columns]}`}>
            {products.map((product) => {
              const imageUrl = getProductImageUrl(product.images);
              const discount = product.compareAtPrice
                ? Math.round(
                    ((Number(product.compareAtPrice) - Number(product.basePrice)) /
                      Number(product.compareAtPrice)) *
                      100
                  )
                : null;

              return (
                <Card
                  key={product.id}
                  className="group overflow-hidden border-0 shadow-lg transition-shadow hover:shadow-xl"
                >
                  <div className="relative">
                    <Link href={`/productos/${product.slug}`}>
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={getProductImageAlt(product.images, product.name)}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            Sin imagen
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Badges */}
                    <div className="absolute left-3 top-3 flex flex-col gap-2">
                      {discount && (
                        <Badge className="bg-red-500 shadow-lg">
                          -{discount}%
                        </Badge>
                      )}
                      {product.featured && (
                        <Badge className="bg-primary shadow-lg">
                          Destacado
                        </Badge>
                      )}
                      {product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
                        <Badge variant="outline" className="bg-white/90 shadow-lg">
                          ¡Últimas unidades!
                        </Badge>
                      )}
                    </div>

                    {/* Quick Actions */}
                    {showQuickActions && (
                      <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-10 w-10 rounded-full shadow-lg"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-10 w-10 rounded-full shadow-lg"
                          asChild
                        >
                          <Link href={`/productos/${product.slug}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <Link href={`/productos/${product.slug}`}>
                      <h3 className="mb-2 line-clamp-2 font-semibold transition-colors hover:text-primary">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold">
                        {formatPrice(Number(product.basePrice))}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(Number(product.compareAtPrice))}
                        </span>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="gap-2 p-4 pt-0">
                    <Button asChild className="w-full">
                      <Link href={`/productos/${product.slug}`}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Ver Producto
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Ver todos */}
          {viewAllHref && (
            <div className="mt-12 text-center">
              <Button asChild size="lg" variant="outline">
                <Link href={viewAllHref}>
                  Ver Toda la Colección
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Layout estándar
  return (
    <section className={`py-16 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {title && (
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
              {subtitle && (
                <p className="mt-2 text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {viewAllHref && (
              <Button asChild variant="outline">
                <Link href={viewAllHref}>Ver Todos</Link>
              </Button>
            )}
          </div>
        )}

        {/* Grid estándar */}
        <div className={`grid gap-6 ${gridCols[columns]}`}>
          {products.map((product) => {
            const imageUrl = getProductImageUrl(product.images);
            const discount = product.compareAtPrice
              ? Math.round(
                  ((Number(product.compareAtPrice) - Number(product.basePrice)) /
                    Number(product.compareAtPrice)) *
                    100
                )
              : null;

            return (
              <Card key={product.id} className="group overflow-hidden">
                <Link href={`/productos/${product.slug}`}>
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={getProductImageAlt(product.images, product.name)}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                    {discount && (
                      <Badge className="absolute right-2 top-2 bg-red-500">
                        -{discount}%
                      </Badge>
                    )}
                  </div>
                </Link>
                <CardContent className="p-4">
                  <Link href={`/productos/${product.slug}`}>
                    <h3 className="line-clamp-2 font-semibold hover:text-primary">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold">
                      {formatPrice(Number(product.basePrice))}
                    </span>
                    {product.compareAtPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(Number(product.compareAtPrice))}
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button asChild className="w-full">
                    <Link href={`/productos/${product.slug}`}>
                      Ver Producto
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}