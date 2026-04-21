import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { approvePaymentSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("payments:verify");
  if (authResponse) return authResponse;

  try {
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = approvePaymentSchema.parse(data);

    const { paymentId, orderId } = validatedData;

    console.log(`✅ Aprobando pago ${paymentId} para orden ${orderId} por usuario ${user.id}`);

    // Verificar que el pago exista y esté pendiente
    const pendingPayment = await prisma.pendingPayment.findUnique({
      where: { id: paymentId },
    });

    if (!pendingPayment) {
      return NextResponse.json(
        { error: "Pago pendiente no encontrado" },
        { status: 404 }
      );
    }

    if (pendingPayment.status !== "pending") {
      return NextResponse.json(
        { error: `El pago ya fue ${pendingPayment.status === "verified" ? "aprobado" : "rechazado"}` },
        { status: 400 }
      );
    }

    // Verificar que la orden exista (incluir items para descontar stock)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Actualizar en transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar pago pendiente
      await tx.pendingPayment.update({
        where: { id: paymentId },
        data: {
          status: "verified",
          verifiedAt: new Date(),
          verifiedBy: user.id,
        },
      });

      // Actualizar orden
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          status: "PAID",
          paidAt: new Date(),
        },
      });

      // Descontar stock ahora que el pago está confirmado (diferido desde createOrder)
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              variantId: item.variantId,
              type: "SALE",
              quantity: -item.quantity,
              reason: `Venta - Orden #${order.orderNumber} (pago aprobado)`,
              reference: order.id,
              userId: user.id,
            },
          });
        } else if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              type: "SALE",
              quantity: -item.quantity,
              reason: `Venta - Orden #${order.orderNumber} (pago aprobado)`,
              reference: order.id,
              userId: user.id,
            },
          });
        }
      }
    });

    console.log(`✅ Pago aprobado exitosamente por usuario ${user.id}:`, {
      paymentId,
      orderId,
      orderNumber: order.orderNumber,
      amount: pendingPayment.amount,
      method: pendingPayment.method,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al aprobar pago:", error);

    // Manejo de errores de validación Zod
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}