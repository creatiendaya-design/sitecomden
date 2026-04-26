export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import EditCategoryForm from "@/components/admin/EditCategoryForm";
import { CategoryDesignSection } from "@/components/admin/categorias/CategoryDesignSection";

interface EditCategoryPageProps {
  params: Promise<{
    categoryId: string;
  }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { categoryId } = await params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: { products: true, categoryBlocks: true },
      },
      products: {
        select: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              basePrice: true,
              images: true,
              active: true,
            },
          },
        },
      },
      conditions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!category) {
    notFound();
  }

  // Serializar precios de productos y aplanar estructura
  const serializedCategory = {
    ...category,
    products: category.products.map((pc) => ({
      ...pc.product,
      basePrice: Number(pc.product.basePrice),
      images: pc.product.images as string[], // Asegurar que sea string[]
    })),
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <CategoryDesignSection
        categoryId={category.id}
        blockCount={category._count.categoryBlocks}
        hideProductGrid={category.hideProductGrid}
      />
      <EditCategoryForm category={serializedCategory} />
    </div>
  );
}