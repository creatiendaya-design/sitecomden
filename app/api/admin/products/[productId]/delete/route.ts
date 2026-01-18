import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    // Verificar si el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        orderItems: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si tiene órdenes asociadas
    if (product.orderItems.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el producto porque tiene órdenes asociadas. Puedes desactivarlo en su lugar.",
        },
        { status: 400 }
      );
    }

    // Eliminar producto (las variantes se eliminan automáticamente por onDelete: Cascade)
    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}