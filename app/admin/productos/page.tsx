// app/admin/productos/page.tsx
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl, getProductImageAlt } from "../../../lib/image-utils";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Eye } from "lucide-react";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

// ⭐ NUEVO: Importar sistema de permisos
import { hasPermission } from "@/lib/permissions";
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
  // ⭐ NUEVO: Verificar permisos
  const userId = await getCurrentUserId();
  
  // Verificar acceso al módulo de productos
  const canView = await hasPermission(userId, "products:view");
  if (!canView) {
    redirect("/admin/dashboard");
  }

  // Obtener permisos específicos
  const canCreate = await hasPermission(userId, "products:create");
  const canEdit = await hasPermission(userId, "products:edit");
  const canDelete = await hasPermission(userId, "products:delete");

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
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/productos/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                className="pl-9"
                defaultValue={search}
              />
            </div>
            <select className="rounded-md border px-4 py-2 sm:w-auto">
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
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
          {products.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No hay productos</p>
              {/* ⭐ CAMBIO: Solo mostrar si tiene permiso */}
              {canCreate && (
                <Button asChild className="mt-4">
                  <Link href="/admin/productos/nuevo">
                    Crear primer producto
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {products.map((product) => {
                const totalStock = product.hasVariants
                  ? product.variants.reduce((sum, v) => sum + v.stock, 0)
                  : product.stock;

                // ✅ CALCULAR PRECIO A MOSTRAR
                let displayPrice = Number(product.basePrice);
                let pricePrefix = "";

                if (product.hasVariants && product.variants.length > 0) {
                  // Para productos con variantes, obtener el precio mínimo y máximo
                  const prices = product.variants.map(v => Number(v.price));
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  
                  displayPrice = minPrice;
                  
                  // Si hay diferentes precios, mostrar "Desde"
                  if (minPrice !== maxPrice) {
                    pricePrefix = "Desde ";
                  }
                }

                return (
                  <div
                    key={product.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4 hover:bg-slate-50"
                  >
                    {/* Mobile Layout */}
                    <div className="flex gap-3 sm:hidden">
                      {/* Image - Mobile */}
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {getProductImageUrl(product.images as any) ? (
                          <Image
                            src={getProductImageUrl(product.images as any)!}
                            alt={getProductImageAlt(product.images as any, product.name)}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            Sin imagen
                          </div>
                        )}
                      </div>

                      {/* Info - Mobile */}
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/admin/productos/${product.id}`}
                            className="font-semibold text-sm hover:underline line-clamp-2"
                          >
                            {product.name}
                          </Link>
                          <div className="flex flex-wrap gap-1">
                            {!product.active && (
                              <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                            )}
                            {product.featured && (
                              <Badge variant="default" className="text-xs">Destacado</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {product.categories && product.categories.length > 0
                            ? product.categories.map(pc => pc.category.name).join(", ")
                            : "Sin categoría"}
                        </div>
                        {product.hasVariants && (
                          <div className="text-xs text-muted-foreground">
                            {product.variants.length} variantes
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop Image */}
                    <div className="hidden sm:block relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                      {getProductImageUrl(product.images as any) ? (
                        <Image
                          src={getProductImageUrl(product.images as any)!}
                          alt={getProductImageAlt(product.images as any, product.name)}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    {/* Desktop Info */}
                    <div className="hidden sm:block flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/productos/${product.id}`}
                          className="font-semibold hover:underline"
                        >
                          {product.name}
                        </Link>
                        {!product.active && (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                        {product.featured && (
                          <Badge variant="default">Destacado</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {product.categories && product.categories.length > 0
                          ? product.categories.map(pc => pc.category.name).join(", ")
                          : "Sin categoría"}
                        {product.sku && ` • SKU: ${product.sku}`}
                        {product.hasVariants && ` • ${product.variants.length} variantes`}
                      </div>
                    </div>

                    {/* Price & Stock - Combined for Mobile */}
                    <div className="flex items-center justify-between sm:block sm:text-right">
                      <div>
                        <p className="font-semibold text-sm sm:text-base">
                          {pricePrefix}{formatPrice(displayPrice)}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Stock: {totalStock}
                        </p>
                      </div>

                      {/* Actions - Mobile (right side) */}
                      <div className="flex gap-2 sm:hidden">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/productos/${product.slug}`} target="_blank">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {/* ⭐ CAMBIO: Solo mostrar si tiene permiso de editar */}
                        {canEdit && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/productos/${product.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {/* ⭐ CAMBIO: Solo mostrar si tiene permiso de eliminar */}
                        {canDelete && (
                          <DeleteProductButton 
                            productId={product.id} 
                            productName={product.name} 
                          />
                        )}
                      </div>
                    </div>

                    {/* Actions - Desktop */}
                    <div className="hidden sm:flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/productos/${product.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {/* ⭐ CAMBIO: Solo mostrar si tiene permiso de editar */}
                      {canEdit && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/productos/${product.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {/* ⭐ CAMBIO: Solo mostrar si tiene permiso de eliminar */}
                      {canDelete && (
                        <DeleteProductButton 
                          productId={product.id} 
                          productName={product.name} 
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}