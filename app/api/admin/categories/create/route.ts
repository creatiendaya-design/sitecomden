import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applySmartCollectionConditions } from "@/lib/smart-collections";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data.name || !data.slug) {
      return NextResponse.json(
        { error: "Nombre y slug son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el slug no exista
    const existingCategory = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese slug" },
        { status: 400 }
      );
    }

    // Extraer URL de imagen si viene como objeto
    let imageUrl = null;
    if (data.image) {
      if (typeof data.image === "string") {
        imageUrl = data.image;
      } else if (typeof data.image === "object" && data.image.url) {
        imageUrl = data.image.url;
      }
    }

    // Crear categoría con transacción
    const category = await prisma.$transaction(async (tx) => {
      // 1. Crear categoría
      const newCategory = await tx.category.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          image: imageUrl,
          metaTitle: data.metaTitle || null,
          metaDescription: data.metaDescription || null,
          collectionType: data.collectionType || "MANUAL",
          parentId: data.parentId || null,
          active: data.active ?? true,
          order: parseInt(data.order) || 0,
        },
      });

      // 2. Si es MANUAL, asignar productos
      if (data.collectionType === "MANUAL" && data.selectedProductIds && data.selectedProductIds.length > 0) {
        await tx.productCategory.createMany({
          data: data.selectedProductIds.map((productId: string) => ({
            productId,
            categoryId: newCategory.id,
          })),
          skipDuplicates: true,
        });
      }

      // 3. Si es SMART, crear condiciones
      if (data.collectionType === "SMART" && data.conditions && data.conditions.length > 0) {
        await tx.categoryCondition.createMany({
          data: data.conditions.map((condition: any) => ({
            categoryId: newCategory.id,
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
            relation: data.conditionRelation || "AND",
          })),
        });
      }

      return newCategory;
    });

    // 4. Si es SMART, aplicar condiciones DESPUÉS de la transacción
    if (data.collectionType === "SMART" && data.conditions && data.conditions.length > 0) {
      await applySmartCollectionConditions(
        category.id,
        data.conditions,
        data.conditionRelation || "AND"
      );
    }

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Error al crear categoría:", error);
    return NextResponse.json(
      { error: "Error al crear categoría" },
      { status: 500 }
    );
  }
}