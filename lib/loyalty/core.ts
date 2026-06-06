import type { LoyaltyProgramSettings } from "@prisma/client";

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

/**
 * Nivel VIP según el balance de puntos acumulados. Compartido entre el flujo de
 * lealtad (actions/loyalty.ts) y la contabilización de compra al confirmar pago
 * (lib/loyalty/award-purchase.ts).
 */
export function calculateLoyaltyTier(
  points: number,
  settings: Pick<
    LoyaltyProgramSettings,
    "platinumThreshold" | "goldThreshold" | "silverThreshold"
  >
): LoyaltyTier {
  if (points >= settings.platinumThreshold) return "PLATINUM";
  if (points >= settings.goldThreshold) return "GOLD";
  if (points >= settings.silverThreshold) return "SILVER";
  return "BRONZE";
}

/**
 * Código de referido único (4 letras del nombre + 4 alfanuméricos). El llamador
 * debe verificar colisión contra `Customer.referralCode` y reintentar.
 */
export function generateReferralCode(name: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .substring(0, 4)
    .padEnd(4, "X");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}

/**
 * Emails-placeholder que genera el checkout COD cuando el comprador no dejó
 * correo (`cod-<timestamp>@shopgood.pe`). No representan un cliente real, así que
 * NO deben crear una ficha en el CRM.
 */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  return /^cod-\d+@shopgood\.pe$/i.test(email.trim());
}
