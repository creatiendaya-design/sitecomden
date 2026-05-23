/**
 * 🌐 i18n / multi-currency type catalog.
 *
 * Centralizes the locales and currencies the system understands. Adding a
 * new entry is a single-file edit: both the union type *and* the SUPPORTED
 * arrays update at once because the arrays are typed `as const`.
 *
 * Locale codes follow BCP 47 (`es-PE`, `en-US`).
 * Currency codes follow ISO 4217 (`PEN`, `USD`, `EUR`).
 */

export const SUPPORTED_LOCALES = ["es-PE", "es-ES", "en-US"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_CURRENCIES = ["PEN", "USD", "EUR"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "es-PE";
export const DEFAULT_CURRENCY: SupportedCurrency = "PEN";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

export function isSupportedCurrency(
  value: unknown,
): value is SupportedCurrency {
  return (
    typeof value === "string" &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
  );
}

export const CURRENCY_SYMBOL: Record<SupportedCurrency, string> = {
  PEN: "S/",
  USD: "$",
  EUR: "€",
};

export const CURRENCY_LABEL: Record<SupportedCurrency, string> = {
  PEN: "Sol peruano (PEN)",
  USD: "Dólar (USD)",
  EUR: "Euro (EUR)",
};

export const LOCALE_LABEL: Record<SupportedLocale, string> = {
  "es-PE": "Español (Perú)",
  "es-ES": "Español (España)",
  "en-US": "English (US)",
};
