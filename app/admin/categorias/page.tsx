import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import DeleteCategoryButton from "@/components/admin/DeleteCategoryButton";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">
            Gestiona las categorías de productos
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/categorias/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Categoría
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Categorías ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No hay categorías creadas</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/admin/categorias/nueva">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera categoría
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  {/* Imagen */}
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

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{category.name}</h3>
                      {!category.active && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      /{category.slug}
                    </p>
                    {category.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {category._count.products}
                    </p>
                    <p className="text-xs text-muted-foreground">productos</p>
                  </div>

                  {/* Actions */}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}