export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hasPermissions } from "@/lib/permissions";
import { getCurrentUserId } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BulkEditTable from "@/components/admin/products/BulkEditTable";

interface BulkEditPageProps {
  searchParams: Promise<{ ids?: string }>;
}

export default async function BulkEditProductsPage({ searchParams }: BulkEditPageProps) {
  const userId = await getCurrentUserId();
  const perms = await hasPermissions(userId, ["products:view", "products:edit"]);
  if (!perms["products:view"] || !perms["products:edit"]) {
    redirect("/admin/dashboard");
  }

  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (ids.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Bulk editor</h1>
        <p className="text-muted-foreground">
          No se seleccionaron productos. Vuelve a la lista y selecciona productos para editar.
        </p>
        <Button asChild>
          <Link href="/admin/productos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a productos
          </Link>
        </Button>
      </div>
    );
  }

  const [products, categories, landingTemplates, sizeGuides, customizableTemplates] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        categories: { include: { category: true } },
        variants: {
          select: {
            id: true,
            sku: true,
            price: true,
            compareAtPrice: true,
            stock: true,
            image: true,
            options: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.landingTemplate.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.sizeGuide.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.customizableTemplate.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const orderedProducts = ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is (typeof products)[number] => !!p);

  const rows = orderedProducts.flatMap((p) => {
    const variantPrices = p.variants.map((v) => Number(v.price));
    const variantStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
    const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : null;
    const maxVariantPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : null;

    const productRow = {
      kind: "product" as const,
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      images: p.images as unknown,
      hasVariants: p.hasVariants,
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      stock: p.stock,
      active: p.active,
      featured: p.featured,
      landingTemplateId: p.landingTemplateId,
      sizeGuideId: p.sizeGuideId,
      customizableTemplateId: p.customizableTemplateId,
      categoryId: p.categories[0]?.categoryId ?? null,
      variantCount: p.variants.length,
      variantStock,
      minVariantPrice,
      maxVariantPrice,
    };

    const variantRows = p.hasVariants
      ? p.variants.map((v) => ({
          kind: "variant" as const,
          id: v.id,
          productId: p.id,
          productName: p.name,
          optionsLabel: Object.values((v.options ?? {}) as Record<string, string>).join(" / "),
          image: v.image,
          sku: v.sku,
          price: Number(v.price),
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
          stock: v.stock,
        }))
      : [];

    return [productRow, ...variantRows];
  });

  return (
    <BulkEditTable
      initialRows={rows}
      categories={categories}
      landingTemplates={landingTemplates}
      sizeGuides={sizeGuides}
      customizableTemplates={customizableTemplates}
    />
  );
}
