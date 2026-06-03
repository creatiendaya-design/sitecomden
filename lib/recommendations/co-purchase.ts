/**
 * Co-purchase inference — the "frequently bought together" signal computed
 * from order history. Given one or more seed products, find the products that
 * appeared in the SAME paid orders most often.
 *
 * Pure data access (no Next imports) so it can be reused by server actions for
 * the product page, the cart drawer, and the checkout upsell.
 */

import { prisma } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";

// Orders that represent a real purchase. PENDING / CANCELLED / REFUNDED are
// excluded so abandoned or reversed carts don't pollute the signal.
const PAID_STATUSES: OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export interface CoPurchaseScore {
  productId: string;
  /** Number of distinct paid orders where it co-occurred with the seed(s). */
  score: number;
}

interface CoPurchaseOptions {
  /** How far back to look. Defaults to 180 days. */
  windowDays?: number;
  /** Max results. Defaults to 10. */
  limit?: number;
  /** Extra product ids to exclude (the seeds are always excluded). */
  excludeIds?: string[];
}

export async function getCoPurchasedProductIds(
  seedProductIds: string[],
  opts: CoPurchaseOptions = {},
): Promise<CoPurchaseScore[]> {
  const seeds = seedProductIds.filter(Boolean);
  if (seeds.length === 0) return [];

  const windowDays = opts.windowDays ?? 180;
  const limit = opts.limit ?? 10;
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  // 1. Distinct paid+recent orders that contain any seed product.
  const seedItems = await prisma.orderItem.findMany({
    where: {
      productId: { in: seeds },
      order: { status: { in: PAID_STATUSES }, createdAt: { gte: since } },
    },
    select: { orderId: true },
    distinct: ["orderId"],
    take: 5000, // safety cap for very popular products
  });
  const orderIds = seedItems.map((i) => i.orderId);
  if (orderIds.length === 0) return [];

  // 2. Rank the OTHER products bought in those same orders.
  const exclude = new Set([...seeds, ...(opts.excludeIds ?? [])]);
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      orderId: { in: orderIds },
      productId: { not: null },
    },
    _count: { orderId: true },
    orderBy: { _count: { orderId: "desc" } },
    // Over-fetch so we can drop excluded ids and still hit `limit`.
    take: limit + exclude.size + 5,
  });

  return grouped
    .filter((g): g is typeof g & { productId: string } =>
      Boolean(g.productId) && !exclude.has(g.productId as string),
    )
    .map((g) => ({ productId: g.productId, score: g._count.orderId }))
    .slice(0, limit);
}
