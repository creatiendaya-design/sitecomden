import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params;
    const data = await request.json();

    console.log("🔄 Actualizando categoría:", categoryId);

    // Actualizar categoría en transacción
    const category = await prisma.$transaction(async (tx) => {
      // 1. Actualizar categoría base
      const updated = await tx.category.update({
        where: { id: categoryId },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          image: data.image || null,
          metaTitle: data.metaTitle || null,
          metaDescription: data.metaDescription || null,
          collectionType: data.collectionType || "MANUAL",
          active: data.active ?? true,
          order: data.order || 0,
        },
      });

      // 2. Actualizar productos si es MANUAL
      if (data.collectionType === "MANUAL") {
        // Eliminar relaciones existentes
        await tx.productCategory.deleteMany({
          where: { categoryId },
        });

        // Crear nuevas relaciones
        if (data.selectedProductIds && data.selectedProductIds.length > 0) {
          await tx.productCategory.createMany({
            data: data.selectedProductIds.map((productId: string) => ({
              categoryId,
              productId,
            })),
          });
        }
      }

      // 3. Actualizar condiciones si es SMART
      if (data.collectionType === "SMART") {
        // Eliminar condiciones existentes
        await tx.categoryCondition.deleteMany({
          where: { categoryId },
        });

        // Crear nuevas condiciones
        if (data.conditions && data.conditions.length > 0) {
          await tx.categoryCondition.createMany({
            data: data.conditions.map((condition: any) => ({
              categoryId,
              field: condition.field,
              operator: condition.operator,
              value: condition.value,
            })),
          });

          // TODO: Re-evaluar condiciones y actualizar productos
        }
      }

      return updated;
    });

    // ✅ CRÍTICO: Revalidar rutas para actualizar cache
    revalidatePath("/");  // Home page
    revalidatePath("/admin/categorias");
    revalidatePath(`/admin/categorias/${categoryId}`);
    revalidatePath(`/productos`);  // Página de productos
    
    console.log("✅ Categoría actualizada y cache revalidado:", category.name);

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    return NextResponse.json(
      { error: "Error al actualizar la categoría" },
      { status: 500 }
    );
  }
}