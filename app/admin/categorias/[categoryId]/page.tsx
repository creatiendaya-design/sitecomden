import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import EditCategoryForm from "@/components/admin/EditCategoryForm";

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
        select: { products: true },
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
    })),
  };

  return <EditCategoryForm category={serializedCategory} />;
}