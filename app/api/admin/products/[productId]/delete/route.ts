import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("products.delete");
  if (authResponse) return authResponse;

  try {
    const { productId } = await params;

    // Verificar si el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        orderItems: {
          select: { id: true },
        },
        variants: {
          select: { id: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // ✅ YA NO BLOQUEAMOS LA ELIMINACIÓN SI HAY ÓRDENES
    // Los OrderItems ahora tienen onDelete: SetNull, entonces:
    // - productId y variantId se ponen NULL automáticamente
    // - El snapshot (name, price, image, etc.) permanece intacto
    
    // Info para logging
    const hasOrders = product.orderItems.length > 0;
    const variantsCount = product.variants.length;

    console.log("🗑️ Eliminando producto:", {
      id: productId,
      name: product.name,
      hasOrders,
      ordersCount: product.orderItems.length,
      variantsCount,
      deletedBy: user.id,
      deletedByEmail: user.email,
    });

    // Eliminar producto
    // Las variantes se eliminan por onDelete: Cascade
    // Los OrderItems se desvinculan por onDelete: SetNull
    await prisma.product.delete({
      where: { id: productId },
    });

    console.log(`✅ Producto eliminado exitosamente por usuario ${user.id}`);

    if (hasOrders) {
      console.log(
        `ℹ️ ${product.orderItems.length} órdenes desvinculadas (snapshot preservado)`
      );
    }

    // Revalidar rutas para actualizar caché
    revalidatePath("/admin/productos");
    revalidatePath(`/admin/productos/${productId}`);
    revalidatePath(`/productos/${product.slug}`);

    return NextResponse.json({
      success: true,
      message: hasOrders
        ? `Producto eliminado. ${product.orderItems.length} órdenes mantienen su historial.`
        : "Producto eliminado exitosamente.",
    });
  } catch (error) {
    console.error("❌ Error al eliminar producto:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}