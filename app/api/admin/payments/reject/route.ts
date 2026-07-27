import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { rejectPaymentSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { getRequestLogger } from "@/lib/logger";
import { releaseOrderStock } from "@/lib/inventory/release-order-stock";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("payments:verify");
  if (authResponse) return authResponse;

  const log = (await getRequestLogger()).child({ route: "payments/reject" });

  try {
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = rejectPaymentSchema.parse(data);

    const { paymentId, orderId, reason } = validatedData;

    log.info({ paymentId, orderId, userId: user.id }, "Rejecting payment");

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

      // 3. Devolver al inventario SOLO lo que la orden retiene realmente.
      // Antes se hacía increment de item.quantity para cada línea, sin mirar
      // si esta orden llegó a descontar stock: Yape/Plin crean la orden sin
      // tocar el inventario, así que rechazar uno de esos pagos INVENTABA
      // unidades. releaseOrderStock lo deduce del ledger de movimientos.
      const released = await releaseOrderStock(tx, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: `Rechazo de pago por ${user.email || user.id}`,
        userId: user.id,
      });

      log.debug({ orderId: order.id, ...released }, "Stock released on payment rejection");
    });

    log.info(
      {
        paymentId,
        orderId,
        orderNumber: order.orderNumber,
        amount: Number(pendingPayment.amount),
        method: pendingPayment.method,
        reason: reason ?? null,
        userId: user.id,
      },
      "Payment rejected successfully",
    );

    await logAudit({
      action: "payment.rejected",
      userId: user.id,
      userEmail: user.email,
      entityType: "PendingPayment",
      entityId: paymentId,
      metadata: {
        orderId,
        orderNumber: order.orderNumber,
        amount: Number(pendingPayment.amount),
        method: pendingPayment.method,
        reason: reason ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Failed to reject payment");

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