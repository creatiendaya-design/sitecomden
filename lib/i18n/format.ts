/**
 * 🌐 Locale-aware formatting helpers.
 *
 * Wraps `Intl.NumberFormat` / `Intl.DateTimeFormat` with the store's
 * resolved locale + currency. Always prefer these over `Intl.*` directly
 * — when we go multi-tenant SaaS, the per-tenant `Setting` will plug in
 * here without touching every component.
 *
 * All helpers default to the system locale/currency when an explicit
 * override isn't passed, so server components can call them without
 * threading a context object through every layer.
 */

import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  type SupportedCurrency,
  type SupportedLocale,
} from "./types";

export interface FormatPriceOptions {
  locale?: SupportedLocale;
  currency?: SupportedCurrency;
  /** Show "FREE" for zero. Defaults to false (renders "S/ 0.00"). */
  freeWhenZero?: boolean;
  /** Suppress the currency code/symbol — just emit the number. */
  noCurrency?: boolean;
  /** Override default minimumFractionDigits (default: 2). */
  minimumFractionDigits?: number;
  /** Override default maximumFractionDigits (default: 2). */
  maximumFractionDigits?: number;
}

/**
 * Format a money amount.
 *
 *   formatPrice(199.9)                       → "S/ 199.90"
 *   formatPrice(199.9, { currency: "USD" })  → "$199.90" (en-US output)
 *   formatPrice(0, { freeWhenZero: true })   → "Gratis"
 */
export function formatPrice(
  amount: number,
  options: FormatPriceOptions = {},
): string {
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    freeWhenZero = false,
    noCurrency = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  if (freeWhenZero && amount === 0) {
    return locale.startsWith("en") ? "Free" : "Gratis";
  }

  if (noCurrency) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export interface FormatNumberOptions {
  locale?: SupportedLocale;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatNumber(
  value: number,
  options: FormatNumberOptions = {},
): string {
  const { locale = DEFAULT_LOCALE, ...rest } = options;
  return new Intl.NumberFormat(locale, rest).format(value);
}

export interface FormatDateOptions {
  locale?: SupportedLocale;
  /** Intl.DateTimeFormat preset. Defaults to a sensible "medium" shape. */
  dateStyle?: "full" | "long" | "medium" | "short";
  timeStyle?: "full" | "long" | "medium" | "short";
}

export function formatDate(
  value: Date | string | number,
  options: FormatDateOptions = {},
): string {
  const { locale = DEFAULT_LOCALE, dateStyle = "medium", timeStyle } = options;
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    dateStyle,
    ...(timeStyle ? { timeStyle } : {}),
  }).format(date);
}

/**
 * Percentage formatter. `value` is the raw ratio (0.15 = 15%).
 */
export function formatPercent(
  value: number,
  options: { locale?: SupportedLocale; fractionDigits?: number } = {},
): string {
  const { locale = DEFAULT_LOCALE, fractionDigits = 0 } = options;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
