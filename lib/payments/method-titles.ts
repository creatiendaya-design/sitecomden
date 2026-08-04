/**
 * Títulos editables de las filas de método de pago del checkout.
 *
 * Ojo con la granularidad: las filas NO son 1:1 con los toggles de admin.
 * `mercadopago` gobierna DOS filas ("Tarjeta con Mercado Pago" y "Mercado
 * Pago"), así que los títulos se guardan por fila (`PaymentMethodRow`, el mismo
 * valor que viaja en el radio group) y no por clave de configuración.
 *
 * Un título vacío significa "usar el de fábrica": así el admin puede limpiar el
 * campo para volver al texto por defecto sin necesidad de un botón "resetear".
 */

export const PAYMENT_METHOD_ROWS = [
  "YAPE",
  "PLIN",
  "CARD",
  "PAYPAL",
  "MERCADOPAGO_CARD",
  "MERCADOPAGO",
] as const;

export type PaymentMethodRow = (typeof PAYMENT_METHOD_ROWS)[number];

/** Títulos tal como se guardan: valor vacío = usar el default. */
export type PaymentMethodTitles = Record<PaymentMethodRow, string>;

export const DEFAULT_PAYMENT_METHOD_TITLES: PaymentMethodTitles = {
  YAPE: "Yape",
  PLIN: "Plin",
  CARD: "Tarjeta de crédito o débito",
  PAYPAL: "PayPal",
  MERCADOPAGO_CARD: "Tarjeta con Mercado Pago",
  MERCADOPAGO: "Mercado Pago",
};

/** Máximo razonable para una fila del checkout; evita romper el layout. */
export const PAYMENT_METHOD_TITLE_MAX_LENGTH = 60;

/** Títulos vacíos: el estado inicial del formulario de admin. */
export function emptyPaymentMethodTitles(): PaymentMethodTitles {
  return PAYMENT_METHOD_ROWS.reduce((acc, row) => {
    acc[row] = "";
    return acc;
  }, {} as PaymentMethodTitles);
}

/**
 * Normaliza lo que venga de la BD (Json sin tipar) a un objeto completo.
 * Descarta claves desconocidas, tipos no-string y recorta a la longitud máxima.
 */
export function normalizePaymentMethodTitles(raw: unknown): PaymentMethodTitles {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return PAYMENT_METHOD_ROWS.reduce((acc, row) => {
    const value = source[row];
    acc[row] =
      typeof value === "string"
        ? value.trim().slice(0, PAYMENT_METHOD_TITLE_MAX_LENGTH)
        : "";
    return acc;
  }, {} as PaymentMethodTitles);
}

/** Título efectivo de una fila: el personalizado si existe, si no el default. */
export function resolvePaymentMethodTitle(
  row: PaymentMethodRow,
  titles?: Partial<PaymentMethodTitles>
): string {
  const custom = titles?.[row]?.trim();
  return custom ? custom : DEFAULT_PAYMENT_METHOD_TITLES[row];
}
