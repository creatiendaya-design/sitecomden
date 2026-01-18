import { prisma } from "@/lib/db";
import NewProductForm from "@/components/admin/NewProductForm";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  const serializedCategories = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
  }));

  return <NewProductForm categories={serializedCategories} />;
}