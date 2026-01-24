import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("categories.delete");
  if (authResponse) return authResponse;

  try {
    const { categoryId } = await params;

    console.log(`🗑️ Eliminando categoría ${categoryId} por usuario ${user.id}`);

    // Verificar si existe la categoría
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Eliminar categoría (las relaciones se eliminan por cascade)
    await prisma.category.delete({
      where: { id: categoryId },
    });

    console.log(`✅ Categoría eliminada por usuario ${user.id}:`, category.name);

    if (category._count.products > 0) {
      console.log(`ℹ️ ${category._count.products} productos desvinculados de la categoría`);
    }

    // Revalidar rutas para actualizar cache
    revalidatePath("/");
    revalidatePath("/admin/categorias");
    revalidatePath(`/productos`);

    return NextResponse.json({
      success: true,
      message: "Categoría eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    return NextResponse.json(
      { error: "Error al eliminar la categoría" },
      { status: 500 }
    );
  }
}