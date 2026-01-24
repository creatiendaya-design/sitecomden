// components/shop/FeaturedProducts.tsx
// Sección de productos destacados para la página de inicio

import { prisma } from "@/lib/db";
import ProductCard from "./ProductCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default async function FeaturedProducts() {
  // Obtener productos destacados
  const featuredProducts = await prisma.product.findMany({
    where: {
      featured: true,
      active: true,
    },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      variants: {
        where: { active: true },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
    take: 6, // Mostrar 6 productos destacados
    orderBy: { createdAt: "desc" },
  });

  // Serializar productos
  const serializedProducts = featuredProducts.map((product) => ({
    ...product,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    variants: product.variants.map((v) => ({
      ...v,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
    })),
  }));

  if (serializedProducts.length === 0) {
    return null; // No mostrar sección si no hay productos destacados
  }

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Productos Destacados
          </h2>
          <p className="mt-2 text-muted-foreground">
            Lo mejor de nuestra colección
          </p>
        </div>
        <Button asChild variant="ghost" className="hidden sm:flex">
          <Link href="/productos">
            Ver todos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Grid de productos - 2 columnas en móvil, 3 en tablet, 4 en desktop */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {serializedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Botón "Ver todos" en móvil */}
      <div className="mt-8 flex justify-center sm:hidden">
        <Button asChild variant="outline" className="w-full max-w-xs">
          <Link href="/productos">
            Ver todos los productos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}