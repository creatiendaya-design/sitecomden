// app/admin/productos/page.tsx
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download } from "lucide-react";
import ProductFiltersBar from "@/components/admin/ProductFiltersBar";
import ProductsList from "@/components/admin/ProductsList";

import { hasPermissions } from "@/lib/permissions";
import { getCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

interface ProductsAdminPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
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

  const { search, category } = await searchParams;

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
      some: {
        categoryId: category,
      },
    };
  }

  // Obtener productos
  const products = await prisma.product.findMany({
    where,
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      variants: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

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
        {/* ⭐ CAMBIO: Solo mostrar si tiene permiso para crear */}
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
          <CardTitle className="text-lg sm:text-xl">
            {products.length} producto{products.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {products.length === 0 && canCreate ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No hay productos</p>
              <Button asChild className="mt-4">
                <Link href="/admin/productos/nuevo">Crear primer producto</Link>
              </Button>
            </div>
          ) : (
            <ProductsList products={serializedProducts} canEdit={canEdit} canDelete={canDelete} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}