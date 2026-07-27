/**
 * Aprobación y rechazo de pagos manuales (Yape/Plin), server-only.
 *
 * Fuente ÚNICA de verdad para ambas operaciones. Antes vivían duplicadas en
 * `/api/admin/payments/{approve,reject}` y en `actions/pending-payments.ts`,
 * y las dos copias habían divergido: la ruta descontaba stock dentro de una
 * transacción, mientras que el Server Action —el que realmente usa la UI del
 * admin— marcaba la orden PAID con dos `update` sueltos y sin tocar el
 * inventario. Como Yape/Plin tampoco descuentan al crear la orden (el checkout
 * salta el decremento para pagos de verificación manual), esos pedidos NUNCA
 * reservaban stock: se podía vender la misma última unidad indefinidamente.
 *
 * IDEMPOTENTE: el claim atómico `updateMany(where status="pending")` garantiza
 * que los efectos (stock, lealtad, historial) ocurran exactamente una vez
 * aunque dos administradores pulsen aprobar a la vez.
 */

import "server-only";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit-log";
import { onOrderPaid } from "@/lib/loyalty/award-purchase";
import {
  decrementStockAtomic,
  StockUnavailableError,
} from "@/lib/inventory/decrement-stock";
import { releaseOrderStock } from "@/lib/inventory/release-order-stock";

const log = logger.child({ module: "verify-pending-payment" });

export interface VerifyActor {
  id: string;
  email?: string | null;
}

export type VerifyPaymentResult =
  | { ok: true; orderId: string; orderNumber: string; alreadyProcessed?: boolean }
  | { ok: false; error: string; code?: "STOCK_UNAVAILABLE" | "NOT_FOUND" | "CONFLICT" };

function revalidateAdmin(orderId: string): void {
  revalidatePath("/admin/pagos-pendientes");
  revalidatePath("/admin/ordenes");
  revalidatePath(`/admin/ordenes/${orderId}`);
}

// ============================================================
// APROBAR
// ============================================================

export async function approvePendingPayment(
  paymentId: string,
  actor: VerifyActor,
): Promise<VerifyPaymentResult> {
  const payment = await prisma.pendingPayment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { items: true } } },
  });

  if (!payment) {
    return { ok: false, error: "Pago pendiente no encontrado", code: "NOT_FOUND" };
  }

  const order = payment.order;
  if (!order) {
    return { ok: false, error: "Orden no encontrada", code: "NOT_FOUND" };
  }

  let claimed = false;
  try {
    await prisma.$transaction(async (tx) => {
      // Claim atómico: sólo prospera si el pago seguía pendiente. Un segundo
      // aprobador simultáneo verá count 0 y no repetirá los efectos.
      const claim = await tx.pendingPayment.updateMany({
        where: { id: paymentId, status: "pending" },
        data: {
          status: "verified",
          verifiedAt: new Date(),
          verifiedBy: actor.id,
        },
      });
      if (claim.count === 0) return;
      claimed = true;

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paymentStatus: "PAID",
          paidAt: new Date(),
        },
      });

      // Yape/Plin no descuentan al crear la orden: el inventario se retira
      // aquí, al confirmarse el pago. Guarda TOCTOU-safe; si el stock se agotó
      // entre la compra y la aprobación, toda la transacción revierte y el
      // admin debe reconciliar a mano.
      for (const item of order.items) {
        if (!item.productId && !item.variantId) continue;

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
            variantId: item.variantId ?? undefined,
            type: "SALE",
            quantity: -item.quantity,
            reason: `Venta - Orden #${order.orderNumber} (pago aprobado)`,
            reference: order.id,
            userId: actor.id,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof StockUnavailableError) {
      return { ok: false, error: error.message, code: "STOCK_UNAVAILABLE" };
    }
    throw error;
  }

  if (!claimed) {
    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      alreadyProcessed: true,
    };
  }

  // Efectos fuera de la transacción: idempotentes por su cuenta y no deben
  // mantener locks de BD tomados mientras hablan con servicios externos.
  await onOrderPaid(order.id);

  // Emisión del comprobante electrónico. Sólo lo hacía el Server Action, no la
  // ruta API; al unificar se conserva para ambos. Nunca debe tumbar una
  // aprobación ya confirmada.
  try {
    const { autoEmitOnPayment } = await import("@/actions/sunat");
    await autoEmitOnPayment(order.id);
  } catch (emitError) {
    log.error(
      { err: emitError, orderId: order.id },
      "SUNAT auto-emission failed (payment still approved)",
    );
  }

  await logAudit({
    action: "payment.approved",
    userId: actor.id,
    userEmail: actor.email ?? undefined,
    entityType: "PendingPayment",
    entityId: paymentId,
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(payment.amount),
      method: payment.method,
    },
  });

  log.info(
    { paymentId, orderId: order.id, orderNumber: order.orderNumber, userId: actor.id },
    "Pending payment approved",
  );

  revalidateAdmin(order.id);

  return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
}

// ============================================================
// RECHAZAR
// ============================================================

export async function rejectPendingPayment(
  paymentId: string,
  reason: string | undefined,
  actor: VerifyActor,
): Promise<VerifyPaymentResult> {
  const payment = await prisma.pendingPayment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment) {
    return { ok: false, error: "Pago pendiente no encontrado", code: "NOT_FOUND" };
  }

  const order = payment.order;
  if (!order) {
    return { ok: false, error: "Orden no encontrada", code: "NOT_FOUND" };
  }

  let claimed = false;
  await prisma.$transaction(async (tx) => {
    const claim = await tx.pendingPayment.updateMany({
      where: { id: paymentId, status: "pending" },
      data: {
        status: "rejected",
        rejectionReason: reason || "Pago no verificado",
        verifiedBy: actor.id,
      },
    });
    if (claim.count === 0) return;
    claimed = true;

    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "FAILED",
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    // Devuelve sólo lo que la orden retenga de verdad. Para Yape/Plin eso
    // suele ser nada (nunca se descontó), y ésa es justamente la razón de
    // consultarlo en vez de sumar item.quantity a ciegas.
    await releaseOrderStock(tx, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      reason: `Rechazo de pago por ${actor.email || actor.id}`,
      userId: actor.id,
    });
  });

  if (!claimed) {
    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      alreadyProcessed: true,
    };
  }

  await logAudit({
    action: "payment.rejected",
    userId: actor.id,
    userEmail: actor.email ?? undefined,
    entityType: "PendingPayment",
    entityId: paymentId,
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(payment.amount),
      method: payment.method,
      reason: reason ?? null,
    },
  });

  log.info(
    { paymentId, orderId: order.id, orderNumber: order.orderNumber, userId: actor.id },
    "Pending payment rejected",
  );

  revalidateAdmin(order.id);

  return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
}
