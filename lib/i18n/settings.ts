/**
 * 🌐 Resolve store-level locale/currency from the Setting table.
 *
 * Today this is a single global setting. In multi-tenant SaaS this
 * resolver is the seam: it will read the active tenant id (from
 * subdomain / cookie / header) and return that tenant's preferences.
 * All format helpers go through here, so changing the tenant resolution
 * is a one-file edit.
 */

import { getSetting } from "@/lib/site-settings";
import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  isSupportedCurrency,
  isSupportedLocale,
  type SupportedCurrency,
  type SupportedLocale,
} from "./types";

export interface StoreLocaleConfig {
  locale: SupportedLocale;
  currency: SupportedCurrency;
}

/**
 * Returns the active store's locale + currency. Falls back to es-PE / PEN
 * when no setting is configured or the persisted value is unknown to the
 * SUPPORTED catalog (defensive: an old setting must never crash render).
 */
export async function getStoreLocaleConfig(): Promise<StoreLocaleConfig> {
  const [rawLocale, rawCurrency] = await Promise.all([
    getSetting("default_locale"),
    getSetting("default_currency"),
  ]);

  return {
    locale: isSupportedLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE,
    currency: isSupportedCurrency(rawCurrency)
      ? rawCurrency
      : DEFAULT_CURRENCY,
  };
}
