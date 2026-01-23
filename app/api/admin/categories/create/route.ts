import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validaciones básicas
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

    // Crear categoría en transacción
    const category = await prisma.$transaction(async (tx) => {
      // 1. Crear categoría base
      const newCategory = await tx.category.create({
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

      // 2. Si es colección MANUAL, agregar productos
      if (
        data.collectionType === "MANUAL" &&
        data.selectedProductIds &&
        data.selectedProductIds.length > 0
      ) {
        await tx.productCategory.createMany({
          data: data.selectedProductIds.map((productId: string) => ({
            categoryId: newCategory.id,
            productId,
          })),
        });
      }

      // 3. Si es colección SMART, crear condiciones
      if (
        data.collectionType === "SMART" &&
        data.conditions &&
        data.conditions.length > 0
      ) {
        await tx.categoryCondition.createMany({
          data: data.conditions.map((condition: any) => ({
            categoryId: newCategory.id,
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
          })),
        });

        // TODO: Evaluar condiciones y agregar productos automáticamente
      }

      return newCategory;
    });

    // ✅ CRÍTICO: Revalidar rutas para actualizar cache
    revalidatePath("/");  // Home page
    revalidatePath("/admin/categorias");
    revalidatePath(`/productos`);  // Página de productos
    
    console.log("✅ Categoría creada y cache revalidado:", category.name);

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Error al crear categoría:", error);
    return NextResponse.json(
      { error: "Error al crear la categoría" },
      { status: 500 }
    );
  }
}