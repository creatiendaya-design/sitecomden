// components/shop/FeaturedCategories.tsx
// Sección de categorías destacadas para la página de inicio

import { prisma } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default async function FeaturedCategories() {
  // Obtener categorías principales (sin parent)
  const categories = await prisma.category.findMany({
    where: {
      active: true,
      parentId: null, // Solo categorías principales
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { order: "asc" },
    take: 6,
  });

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 bg-muted/30">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Compra por Categoría
        </h2>
        <p className="mt-2 text-muted-foreground">
          Encuentra lo que buscas más rápido
        </p>
      </div>

      {/* Grid de categorías */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/productos?category=${category.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-lg bg-card border transition-all hover:shadow-lg"
          >
            {/* Imagen de categoría */}
            <div className="relative aspect-square overflow-hidden bg-muted">
              {category.image ? (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-4xl opacity-20">📦</span>
                </div>
              )}
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>

            {/* Información */}
            <div className="p-3 sm:p-4">
              <h3 className="font-semibold text-sm sm:text-base mb-1 group-hover:text-primary transition-colors">
                {category.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {category._count.products}{" "}
                {category._count.products === 1 ? "producto" : "productos"}
              </p>
            </div>

            {/* Ícono de flecha (solo desktop) */}
            <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-primary opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1 hidden sm:block" />
          </Link>
        ))}
      </div>
    </section>
  );
}