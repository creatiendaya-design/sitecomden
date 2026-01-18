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
        if (item.variantId) {
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
        } else {
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