/**
 * Formateo de fechas en la zona horaria de Perú.
 *
 * IMPORTANTE: el servidor (Vercel/Node) corre en UTC. `toLocaleString("es-PE")`
 * solo cambia el idioma/formato, NO la zona horaria, así que sin `timeZone`
 * explícito las fechas se renderizan en UTC (≈5 horas adelantadas respecto a
 * Perú). Estos helpers fijan `America/Lima` para que las fechas mostradas
 * coincidan con la hora local peruana tanto en servidor como en cliente.
 */

export const PERU_TIME_ZONE = "America/Lima";
export const PERU_LOCALE = "es-PE";

/** Fecha corta: "06 jun" */
export function formatPeruDateShort(value: Date | string | number): string {
  return new Date(value).toLocaleDateString(PERU_LOCALE, {
    day: "2-digit",
    month: "short",
    timeZone: PERU_TIME_ZONE,
  });
}

/** Fecha completa: "06 jun 2026" */
export function formatPeruDate(value: Date | string | number): string {
  return new Date(value).toLocaleDateString(PERU_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: PERU_TIME_ZONE,
  });
}

/** Hora: "08:48 p. m." */
export function formatPeruTime(value: Date | string | number): string {
  return new Date(value).toLocaleTimeString(PERU_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PERU_TIME_ZONE,
  });
}

/** Fecha + hora: "06 jun 2026, 08:48 p. m." */
export function formatPeruDateTime(value: Date | string | number): string {
  return `${formatPeruDate(value)}, ${formatPeruTime(value)}`;
}

/**
 * Genérico: formatea con las opciones que le pases, inyectando siempre la zona
 * horaria de Perú. Útil para preservar formatos puntuales (fecha larga,
 * `dateStyle`, con hora incluida, etc.) que no encajan en los helpers de arriba.
 * Sin opciones usa el formato de fecha por defecto del locale (dd/mm/aaaa).
 */
export function formatPeruDateWith(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Date(value).toLocaleDateString(PERU_LOCALE, {
    ...options,
    timeZone: PERU_TIME_ZONE,
  });
}
