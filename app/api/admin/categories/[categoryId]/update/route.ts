import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { updateCategorySchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { invalidateActiveRootCategories } from "@/lib/cache/invalidate";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("categories:update");
  if (authResponse) return authResponse;

  try {
    const { categoryId } = await params;
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = updateCategorySchema.parse(data);

    console.log(`🔄 Actualizando categoría ${categoryId} por usuario ${user.id}`);

    // Actualizar categoría en transacción
    const category = await prisma.$transaction(async (tx) => {
      // 1. Actualizar categoría base
      const updated = await tx.category.update({
        where: { id: categoryId },
        data: {
          name: validatedData.name,
          slug: validatedData.slug,
          description: validatedData.description || null,
          image: validatedData.image || null,
          metaTitle: validatedData.metaTitle || null,
          metaDescription: validatedData.metaDescription || null,
          collectionType: validatedData.collectionType || "MANUAL",
          active: validatedData.active ?? true,
          order: validatedData.order || 0,
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
        }
      }

      return updated;
    });

    console.log(`✅ Categoría actualizada por usuario ${user.id}:`, category.name);

    // Revalidar rutas para actualizar cache
    revalidatePath("/");
    revalidatePath("/admin/categorias");
    revalidatePath(`/admin/categorias/${categoryId}`);
    revalidatePath(`/productos`);
    invalidateActiveRootCategories();

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    
    // Manejo de errores de validación Zod
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al actualizar la categoría" },
      { status: 500 }
    );
  }
}