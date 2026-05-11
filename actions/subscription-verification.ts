"use server";

import { randomInt } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/email-normalize";
import { checkRateLimit, formRateLimiter } from "@/lib/rate-limit";
import { getSubscriptionEligibility } from "@/lib/promotions/server";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "anonymous"
  );
}

function generate6DigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export interface SendCodeResult {
  success: boolean;
  /** Time at which the existing code expires. Useful for the client to disable
   *  resends until the previous code has expired. */
  expiresAt?: string;
  error?:
    | "RATE_LIMITED"
    | "INVALID_EMAIL"
    | "DISPOSABLE"
    | "ALREADY_SUBSCRIBED"
    | "SEND_FAILED";
}

/** Generates a 6-digit verification code, persists it, and emails it.
 *  Rate-limited per IP via `formRateLimiter` (existing Upstash bucket). */
export async function sendSubscriptionVerificationCode(
  rawEmail: string
): Promise<SendCodeResult> {
  const ip = await getClientIp();
  const rate = await checkRateLimit(formRateLimiter, `sub-verify-send:${ip}`, {
    action: "subscription_verification_send",
  });
  if (!rate.success) return { success: false, error: "RATE_LIMITED" };

  const eligibility = await getSubscriptionEligibility(rawEmail);
  if (eligibility === "INVALID_EMAIL") {
    return { success: false, error: "INVALID_EMAIL" };
  }
  if (eligibility === "DISPOSABLE") {
    return { success: false, error: "DISPOSABLE" };
  }
  if (eligibility === "ALREADY_SUBSCRIBED") {
    return { success: false, error: "ALREADY_SUBSCRIBED" };
  }

  const canonical = normalizeEmail(rawEmail.trim().toLowerCase());
  const code = generate6DigitCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.subscriptionVerification.upsert({
    where: { email: canonical },
    create: {
      email: canonical,
      code,
      expiresAt,
      ipAddress: ip,
      attempts: 0,
      verifiedAt: null,
    },
    update: {
      code,
      expiresAt,
      ipAddress: ip,
      attempts: 0,
      verifiedAt: null,
    },
  });

  // Send the code. The customer types the address they want to receive the
  // discount on, so we send to that exact address (not the canonical form).
  const result = await sendEmail({
    to: rawEmail.trim(),
    subject: `Tu código de verificación: ${code}`,
    html: renderCodeEmailHtml(code),
  });

  if (!result.success) {
    return { success: false, error: "SEND_FAILED" };
  }

  return { success: true, expiresAt: expiresAt.toISOString() };
}

export interface VerifyCodeResult {
  success: boolean;
  error?:
    | "RATE_LIMITED"
    | "INVALID_EMAIL"
    | "NO_CODE_REQUESTED"
    | "CODE_EXPIRED"
    | "MAX_ATTEMPTS"
    | "WRONG_CODE";
}

export async function verifySubscriptionCode(
  rawEmail: string,
  code: string
): Promise<VerifyCodeResult> {
  const ip = await getClientIp();
  const rate = await checkRateLimit(formRateLimiter, `sub-verify-check:${ip}`, {
    action: "subscription_verification_check",
  });
  if (!rate.success) return { success: false, error: "RATE_LIMITED" };

  const canonical = normalizeEmail(rawEmail.trim().toLowerCase());
  if (!canonical.includes("@")) {
    return { success: false, error: "INVALID_EMAIL" };
  }

  const record = await prisma.subscriptionVerification.findUnique({
    where: { email: canonical },
  });
  if (!record) return { success: false, error: "NO_CODE_REQUESTED" };
  if (record.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: "MAX_ATTEMPTS" };
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return { success: false, error: "CODE_EXPIRED" };
  }

  if (record.code !== code.trim()) {
    await prisma.subscriptionVerification.update({
      where: { email: canonical },
      data: { attempts: { increment: 1 } },
    });
    return { success: false, error: "WRONG_CODE" };
  }

  await prisma.subscriptionVerification.update({
    where: { email: canonical },
    data: { verifiedAt: new Date() },
  });

  return { success: true };
}

function renderCodeEmailHtml(code: string): string {
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a; margin: 0 0 8px 0;">Verifica tu correo</h2>
      <p style="color: #475569; line-height: 1.5; margin: 0 0 16px 0;">
        Ingresa este código en la página del producto para aplicar tu descuento de suscripción:
      </p>
      <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">
          ${code}
        </div>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
        El código expira en 15 minutos. Si no solicitaste esto, ignora este correo.
      </p>
    </div>
  `;
}
