"use server";

/**
 * Confirmación de pago de MercadoPago disparada desde el RETORNO del cliente
 * (back_url success → /orden/[id]/confirmacion?payment_id=...).
 *
 * El webhook (`/api/webhooks/mercadopago`) sigue siendo la fuente principal,
 * pero no siempre llega: en localhost MercadoPago no puede alcanzarlo, y en
 * producción puede retrasarse o fallar. Confirmar también aquí hace que el
 * pedido se marque PAID y el correo se envíe en cuanto el cliente vuelve.
 *
 * Es seguro: `confirmMercadoPagoPayment` re-verifica el pago contra la API de
 * MercadoPago (que esté `approved` y que el monto/moneda coincidan con la orden
 * referenciada) y es idempotente, así que no se puede falsificar ni duplicar.
 */

import {
  confirmMercadoPagoPayment,
  type ConfirmResult,
} from "@/lib/mercadopago/confirm-payment";

/** Derivado de la fuente para que añadir un estado allí no deje esto obsoleto. */
type ConfirmStatus = Extract<ConfirmResult, { ok: true }>["status"];

export type ConfirmReturnResult = {
  ok: boolean;
  status: ConfirmStatus | null;
};

export async function confirmMercadoPagoReturn(
  paymentId: string
): Promise<ConfirmReturnResult> {
  if (!paymentId) return { ok: false, status: null };

  const result = await confirmMercadoPagoPayment(paymentId);
  if (!result.ok) return { ok: false, status: null };

  return { ok: true, status: result.status };
}
