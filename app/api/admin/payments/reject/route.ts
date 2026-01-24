import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { rejectPaymentSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("payments.verify");
  if (authResponse) return authResponse;

  try {
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = rejectPaymentSchema.parse(data);

    const { paymentId, orderId, reason } = validatedData;

    console.log(`❌ Rechazando pago ${paymentId} para orden ${orderId} por usuario ${user.id}`);

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

    // Obtener orden con items para restaurar stock
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

    // Ejecutar todo en transacción
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar pago pendiente
      await tx.pendingPayment.update({
        where: { id: paymentId },
        data: {
          status: "rejected",
          rejectionReason: reason || "Pago no verificado",
          verifiedBy: user.id, // Registrar quién rechazó
        },
      });

      // 2. Actualizar orden
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "FAILED",
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      // 3. Restaurar stock de los productos
      for (const item of order.items) {
        // Solo restaurar stock si el producto/variante aún existe
        
        if (item.variantId) {
          try {
            // Restaurar stock de variante
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });

            await tx.inventoryMovement.create({
              data: {
                variantId: item.variantId,
                type: "RETURN",
                quantity: item.quantity,
                reason: `Devolución - Orden #${order.orderNumber} rechazada por ${user.email || user.id}`,
                reference: order.id,
                userId: user.id,
              },
            });

            console.log(`  ↩️ Stock restaurado - Variante ${item.variantId}: +${item.quantity}`);
          } catch (error) {
            console.log(
              `  ⚠️ Variante ${item.variantId} fue eliminada - No se restaura stock`
            );
          }
        } else if (item.productId) {
          try {
            // Restaurar stock de producto simple
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });

            await tx.inventoryMovement.create({
              data: {
                productId: item.productId,
                type: "RETURN",
                quantity: item.quantity,
                reason: `Devolución - Orden #${order.orderNumber} rechazada por ${user.email || user.id}`,
                reference: order.id,
                userId: user.id,
              },
            });

            console.log(`  ↩️ Stock restaurado - Producto ${item.productId}: +${item.quantity}`);
          } catch (error) {
            console.log(
              `  ⚠️ Producto ${item.productId} fue eliminado - No se restaura stock`
            );
          }
        } else {
          // Producto fue eliminado, no hay stock que restaurar
          console.log(
            `  ⚠️ Item sin producto: ${item.name} - Producto fue eliminado, no se restaura stock`
          );
        }
      }
    });

    console.log(`✅ Pago rechazado exitosamente por usuario ${user.id}:`, {
      paymentId,
      orderId,
      orderNumber: order.orderNumber,
      amount: pendingPayment.amount,
      method: pendingPayment.method,
      reason: reason || "No especificado",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al rechazar pago:", error);

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