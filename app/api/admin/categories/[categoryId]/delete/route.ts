import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params;

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

    // Eliminar la categoría
    // Las relaciones en ProductCategory se eliminan automáticamente por onDelete: Cascade
    // Los productos NO se eliminan, solo se desasocian de esta categoría
    await prisma.category.delete({
      where: { id: categoryId },
    });

    // ✅ CRÍTICO: Revalidar la caché en producción
    // Esto fuerza a Next.js a regenerar la página en el próximo request
    revalidatePath("/admin/categorias");
    revalidatePath("/admin/categorias/[categoryId]", "page");

    return NextResponse.json({ 
      success: true,
      message: category._count.products > 0 
        ? `Categoría eliminada. ${category._count.products} producto(s) desasociado(s).`
        : "Categoría eliminada correctamente."
    });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    return NextResponse.json(
      { error: "Error al eliminar categoría" },
      { status: 500 }
    );
  }
}