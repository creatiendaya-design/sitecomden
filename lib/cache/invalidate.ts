import { updateTag } from "next/cache";

/**
 * Cache invalidation helpers for storefront `unstable_cache` entries.
 *
 * Storefront pages cache their Prisma queries for 60s under tagged keys
 * (see app/(shop)/productos/[slug]/page.tsx and
 * app/(shop)/categoria/[slug]/page.tsx). Admin server actions / API routes
 * should call these after mutations so changes propagate immediately
 * instead of waiting for the TTL.
 *
 * Uses `updateTag` (Next 16+), which is the single-argument replacement
 * for the old `revalidateTag(tag)` signature. The new `revalidateTag` now
 * requires a cache profile and is only callable from Server Actions.
 *
 * Even if a mutation forgets to call these, the 60s TTL means staleness
 * is bounded — these helpers are an optimization, not a correctness gate.
 */

export function invalidateProduct(slug: string) {
  updateTag(`product:${slug}`);
  updateTag("products");
}

export function invalidateAllProducts() {
  updateTag("products");
}

export function invalidateCategory(slugOrId: string) {
  updateTag(`category:${slugOrId}`);
  updateTag(`category:${slugOrId}:products`);
  updateTag("categories");
}

export function invalidateAllCategories() {
  updateTag("categories");
  updateTag("products");
}
