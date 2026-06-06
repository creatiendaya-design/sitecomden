/**
 * Reembolso de un pago de MercadoPago (server-only).
 *
 * Ejecuta un reembolso TOTAL contra la API de MercadoPago
 * (`POST /v1/payments/{id}/refunds` con body vacío). Usa el SDK oficial vía
 * fetch directo para no depender de una clase concreta del paquete.
 *
 * Idempotencia: enviamos `X-Idempotency-Key` derivado del paymentId, así que un
 * reintento del mismo reembolso total no genera dos devoluciones.
 *
 * Docs: https://www.mercadopago.com.pe/developers/es/reference/chargebacks/_payments_id_refunds/post
 */

import { logger } from "@/lib/logger";
import { getActiveMercadoPagoKeys } from "./config";

const log = logger.child({ module: "mercadopago-refund" });

export interface RefundResult {
  ok: boolean;
  refundId?: string;
  status?: string;
  error?: string;
}

export async function refundMercadoPagoPayment(paymentId: string): Promise<RefundResult> {
  const keys = await getActiveMercadoPagoKeys();
  if (!keys) {
    return { ok: false, error: "MercadoPago no está configurado." };
  }

  try {
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keys.accessToken}`,
          "Content-Type": "application/json",
          // Total refund → reintentos no duplican la devolución.
          "X-Idempotency-Key": `refund-${paymentId}`,
        },
        // Body vacío = reembolso total del pago.
        body: JSON.stringify({}),
      }
    );

    const data = (await res.json().catch(() => null)) as
      | { id?: number | string; status?: string; message?: string; error?: string }
      | null;

    if (!res.ok) {
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      log.error({ paymentId, status: res.status, body: data }, "MercadoPago refund failed");
      return { ok: false, error: `MercadoPago rechazó el reembolso: ${msg}` };
    }

    // status suele ser "approved"; algunos casos quedan "in_process".
    const status = data?.status ?? "approved";
    if (status === "rejected" || status === "cancelled") {
      log.error({ paymentId, status }, "MercadoPago refund not approved");
      return { ok: false, error: "MercadoPago no aprobó el reembolso." };
    }

    log.info({ paymentId, refundId: data?.id, status }, "MercadoPago refund created");
    return { ok: true, refundId: data?.id != null ? String(data.id) : undefined, status };
  } catch (error) {
    log.error({ err: error, paymentId }, "Error calling MercadoPago refund API");
    return { ok: false, error: "No se pudo contactar a MercadoPago para el reembolso." };
  }
}
