import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { approvePaymentSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";
import {
  decrementStockAtomic,
  StockUnavailableError,
} from "@/lib/inventory/decrement-stock";

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

    // Atomic approval: update pending payment + mark order paid + decrement
    // stock with TOCTOU-safe guard. If stock ran out between order creation
    // and approval (concurrent approvals or earlier oversell), the whole
    // transaction rolls back and the admin gets a 409 to reconcile manually.
    try {
      await prisma.$transaction(async (tx) => {
        await tx.pendingPayment.update({
          where: { id: paymentId },
          data: {
            status: "verified",
            verifiedAt: new Date(),
            verifiedBy: user.id,
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "PAID",
            status: "PAID",
            paidAt: new Date(),
          },
        });

        for (const item of order.items) {
          const result = await decrementStockAtomic(tx, {
            productId: item.productId ?? "",
            variantId: item.variantId ?? undefined,
            quantity: item.quantity,
            name: item.name,
          });
          if (!result.ok) {
            throw new StockUnavailableError(result.error ?? "Stock insuficiente");
          }

          await tx.inventoryMovement.create({
            data: {
              productId: item.variantId ? undefined : item.productId,
              variantId: item.variantId || undefined,
              type: "SALE",
              quantity: -item.quantity,
              reason: `Venta - Orden #${order.orderNumber} (pago aprobado)`,
              reference: order.id,
              userId: user.id,
            },
          });
        }
      });
    } catch (txError) {
      if (txError instanceof StockUnavailableError) {
        return NextResponse.json(
          { error: txError.message, code: "STOCK_UNAVAILABLE" },
          { status: 409 },
        );
      }
      throw txError;
    }

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