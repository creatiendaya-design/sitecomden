// app/admin/productos/page.tsx
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download, ChevronLeft, ChevronRight } from "lucide-react";
import ProductFiltersBar from "@/components/admin/ProductFiltersBar";
import ProductsList from "@/components/admin/ProductsList";

import { hasPermissions } from "@/lib/permissions";
import { getCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

const PAGE_SIZE = 50;

interface ProductsAdminPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function ProductsAdminPage({
  searchParams,
}: ProductsAdminPageProps) {
  const userId = await getCurrentUserId();

  const perms = await hasPermissions(userId, [
    "products:view",
    "products:create",
    "products:edit",
    "products:delete",
  ]);

  if (!perms["products:view"]) {
    redirect("/admin/dashboard");
  }

  const canCreate = perms["products:create"];
  const canEdit = perms["products:edit"];
  const canDelete = perms["products:delete"];

  const { search, category, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  // Construir filtros
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.categories = {
      some: { categoryId: category },
    };
  }

  // Total y página en paralelo
  const [totalCount, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        variants: true,
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Obtener categorías para filtro
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  // Serializar Decimals para Client Component
  const serializedProducts = products.map((p) => ({
    ...p,
    basePrice: Number(p.basePrice),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    weight: p.weight ? Number(p.weight) : null,
    variants: p.variants.map((v) => ({
      ...v,
      price: Number(v.price),
    })),
  }));

  // Construir URL de paginación preservando filtros actuales
  function pageUrl(targetPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/productos${qs ? `?${qs}` : ""}`;
  }

  const firstItem = totalCount === 0 ? 0 : skip + 1;
  const lastItem = Math.min(skip + PAGE_SIZE, totalCount);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Productos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona el catálogo de tu tienda
          </p>
        </div>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/productos/importar">
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/productos/exportar">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/admin/productos/nuevo">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <ProductFiltersBar categories={categories} />
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg sm:text-xl">
              {totalCount === 0
                ? "Sin productos"
                : `${firstItem}–${lastItem} de ${totalCount} producto${totalCount !== 1 ? "s" : ""}`}
            </CardTitle>
            {totalPages > 1 && (
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {totalCount === 0 && canCreate ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No hay productos</p>
              <Button asChild className="mt-4">
                <Link href="/admin/productos/nuevo">Crear primer producto</Link>
              </Button>
            </div>
          ) : (
            <ProductsList products={serializedProducts} canEdit={canEdit} canDelete={canDelete} />
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between gap-2 border-t pt-4">
              <Button
                asChild={page > 1}
                variant="outline"
                size="sm"
                disabled={page <= 1}
              >
                {page > 1 ? (
                  <Link href={pageUrl(page - 1)}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Link>
                ) : (
                  <span>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </span>
                )}
              </Button>

              {/* Page number pills — show up to 7 pages */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - page) <= 2;
                  })
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">…</span>
                    ) : (
                      <Button
                        key={item}
                        asChild={item !== page}
                        variant={item === page ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        {item !== page ? (
                          <Link href={pageUrl(item as number)}>{item}</Link>
                        ) : (
                          <span>{item}</span>
                        )}
                      </Button>
                    )
                  )}
              </div>

              <Button
                asChild={page < totalPages}
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
              >
                {page < totalPages ? (
                  <Link href={pageUrl(page + 1)}>
                    Siguiente
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                ) : (
                  <span>
                    Siguiente
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
