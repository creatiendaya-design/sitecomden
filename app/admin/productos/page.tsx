import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl, getProductImageAlt } from "../../../lib/image-utils";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Eye, ExternalLink } from "lucide-react";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

interface ProductsAdminPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
  }>;
}

export default async function ProductsAdminPage({
  searchParams,
}: ProductsAdminPageProps) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona el catálogo de tu tienda
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/productos/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                className="pl-9"
                defaultValue={search}
              />
            </div>
            <select className="rounded-md border px-4">
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

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {products.length} producto{products.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No hay productos</p>
              <Button asChild className="mt-4">
                <Link href="/admin/productos/nuevo">
                  Crear primer producto
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => {
                const totalStock = product.hasVariants
                  ? product.variants.reduce((sum, v) => sum + v.stock, 0)
                  : product.stock;

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 rounded-lg border p-4 hover:bg-slate-50"
                  >
                    {/* Image */}
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
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

                    {/* Info */}
                    <div className="flex-1 space-y-1">
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

                    {/* Price & Stock */}
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatPrice(Number(product.basePrice))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Stock: {totalStock}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/productos/${product.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/productos/${product.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteProductButton 
                        productId={product.id} 
                        productName={product.name} 
                      />
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