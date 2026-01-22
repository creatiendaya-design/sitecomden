import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import EditProductForm from "@/components/admin/EditProductForm";

interface EditProductPageProps {
  params: Promise<{
    productId: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { productId } = await params;

  // Obtener producto con todas sus relaciones
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      variants: {
        orderBy: { createdAt: "asc" },
      },
      options: {
        include: {
          values: {
            orderBy: { position: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Obtener categorías activas
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  // ✅ Serializar categorías (igual que en NewProductPage)
  const serializedCategories = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
  }));

  // Serializar datos para el cliente
  const serializedProduct = {
    ...product,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    weight: product.weight ? Number(product.weight) : null,
    variants: product.variants.map((v) => ({
      ...v,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      weight: v.weight ? Number(v.weight) : null,
    })),
  };

  return <EditProductForm product={serializedProduct} categories={serializedCategories} />;
}