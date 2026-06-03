import { prisma } from "@/lib/db";

/**
 * Recompute and persist a product's denormalized review aggregates
 * (`averageRating`, `reviewCount`) from its APPROVED reviews.
 *
 * Called after any change that affects approval state or rating: a review is
 * approved/unapproved, deleted, or (later) edited. Cheap — one aggregate
 * query + one update. The average is rounded to 1 decimal to match how it's
 * displayed; the raw mean is not needed anywhere.
 *
 * Best-effort by design: callers should not fail their main action if this
 * throws (the grid stars are cosmetic and the next mutation self-heals them),
 * but we still surface errors to the log.
 */
export async function recomputeProductReviewAggregates(
  productId: string
): Promise<void> {
  const agg = await prisma.productReview.aggregate({
    where: { productId, approved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const count = agg._count._all;
  const average = count > 0 ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : 0;

  await prisma.product.update({
    where: { id: productId },
    data: { averageRating: average, reviewCount: count },
  });
}
