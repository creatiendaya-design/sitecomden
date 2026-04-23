import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(price)
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