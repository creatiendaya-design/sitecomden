import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatPrice as i18nFormatPrice } from "@/lib/i18n/format"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Legacy formatter retained for backwards compat. Always renders in the
 * default locale/currency (es-PE / PEN). New code should call
 * `formatPrice` from `@/lib/i18n/format` directly and pass the resolved
 * store locale + currency so future multi-tenancy works without a search-
 * and-replace.
 */
export function formatPrice(price: number): string {
  return i18nFormatPrice(price)
}

export function formatOrderNumber(seq: number, prefix: string = "PED"): string {
  return `${prefix}-${seq.toString().padStart(4, "0")}`;
}

export function displayOrderNumber(
  order: { orderSeq?: number | null; orderNumber: string },
  prefix: string = "PED"
): string {
  if (order.orderSeq) {
    return formatOrderNumber(order.orderSeq, prefix);
  }
  return order.orderNumber.slice(-8).toUpperCase();
}