import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createCategorySchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("categories.create");
  if (authResponse) return authResponse;

  try {
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = createCategorySchema.parse(data);

    // Verificar que el slug no exista
    const existingCategory = await prisma.category.findUnique({
      where: { slug: validatedData.slug },
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
      }

      return newCategory;
    });

    console.log(`✅ Categoría creada por usuario ${user.id}:`, category.name);

    // Revalidar rutas para actualizar cache
    revalidatePath("/");
    revalidatePath("/admin/categorias");
    revalidatePath(`/productos`);

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Error al crear categoría:", error);
    
    // Manejo de errores de validación Zod
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear la categoría" },
      { status: 500 }
    );
  }
}