/**
 * Aplica los EFECTOS de un reembolso total sobre una orden (server-only).
 *
 * Es la fuente única de verdad para "esta orden quedó reembolsada": cambia el
 * estado a REFUNDED, devuelve stock al inventario, revierte la lealtad y envía
 * el correo al cliente. NO ejecuta la devolución de dinero en la pasarela — eso
 * lo hace quien llama (la acción admin llama antes a la API de MercadoPago; el
 * webhook se entera de un reembolso hecho desde el panel de MercadoPago).
 *
 * IDEMPOTENTE: un claim atómico `updateMany(where paymentStatus=PAID)` garantiza
 * que los efectos (stock, puntos, email) ocurran EXACTAMENTE una vez aunque se
 * invoque desde varios flujos (acción admin + webhook reintentado).
 */

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";
import { restoreStockForOrder } from "@/lib/inventory/restore-stock";
import { revertLoyaltyForOrder } from "@/lib/loyalty/revert-purchase";
import { getLoyaltySettings } from "@/actions/loyalty";

const log = logger.child({ module: "apply-refund" });

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_URL ||
    "http://localhost:3000"
  );
}

export interface ApplyRefundResult {
  ok: boolean;
  alreadyRefunded?: boolean;
  error?: string;
}

export async function applyRefund(
  orderId: string,
  opts: { source: "admin" | "webhook"; userId?: string; adminNotes?: string }
): Promise<ApplyRefundResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Orden no encontrada." };

  // Solo se reembolsa lo que está pagado. (También evita reembolsar dos veces.)
  if (order.paymentStatus !== "PAID") {
    if (order.paymentStatus === "REFUNDED") {
      return { ok: true, alreadyRefunded: true };
    }
    return { ok: false, error: "La orden no está pagada; no se puede reembolsar." };
  }

  // Settings leídos FUERA de la tx para no abrir otra conexión con locks tomados.
  const loyaltySettings = await getLoyaltySettings();

  let claimed = false;
  try {
    await prisma.$transaction(async (tx) => {
      // Claim atómico: solo prospera si seguía PAID. Un segundo flujo verá count 0.
      const claim = await tx.order.updateMany({
        where: { id: orderId, paymentStatus: "PAID" },
        data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
      });
      if (claim.count === 0) return; // ya reembolsada por otro flujo
      claimed = true;

      await restoreStockForOrder(tx, {
        items: order.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        orderNumber: order.orderNumber,
        orderId: order.id,
        userId: opts.userId,
      });

      await revertLoyaltyForOrder(
        tx,
        {
          id: order.id,
          customerId: order.customerId,
          customerTier: order.customerTier,
          pointsEarned: order.pointsEarned,
          total: order.total,
          orderNumber: order.orderNumber,
        },
        loyaltySettings
      );
    });
  } catch (error) {
    log.error({ err: error, orderId }, "Refund effects transaction failed");
    return { ok: false, error: "No se pudieron aplicar los efectos del reembolso." };
  }

  if (!claimed) return { ok: true, alreadyRefunded: true };

  // Email (no bloquea el resultado del reembolso ya aplicado).
  try {
    const { sendPaymentRefundedEmail } = await import("@/lib/email");
    const settings = await getSiteSettings();
    const orderDisplayNumber = displayOrderNumber(order, settings.order_prefix || "PED");
    const viewOrderLink = `${appBaseUrl()}/orden/verificar?token=${order.viewToken}&email=${encodeURIComponent(order.customerEmail)}`;
    await sendPaymentRefundedEmail(
      orderDisplayNumber,
      order.customerName,
      order.customerEmail,
      Number(order.total),
      viewOrderLink,
      opts.adminNotes
    );
  } catch (emailError) {
    log.error({ err: emailError, orderId }, "Refund email failed (refund still applied)");
  }

  revalidatePath("/admin/ordenes");
  revalidatePath(`/admin/ordenes/${orderId}`);
  revalidatePath("/admin/clientes");

  log.info({ orderId, source: opts.source }, "Refund applied");
  return { ok: true };
}
