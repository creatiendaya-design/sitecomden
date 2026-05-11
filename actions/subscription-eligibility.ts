"use server";

import { headers } from "next/headers";
import { checkRateLimit, formRateLimiter } from "@/lib/rate-limit";
import {
  getSubscriptionEligibility,
  type SubscriptionEligibilityReason,
} from "@/lib/promotions/server";

export interface EligibilityResult {
  eligible: boolean;
  reason: SubscriptionEligibilityReason | "RATE_LIMITED";
}

async function getClientIpFromHeaders(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "anonymous"
  );
}

/** Public server action used by the storefront to inform the customer whether
 *  the email they typed is eligible for the subscription discount. Rate-limited
 *  by IP to prevent enumeration attacks against the subscriber list. */
export async function checkSubscriptionEligibility(
  email: string
): Promise<EligibilityResult> {
  const ip = await getClientIpFromHeaders();
  const rate = await checkRateLimit(formRateLimiter, `subscription-check:${ip}`, {
    action: "subscription_eligibility_check",
  });
  if (!rate.success) {
    return { eligible: false, reason: "RATE_LIMITED" };
  }

  const reason = await getSubscriptionEligibility(email);
  return {
    eligible: reason === "ELIGIBLE",
    reason,
  };
}
