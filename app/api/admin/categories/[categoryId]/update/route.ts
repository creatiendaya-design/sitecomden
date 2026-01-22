import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applySmartCollectionConditions } from "@/lib/smart-collections";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params;
    const data = await request.json();

    // Verificar que el slug no exista en otra categoría
    if (data.slug) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          slug: data.slug,
          NOT: { id: categoryId },
        },
      });

      if (existingCategory) {
        return NextResponse.json(
          { error: "Ya existe otra categoría con ese slug" },
          { status: 400 }
        );
      }
    }

    // Extraer URL de imagen si viene como objeto
    let imageUrl = data.image;
    if (data.image && typeof data.image === "object" && data.image.url) {
      imageUrl = data.image.url;
    }

    // Actualizar categoría con transacción
    const category = await prisma.$transaction(async (tx) => {
      // 1. Actualizar datos básicos
      const updated = await tx.category.update({
        where: { id: categoryId },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          image: imageUrl || null,
          metaTitle: data.metaTitle || null,
          metaDescription: data.metaDescription || null,
          collectionType: data.collectionType || "MANUAL",
          active: data.active ?? true,
          order: parseInt(data.order) || 0,
        },
      });

      // 2. Si es MANUAL, actualizar productos
      if (data.collectionType === "MANUAL") {
        // MEJORA: Limpiar condiciones SMART si existían
        await tx.categoryCondition.deleteMany({
          where: { categoryId },
        });

        // Eliminar todas las relaciones actuales de productos
        await tx.productCategory.deleteMany({
          where: { categoryId },
        });

        // Crear nuevas relaciones para los productos seleccionados
        if (data.selectedProductIds && data.selectedProductIds.length > 0) {
          await tx.productCategory.createMany({
            data: data.selectedProductIds.map((productId: string) => ({
              productId,
              categoryId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 3. Si es SMART, actualizar condiciones
      if (data.collectionType === "SMART") {
        // MEJORA: Limpiar productos MANUALES si existían
        await tx.productCategory.deleteMany({
          where: { categoryId },
        });

        // Eliminar condiciones anteriores
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
              relation: data.conditionRelation || "AND",
            })),
          });
        }
      }

      return updated;
    });

    // 4. Si es SMART, aplicar condiciones DESPUÉS de la transacción
    if (data.collectionType === "SMART" && data.conditions && data.conditions.length > 0) {
      await applySmartCollectionConditions(
        categoryId,
        data.conditions,
        data.conditionRelation || "AND"
      );
    }

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    return NextResponse.json(
      { error: "Error al actualizar categoría" },
      { status: 500 }
    );
  }
}