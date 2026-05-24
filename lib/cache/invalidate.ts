import { revalidateTag } from "next/cache";

/**
 * Cache invalidation helpers for storefront `unstable_cache` entries.
 *
 * Storefront pages cache their Prisma queries for 60s under tagged keys
 * (see app/(shop)/productos/[slug]/page.tsx and
 * app/(shop)/categoria/[slug]/page.tsx). Admin server actions / API routes
 * should call these after mutations so changes propagate immediately
 * instead of waiting for the TTL.
 *
 * Uses `revalidateTag` with `{ expire: 0 }` — the correct API in Next 16
 * for invalidating `unstable_cache` entries from both Route Handlers and
 * Server Actions. (`updateTag` is reserved for the new `'use cache'`
 * directive and only works inside Server Actions.)
 *
 * Even if a mutation forgets to call these, the 60s TTL means staleness
 * is bounded — these helpers are an optimization, not a correctness gate.
 */

const IMMEDIATE = { expire: 0 } as const;

export function invalidateProduct(slug: string) {
  revalidateTag(`product:${slug}`, IMMEDIATE);
  revalidateTag("products", IMMEDIATE);
}

export function invalidateAllProducts() {
  revalidateTag("products", IMMEDIATE);
}

export function invalidateCategory(slugOrId: string) {
  revalidateTag(`category:${slugOrId}`, IMMEDIATE);
  revalidateTag(`category:${slugOrId}:products`, IMMEDIATE);
  revalidateTag("categories", IMMEDIATE);
}

export function invalidateAllCategories() {
  revalidateTag("categories", IMMEDIATE);
  revalidateTag("products", IMMEDIATE);
}
