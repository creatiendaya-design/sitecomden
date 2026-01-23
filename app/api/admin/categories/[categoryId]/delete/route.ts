import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params;

    console.log("🗑️ Eliminando categoría:", categoryId);

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

    // ✅ CRÍTICO: Revalidar rutas para actualizar cache
    revalidatePath("/");  // Home page
    revalidatePath("/admin/categorias");
    revalidatePath(`/productos`);  // Página de productos
    
    console.log("✅ Categoría eliminada y cache revalidado:", category.name);

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