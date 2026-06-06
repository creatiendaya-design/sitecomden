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
 *
 * Elige el método correcto: si las opciones piden hora (`hour`/`minute`/
 * `second`/`timeStyle`/`dayPeriod`) usa `toLocaleString` (el único que acepta
 * componentes de hora); si solo piden fecha usa `toLocaleDateString` para no
 * añadir una hora no deseada. `toLocaleDateString` lanza "Invalid option" si le
 * pasas `timeStyle`, por eso esta distinción es necesaria.
 */
export function formatPeruDateWith(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const wantsTime =
    options.hour !== undefined ||
    options.minute !== undefined ||
    options.second !== undefined ||
    options.timeStyle !== undefined ||
    options.dayPeriod !== undefined;

  const opts: Intl.DateTimeFormatOptions = { ...options, timeZone: PERU_TIME_ZONE };
  const date = new Date(value);

  return wantsTime
    ? date.toLocaleString(PERU_LOCALE, opts)
    : date.toLocaleDateString(PERU_LOCALE, opts);
}
