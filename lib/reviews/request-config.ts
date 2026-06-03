/**
 * Shared types + defaults for the post-purchase review-request email.
 * Kept out of the `"use server"` action file (which can only export async
 * functions) so the cron route, the admin page, and the action can all import
 * these without pulling server-action semantics.
 */

export interface ReviewRequestConfig {
  /** Master switch for the post-purchase review email. */
  enabled: boolean;
  /** Days to wait after an order is DELIVERED before emailing. */
  daysAfterDelivery: number;
  subject: string;
  /** Intro paragraph; the product list + CTA button are appended automatically. */
  message: string;
  buttonText: string;
}

export const DEFAULT_REVIEW_REQUEST_CONFIG: ReviewRequestConfig = {
  enabled: false,
  daysAfterDelivery: 7,
  subject: "¿Qué te pareció tu compra? Déjanos tu reseña",
  message:
    "¡Gracias por tu compra! Nos encantaría saber tu opinión. Tu reseña ayuda a otros compradores y a nosotros a mejorar.",
  buttonText: "Escribir mi reseña",
};

export const REVIEW_REQUEST_SETTING_KEY = "review_request_config";

/** Merge a raw DB value over the defaults, clamping `daysAfterDelivery`. */
export function coerceReviewRequestConfig(raw: unknown): ReviewRequestConfig {
  const v = (raw ?? {}) as Partial<ReviewRequestConfig>;
  return {
    enabled: v.enabled ?? DEFAULT_REVIEW_REQUEST_CONFIG.enabled,
    daysAfterDelivery:
      typeof v.daysAfterDelivery === "number" && v.daysAfterDelivery >= 0
        ? Math.floor(v.daysAfterDelivery)
        : DEFAULT_REVIEW_REQUEST_CONFIG.daysAfterDelivery,
    subject: v.subject || DEFAULT_REVIEW_REQUEST_CONFIG.subject,
    message: v.message || DEFAULT_REVIEW_REQUEST_CONFIG.message,
    buttonText: v.buttonText || DEFAULT_REVIEW_REQUEST_CONFIG.buttonText,
  };
}
