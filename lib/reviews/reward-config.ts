/**
 * Shared types + defaults for the "discount coupon for leaving a review"
 * incentive. Kept out of the `"use server"` action file so the approval flow,
 * the admin page, and the action can all import without server-action
 * semantics.
 *
 * Business rules (decided with the store owner):
 *  - Coupon is issued when the admin APPROVES the review (not on submit), so
 *    spam never earns a reward.
 *  - Only VERIFIED reviews (email matches a paying order for the product) earn
 *    a coupon — the strictest anti-abuse option.
 *  - At most one coupon per review (enforced via ProductReview.rewardCouponId).
 */

export type ReviewRewardCouponType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface ReviewRewardConfig {
  /** Master switch. */
  enabled: boolean;
  couponType: ReviewRewardCouponType;
  /** Percent (1–100) when PERCENTAGE, or soles when FIXED_AMOUNT. */
  value: number;
  /** Minimum cart subtotal required to use the coupon (0 = no minimum). */
  minPurchase: number;
  /** Coupon validity in days from issue. */
  expiresInDays: number;
}

export const REVIEW_REWARD_SETTING_KEY = "review_reward_config";

export const DEFAULT_REVIEW_REWARD_CONFIG: ReviewRewardConfig = {
  enabled: false,
  couponType: "PERCENTAGE",
  value: 10,
  minPurchase: 0,
  expiresInDays: 30,
};

export function coerceReviewRewardConfig(raw: unknown): ReviewRewardConfig {
  const v = (raw ?? {}) as Partial<ReviewRewardConfig>;
  const couponType: ReviewRewardCouponType =
    v.couponType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";

  let value =
    typeof v.value === "number" && v.value > 0
      ? v.value
      : DEFAULT_REVIEW_REWARD_CONFIG.value;
  // Percentage coupons can't exceed 100%.
  if (couponType === "PERCENTAGE") value = Math.min(value, 100);

  return {
    enabled: v.enabled ?? DEFAULT_REVIEW_REWARD_CONFIG.enabled,
    couponType,
    value,
    minPurchase:
      typeof v.minPurchase === "number" && v.minPurchase >= 0
        ? v.minPurchase
        : DEFAULT_REVIEW_REWARD_CONFIG.minPurchase,
    expiresInDays:
      typeof v.expiresInDays === "number" && v.expiresInDays >= 1
        ? Math.floor(v.expiresInDays)
        : DEFAULT_REVIEW_REWARD_CONFIG.expiresInDays,
  };
}
