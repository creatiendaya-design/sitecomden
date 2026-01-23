import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { paymentId, orderId, reason } = await request.json();

    if (!paymentId || !orderId) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    // Actualizar pago pendiente
    await prisma.pendingPayment.update({
      where: { id: paymentId },
      data: {
        status: "rejected",
        rejectionReason: reason || "Pago no verificado",
      },
    });

    // Actualizar orden
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "FAILED",
        status: "CANCELLED",
      },
    });

    // Restaurar stock de los productos
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (order) {
      for (const item of order.items) {
        // ✅ IMPORTANTE: Solo restaurar stock si el producto/variante aún existe
        // Si fue eliminado, no hay stock que restaurar
        
        if (item.variantId) {
          // Restaurar stock de variante
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });

          await prisma.inventoryMovement.create({
            data: {
              variantId: item.variantId,
              type: "RETURN",
              quantity: item.quantity,
              reason: `Devolución - Orden #${order.orderNumber} rechazada`,
              reference: order.id,
            },
          });
        } else if (item.productId) {  // ✅ CAMBIO: Verificar que productId exista
          // Restaurar stock de producto simple
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          await prisma.inventoryMovement.create({
            data: {
              productId: item.productId,
              type: "RETURN",
              quantity: item.quantity,
              reason: `Devolución - Orden #${order.orderNumber} rechazada`,
              reference: order.id,
            },
          });
        } else {
          // ✅ NUEVO: Producto fue eliminado, no hay stock que restaurar
          console.log(
            `⚠️ Item de orden sin producto: ${item.name} - Producto fue eliminado, no se restaura stock`
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al rechazar pago:", error);
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}