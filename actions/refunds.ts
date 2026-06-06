"use server";

/**
 * Reembolso de una orden desde el admin.
 *
 * Orden de operaciones (importa por seguridad financiera):
 *   1. Verificar permiso `orders:refund`.
 *   2. Devolver el dinero en la pasarela — por ahora SOLO MercadoPago. Si falla,
 *      abortamos sin tocar la orden (no marcamos REFUNDED si no hubo devolución).
 *   3. Aplicar los efectos idempotentes (estado, stock, puntos, email).
 *
 * Para métodos distintos de MercadoPago (Culqi/PayPal/Yape/Plin/COD) todavía no
 * hay devolución automática: se registra el reembolso y sus efectos, pero el
 * dinero debe devolverse manualmente en la pasarela. `automatic` lo indica para
 * que la UI muestre el mensaje correcto.
 */

import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import { refundMercadoPagoPayment } from "@/lib/mercadopago/refund";
import { applyRefund } from "@/lib/orders/apply-refund";

export interface RefundOrderResult {
  success: boolean;
  /** true si el dinero se devolvió automáticamente vía API (MercadoPago). */
  automatic?: boolean;
  error?: string;
}

export async function refundOrder({
  orderId,
  adminNotes,
}: {
  orderId: string;
  adminNotes?: string;
}): Promise<RefundOrderResult> {
  const userId = await protectRoute("orders:refund");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, paymentStatus: true, paymentMethod: true, paymentId: true },
  });
  if (!order) return { success: false, error: "Orden no encontrada." };
  if (order.paymentStatus !== "PAID") {
    return { success: false, error: "Solo se pueden reembolsar órdenes pagadas." };
  }

  // 1. Devolver el dinero en la pasarela (solo MercadoPago por ahora).
  let automatic = false;
  if (order.paymentMethod === "MERCADOPAGO") {
    if (!order.paymentId) {
      return {
        success: false,
        error: "La orden no tiene un pago de MercadoPago asociado.",
      };
    }
    const refund = await refundMercadoPagoPayment(order.paymentId);
    if (!refund.ok) {
      return {
        success: false,
        error: refund.error ?? "No se pudo procesar el reembolso en MercadoPago.",
      };
    }
    automatic = true;
  }

  // 2. Aplicar efectos (estado REFUNDED, stock, puntos, email) idempotentemente.
  const result = await applyRefund(orderId, { source: "admin", userId, adminNotes });
  if (!result.ok) {
    // Caso delicado: si ya devolvimos el dinero en MercadoPago pero falló el
    // registro interno, el admin DEBE saberlo (el dinero ya salió). Reintentar
    // es seguro: el idempotency key evita una segunda devolución.
    if (automatic) {
      console.error(
        `[refund] CRÍTICO: dinero devuelto en MercadoPago para orden ${orderId} pero applyRefund falló: ${result.error}`
      );
      return {
        success: false,
        error:
          "El dinero YA se devolvió en MercadoPago, pero no se pudo actualizar la orden. Vuelve a intentar (no se cobrará dos veces) o contacta soporte.",
      };
    }
    return { success: false, error: result.error ?? "Error al aplicar el reembolso." };
  }

  return { success: true, automatic };
}
