export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import DeleteCategoryButton from "@/components/admin/DeleteCategoryButton";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Categorías</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona las categorías de productos
          </p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/admin/categorias/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Categoría
          </Link>
        </Button>
      </div>

      {/* Mobile primary CTA */}
      <Button asChild className="sm:hidden w-full">
        <Link href="/admin/categorias/nueva">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Categoría
        </Link>
      </Button>

      {/* Categories List */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Lista de Categorías</CardTitle>
            {categories.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {categories.length}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {categories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">No hay categorías creadas</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/admin/categorias/nueva">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera categoría
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y sm:divide-y-0 sm:space-y-3">
              {categories.map((category) => (
                <div key={category.id}>
                  {/* ============ MOBILE: compact row ============ */}
                  <div className="sm:hidden flex items-start gap-2.5 px-3 py-2.5">
                    <Link
                      href={`/admin/categorias/${category.id}`}
                      className="flex items-start gap-2.5 flex-1 min-w-0 active:opacity-70"
                    >
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {category.image ? (
                          <Image
                            src={category.image}
                            alt={category.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground text-center px-1">
                            Sin foto
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm leading-snug line-clamp-1 min-w-0">
                            {category.name}
                          </span>
                          <span className="text-xs font-medium tabular-nums whitespace-nowrap shrink-0 text-muted-foreground">
                            {category._count.products} prod
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          /{category.slug}
                        </p>
                        {category.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {category.description}
                          </p>
                        )}
                        {!category.active && (
                          <span className="mt-1 inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] leading-none">
                            Inactiva
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        asChild
                      >
                        <Link
                          href={`/admin/categorias/${category.id}`}
                          aria-label="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <DeleteCategoryButton
                        categoryId={category.id}
                        categoryName={category.name}
                        productCount={category._count.products}
                        variant="ghost"
                        className="h-7 w-7"
                        iconClassName="h-3.5 w-3.5"
                      />
                    </div>
                  </div>

                  {/* ============ DESKTOP: original card ============ */}
                  <div className="hidden sm:flex sm:items-center gap-4 rounded-lg border p-4">
                    {category.image ? (
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded">
                        <Image
                          src={category.image}
                          alt={category.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded bg-slate-100 text-xs text-muted-foreground">
                        Sin imagen
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{category.name}</h3>
                        {!category.active && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                            Inactiva
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        /{category.slug}
                      </p>
                      {category.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {category._count.products}
                      </p>
                      <p className="text-xs text-muted-foreground">productos</p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/categorias/${category.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteCategoryButton
                        categoryId={category.id}
                        categoryName={category.name}
                        productCount={category._count.products}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
