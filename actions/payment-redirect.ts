"use server";

/**
 * Arranca el pago en una pasarela externa (Mercado Pago / PayPal) y devuelve la
 * URL a la que redirigir al cliente, SIN página intermedia.
 *
 * Antes el flujo pasaba por una pantalla puente (`/orden/[id]/pago-mercadopago`
 * o `/pago-paypal`) cuyo único trabajo de servidor era crear la preferencia/orden
 * de pago. Ese paso confundía al cliente (un botón que se auto-redirigía). Ahora
 * el botón principal del checkout llama a esta acción y salta directo a la
 * pantalla segura de la pasarela. Las páginas puente se conservan solo como
 * respaldo (manejo de error / reintento / navegación directa).
 */

import { prisma } from "@/lib/db";
import { canViewOrder } from "@/lib/orders/order-access";
import { canStartPayment } from "@/lib/payments/order-payable";
import { createCheckoutPreference } from "@/lib/mercadopago/client";
import { buildPreferenceInput } from "@/lib/mercadopago/preference-input";
import { createPaypalOrder } from "@/lib/paypal/client";
import { readPaypalSettings, convertPenToCharge } from "@/lib/paypal/config";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";
import { publicSiteUrl } from "@/lib/site-url";

// URL canónica resuelta por petición — ver lib/site-url.ts.

export interface StartGatewayCheckoutResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

/**
 * Crea la preferencia (MP) / orden (PayPal) de la orden indicada y devuelve la
 * URL de pago. Autoriza con el viewToken (el cliente que acaba de crear la orden
 * lo tiene). Si falla, el llamador debe caer a la página puente correspondiente
 * que muestra el error con opción de reintento.
 */
export async function startGatewayCheckout(
  orderId: string,
  viewToken?: string
): Promise<StartGatewayCheckoutResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { success: false, error: "Orden no encontrada." };
  }

  const allowed = await canViewOrder({
    orderId: order.id,
    viewToken: order.viewToken,
    urlToken: viewToken,
  });
  if (!allowed) {
    return { success: false, error: "No autorizado." };
  }

  // Antes esto sólo bloqueaba `PAID`, así que una orden CANCELADA o REEMBOLSADA
  // —que ya devolvió su stock— seguía obteniendo una URL de pago perfectamente
  // cobrable. El predicado compartido cubre además la reserva vencida y el pago
  // en verificación. Ver `lib/payments/order-payable.ts`.
  const payable = canStartPayment(order);
  if (!payable.canStart) {
    return { success: false, error: payable.message };
  }

  const settings = await getSiteSettings();
  const orderDisplayNumber = displayOrderNumber(order, settings.order_prefix || "PED");

  if (order.paymentMethod === "MERCADOPAGO") {
    const preference = await createCheckoutPreference(
      buildPreferenceInput(order, orderDisplayNumber, publicSiteUrl())
    );
    if (!preference.success || !preference.redirectUrl) {
      return { success: false, error: preference.error ?? "No se pudo iniciar el pago." };
    }
    return { success: true, redirectUrl: preference.redirectUrl };
  }

  if (order.paymentMethod === "PAYPAL") {
    const paypalSettings = await readPaypalSettings();
    const chargeAmount = convertPenToCharge(Number(order.total), paypalSettings.exchangeRate);
    if (chargeAmount === null) {
      return {
        success: false,
        error: "PayPal no está disponible en este momento. Contacta a la tienda.",
      };
    }
    const created = await createPaypalOrder({
      orderId: order.id,
      orderDisplayNumber,
      amount: chargeAmount,
      currency: paypalSettings.currency,
      viewToken: order.viewToken,
      baseUrl: publicSiteUrl(),
      brandName: settings.site_name || "Tienda",
    });
    if (!created.success || !created.approveUrl) {
      return { success: false, error: created.error ?? "No se pudo iniciar el pago." };
    }
    return { success: true, redirectUrl: created.approveUrl };
  }

  return { success: false, error: "Método de pago no soportado para redirección directa." };
}
