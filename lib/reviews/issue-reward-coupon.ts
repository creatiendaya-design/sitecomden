import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/sanitize";
import { formatPeruDateWith } from "@/lib/format-date";
import {
  getReviewRewardConfig,
} from "@/actions/review-reward-settings";

interface IssueResult {
  issued: boolean;
  code?: string;
  reason?: string;
}

function generateReviewCouponCode(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RESENA-${rand}`;
}

/**
 * Issues a reward coupon for an APPROVED, VERIFIED review — once. Called from
 * the approval flow (moderateReview). Safe to call repeatedly: it no-ops if
 * the feature is off, the review isn't verified, or a coupon was already
 * issued for this review.
 *
 * Best-effort: never throws into the caller (approval must succeed even if the
 * coupon/email fails). Returns a small result for logging.
 */
export async function issueReviewRewardCoupon(
  reviewId: string
): Promise<IssueResult> {
  try {
    const config = await getReviewRewardConfig();
    if (!config.enabled) return { issued: false, reason: "disabled" };

    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        approved: true,
        verified: true,
        rewardCouponId: true,
        customerEmail: true,
        customerName: true,
        product: { select: { name: true } },
      },
    });

    if (!review) return { issued: false, reason: "not_found" };
    if (!review.approved) return { issued: false, reason: "not_approved" };
    if (!review.verified) return { issued: false, reason: "not_verified" };
    if (review.rewardCouponId)
      return { issued: false, reason: "already_issued" };

    // Generate a unique code (retry a couple times on the rare collision).
    let code = generateReviewCouponCode();
    for (let i = 0; i < 3; i++) {
      const exists = await prisma.coupon.findUnique({ where: { code } });
      if (!exists) break;
      code = generateReviewCouponCode();
    }

    const expiresAt = new Date(
      Date.now() + config.expiresInDays * 24 * 60 * 60 * 1000
    );

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: `Recompensa por reseña — ${review.product?.name ?? "producto"}`,
        type: config.couponType,
        value: config.value,
        minPurchase: config.minPurchase > 0 ? config.minPurchase : null,
        // One reward coupon = one use, by the customer who earned it.
        usageLimit: 1,
        usageLimitPerUser: 1,
        expiresAt,
        active: true,
      },
    });

    // Link it back to the review so we never double-issue. Guard against a
    // race: only set if still unset.
    const linked = await prisma.productReview.updateMany({
      where: { id: review.id, rewardCouponId: null },
      data: { rewardCouponId: coupon.id },
    });

    // Lost the race — another approval already issued one. Roll back ours.
    if (linked.count === 0) {
      await prisma.coupon.delete({ where: { id: coupon.id } });
      return { issued: false, reason: "already_issued" };
    }

    // Email the customer their coupon (best-effort).
    if (review.customerEmail) {
      const valueLabel =
        config.couponType === "PERCENTAGE"
          ? `${config.value}% de descuento`
          : `S/ ${config.value.toFixed(2)} de descuento`;
      const minLabel =
        config.minPurchase > 0
          ? `<p style="margin:8px 0 0 0;font-size:13px;color:#666;">Compra mínima: S/ ${config.minPurchase.toFixed(2)}</p>`
          : "";

      await sendEmail({
        to: review.customerEmail,
        subject: `¡Gracias por tu reseña! Aquí tienes tu ${valueLabel}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#111;">¡Gracias por tu reseña!</h2>
            <p>Hola ${escapeHtml(review.customerName) || "cliente"},</p>
            <p>Como agradecimiento por tu opinión, te regalamos un cupón de
              <strong>${escapeHtml(valueLabel)}</strong> para tu próxima compra.</p>
            <div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
              <p style="margin:0;font-size:13px;color:#666;">Tu código de cupón</p>
              <p style="margin:8px 0;font-size:24px;font-weight:bold;letter-spacing:2px;">${escapeHtml(code)}</p>
              <p style="margin:0;font-size:13px;color:#666;">Válido hasta ${formatPeruDateWith(expiresAt)}</p>
              ${minLabel}
            </div>
            <p style="color:#666;font-size:12px;margin-top:30px;">
              Este es un mensaje automático, por favor no responder.
            </p>
          </div>`,
      });
    }

    return { issued: true, code };
  } catch (error) {
    console.error("Error issuing review reward coupon:", error);
    return { issued: false, reason: "error" };
  }
}
