import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import ExportForm from "./ExportForm";

export default async function ExportProductsPage() {
  await protectRoute("products:view");

  const categories = await prisma.category.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <ExportForm categories={categories} />;
}
