/**
 * Efectos posteriores a confirmar un pago con Culqi. Server-only.
 *
 * Existe porque Culqi tiene DOS caminos que pueden confirmar la misma orden —la
 * server action `processCardPayment` y el webhook `charge.succeeded`— y hasta
 * ahora sólo el primero disparaba lealtad, SUNAT y el correo de confirmación.
 * Cuando ganaba el webhook (el caso típico: la petición de la action murió por
 * red pero el cargo sí se creó) el cliente nunca recibía confirmación y el
 * comprobante electrónico no se emitía.
 *
 * Ejecutarlos aquí es seguro precisamente porque ambos caminos pasan antes por
 * `claimOrderAsPaid`: sólo uno gana el claim, así que estos efectos —que NO son
 * todos idempotentes, en particular el correo— corren una sola vez.
 *
 * Ninguno puede tumbar la confirmación del pago: el dinero ya se cobró y la
 * orden ya está PAGADA. Un fallo aquí se registra y se sigue.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";
import { onOrderPaid } from "@/lib/loyalty/award-purchase";

const log = logger.child({ module: "culqi-post-payment" });

/**
 * Corre lealtad + SUNAT + correo para una orden recién marcada como pagada.
 *
 * Llamar SÓLO cuando el claim de pago prosperó (`outcome: "claimed"`).
 */
export async function runCulqiPostPaymentEffects(orderId: string): Promise<void> {
  // Lealtad: idempotente por sí misma, pero sí queremos que un fallo aquí no
  // impida emitir el comprobante ni avisar al cliente.
  try {
    await onOrderPaid(orderId);
  } catch (error) {
    log.error({ err: error, orderId }, "Loyalty accrual failed (payment still confirmed)");
  }

  try {
    const { autoEmitOnPayment } = await import("@/actions/sunat");
    await autoEmitOnPayment(orderId);
  } catch (error) {
    log.error({ err: error, orderId }, "SUNAT auto-emission failed (payment still confirmed)");
  }

  try {
    await sendCulqiConfirmationEmail(orderId);
  } catch (error) {
    log.error({ err: error, orderId }, "Confirmation email failed (payment still confirmed)");
  }
}

/**
 * Relee la orden en vez de recibirla del llamador: los dos caminos de Culqi la
 * cargaron ANTES del claim, y entre esa lectura y ahora la orden cambió (es
 * justo lo que hizo el claim). Para el correo importa el estado ya escrito.
 */
async function sendCulqiConfirmationEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  const { sendOrderConfirmationEmail } = await import("@/lib/email");
  const settings = await getSiteSettings();
  const orderNumber = displayOrderNumber(order, settings.order_prefix || "PED");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  await sendOrderConfirmationEmail({
    orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    total: Number(order.total),
    paymentMethod: "CARD",
    viewOrderLink: `${baseUrl}/orden/${order.id}/confirmacion?token=${order.viewToken}`,
    items: order.items.map((item) => ({
      name: item.name,
      variantName: item.variantName || undefined,
      quantity: item.quantity,
      price: Number(item.price),
      image: item.image || undefined,
      customDesignImages:
        (item.customDesignImages as unknown as Array<{ zoneId: string; url: string }> | null) ??
        undefined,
    })),
    shippingAddress: order.shippingAddress as unknown as {
      address: string;
      district: string;
      city: string;
      department: string;
    },
  });
}
