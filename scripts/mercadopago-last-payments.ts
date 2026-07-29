/**
 * Lista los últimos intentos de pago recibidos en la cuenta de MercadoPago.
 *
 *   npx tsx scripts/mercadopago-last-payments.ts
 *   npx tsx scripts/mercadopago-last-payments.ts 30    # últimos 30
 *
 * Para qué sirve: cuando el comprador ve "Algo salió mal / No pudimos procesar
 * tu pago", MercadoPago NO dice el motivo en pantalla — pero sí registra el
 * intento con un `status_detail` que lo explica (cc_rejected_*, ya sea fondos,
 * seguridad, datos de la tarjeta, o restricciones de la cuenta vendedora).
 * Este script lee esos registros vía /v1/payments/search.
 *
 * Solo lectura. No modifica nada.
 */

import { readMercadoPagoSettings } from "../lib/mercadopago/config";

const MP_API = "https://api.mercadopago.com";

/** Traducción de los status_detail más comunes de MercadoPago. */
const STATUS_DETAIL_HELP: Record<string, string> = {
  cc_rejected_bad_filled_card_number: "Número de tarjeta mal ingresado.",
  cc_rejected_bad_filled_date: "Fecha de vencimiento mal ingresada.",
  cc_rejected_bad_filled_other: "Algún dato de la tarjeta está mal.",
  cc_rejected_bad_filled_security_code: "CVV mal ingresado.",
  cc_rejected_blacklist: "Tarjeta en lista negra de MercadoPago.",
  cc_rejected_call_for_authorize:
    "El banco exige autorización previa: el titular debe llamar al banco y autorizar el monto.",
  cc_rejected_card_disabled: "Tarjeta no habilitada para compras online. El titular debe activarla con su banco.",
  cc_rejected_card_error: "Error al procesar la tarjeta.",
  cc_rejected_duplicated_payment: "Pago duplicado: ya se hizo un pago igual hace poco.",
  cc_rejected_high_risk:
    "RECHAZO POR PREVENCIÓN DE FRAUDE. Causa típica en pruebas: comprador y vendedor son la misma persona/dispositivo/IP, o cuenta vendedora nueva sin historial.",
  cc_rejected_insufficient_amount: "Fondos insuficientes.",
  cc_rejected_invalid_installments: "La tarjeta no admite esa cantidad de cuotas.",
  cc_rejected_max_attempts: "Se superó el límite de intentos. Hay que esperar (suele ser 24 h) o usar otra tarjeta.",
  cc_rejected_other_reason: "Rechazo genérico del banco emisor.",
  rejected_by_bank: "Rechazado por el banco emisor.",
  rejected_insufficient_data: "Faltan datos del pagador.",
  rejected_by_regulations: "Rechazado por regulaciones / restricciones de la cuenta.",
  payer_unavailable: "El pagador no puede operar (cuenta restringida).",
  collector_unavailable:
    "LA CUENTA VENDEDORA NO PUEDE COBRAR. Suele significar cuenta no validada o sin habilitar para recibir pagos.",
  cannot_pay_yourself: "No puedes pagarte a ti mismo: el pagador es la misma cuenta que cobra.",
};

interface MpPayment {
  id?: number | string;
  date_created?: string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  external_reference?: string;
  payer?: { email?: string; id?: string | number };
}

async function main(): Promise<void> {
  const limit = Number(process.argv[2] || 15);
  const settings = await readMercadoPagoSettings();
  const active = settings.mode === "production" ? settings.production : settings.test;

  if (!active.accessToken) {
    console.error(`No hay access token para el modo activo (${settings.mode}).`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nÚltimos ${limit} intentos de pago — modo ${settings.mode.toUpperCase()}\n`);

  const url = new URL(`${MP_API}/v1/payments/search`);
  url.searchParams.set("sort", "date_created");
  url.searchParams.set("criteria", "desc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${active.accessToken}` },
  });
  const body = (await res.json()) as { results?: MpPayment[] };

  if (!res.ok) {
    console.error(`HTTP ${res.status} al consultar pagos:`);
    console.error(JSON.stringify(body, null, 2));
    process.exitCode = 1;
    return;
  }

  const results = body.results ?? [];
  if (results.length === 0) {
    console.log(
      "Sin pagos registrados.\n\n" +
        "Si el comprador vio 'No pudimos procesar tu pago' y aquí no hay nada, el rechazo\n" +
        "ocurrió ANTES de crear el pago — casi siempre por restricción de la cuenta vendedora\n" +
        "o porque pagador y vendedor son la misma cuenta."
    );
    return;
  }

  for (const p of results) {
    const detail = p.status_detail ?? "";
    console.log("─".repeat(72));
    console.log(`  id:            ${p.id}`);
    console.log(`  fecha:         ${p.date_created}`);
    console.log(`  estado:        ${p.status}  →  ${detail}`);
    if (STATUS_DETAIL_HELP[detail]) {
      console.log(`  QUÉ SIGNIFICA: ${STATUS_DETAIL_HELP[detail]}`);
    }
    console.log(`  monto:         ${p.currency_id ?? ""} ${p.transaction_amount ?? "?"}`);
    console.log(`  medio:         ${p.payment_type_id ?? "?"} / ${p.payment_method_id ?? "?"}`);
    console.log(`  pagador:       ${p.payer?.email ?? "?"} (id ${p.payer?.id ?? "?"})`);
    console.log(`  orden (ref):   ${p.external_reference ?? "(sin external_reference)"}`);
  }
  console.log("─".repeat(72));
  console.log("");
}

main()
  .catch((error) => {
    console.error("\nFallo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../lib/db");
    await prisma.$disconnect();
  });
