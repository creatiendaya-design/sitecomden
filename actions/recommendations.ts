"use server";

/**
 * Hybrid product recommender for cross-sell / "comprados juntos".
 *
 * Priority when resolving recommendations for a product:
 *   1. Manual curation (ProductRelation rows the admin set).
 *   2. Co-purchase inference from order history.
 *   3. Same-category fallback (so the section is never empty).
 *
 * Also exposes the admin CRUD used by the product edit form to curate the
 * manual list, and a cart-level resolver (used by the cart drawer / checkout
 * upsell) that recommends against the whole basket.
 */

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Prisma, ProductRelationType } from "@prisma/client";
import { getCoPurchasedProductIds } from "@/lib/recommendations/co-purchase";

export interface RecommendationCard {
  id: string;
  slug: string;
  name: string;
  /** Lowest purchasable price (cheapest active variant when applicable). */
  price: number;
  compareAtPrice: number | null;
  mainImage: string | null;
  /** Variant products can't be added to cart in one click — link to the PDP. */
  hasVariants: boolean;
  inStock: boolean;
  /** Aggregate purchasable stock (sum of active variants when applicable). */
  stock: number;
}

const CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  basePrice: true,
  compareAtPrice: true,
  images: true,
  hasVariants: true,
  stock: true,
  variants: {
    where: { active: true },
    select: { price: true, stock: true },
    orderBy: { price: "asc" as const },
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof CARD_SELECT }>;

function toCard(p: CardRow): RecommendationCard {
  let mainImage: string | null = null;
  if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0];
    if (typeof first === "string") mainImage = first;
    else if (first && typeof first === "object" && "url" in first) {
      mainImage = (first as { url?: string }).url ?? null;
    }
  }

  let price = Number(p.basePrice ?? 0);
  let stock = p.stock;
  if (p.hasVariants && p.variants.length > 0) {
    price = Number(p.variants[0].price);
    stock = p.variants.reduce((sum, v) => sum + v.stock, 0);
  }

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price,
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    mainImage,
    hasVariants: p.hasVariants,
    inStock: stock > 0,
    stock,
  };
}

/** Fetch active product cards for the given ids, preserving the id order. */
async function fetchCardsInOrder(ids: string[]): Promise<RecommendationCard[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, active: true, deletedAt: null },
    select: CARD_SELECT,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is CardRow => Boolean(r))
    .map(toCard);
}

/** Product ids sharing a category with the seed, excluding `exclude`. */
async function sameCategoryIds(
  seedProductId: string,
  limit: number,
  exclude: string[],
): Promise<string[]> {
  const current = await prisma.product.findUnique({
    where: { id: seedProductId },
    select: { categories: { select: { categoryId: true } } },
  });
  const categoryIds = current?.categories.map((c) => c.categoryId) ?? [];
  if (categoryIds.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: {
      categories: { some: { categoryId: { in: categoryIds } } },
      id: { notIn: exclude },
      active: true,
      deletedAt: null,
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => r.id);
}

/**
 * Resolve the "frequently bought together" list for a product page.
 * Hybrid: manual → co-purchase → same-category.
 */
export async function getFrequentlyBoughtTogether(
  currentProductId: string,
  limit = 4,
): Promise<RecommendationCard[]> {
  const cap = Math.min(Math.max(limit, 1), 12);
  const collected: string[] = [];
  const seen = new Set<string>([currentProductId]);
  const push = (ids: string[]) => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      collected.push(id);
      if (collected.length >= cap) break;
    }
  };

  // 1. Manual curation.
  const manual = await prisma.productRelation.findMany({
    where: { productId: currentProductId, type: "BOUGHT_TOGETHER" },
    orderBy: { position: "asc" },
    select: { relatedProductId: true },
  });
  push(manual.map((m) => m.relatedProductId));

  // 2. Co-purchase inference.
  if (collected.length < cap) {
    const co = await getCoPurchasedProductIds([currentProductId], {
      limit: cap * 2,
      excludeIds: collected,
    });
    push(co.map((c) => c.productId));
  }

  // 3. Same-category fallback.
  if (collected.length < cap) {
    const fallback = await sameCategoryIds(currentProductId, cap * 2, [
      currentProductId,
      ...collected,
    ]);
    push(fallback);
  }

  return fetchCardsInOrder(collected);
}

/**
 * Resolve recommendations for a whole cart/basket (cart drawer + checkout
 * upsell). Ranks co-purchased products across all basket items, then falls
 * back to category affinity. Items already in the basket are excluded.
 */
export async function getCartRecommendations(
  basketProductIds: string[],
  limit = 4,
): Promise<RecommendationCard[]> {
  const cap = Math.min(Math.max(limit, 1), 12);
  // Public server action: cap the basket size so a crafted payload can't fan
  // out into a huge groupBy. Real carts never approach this.
  const basket = basketProductIds.filter(Boolean).slice(0, 50);
  if (basket.length === 0) return [];

  const collected: string[] = [];
  const seen = new Set<string>(basket);
  const push = (ids: string[]) => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      collected.push(id);
      if (collected.length >= cap) break;
    }
  };

  const co = await getCoPurchasedProductIds(basket, {
    limit: cap * 2,
    excludeIds: [],
  });
  push(co.map((c) => c.productId));

  if (collected.length < cap) {
    const fallback = await sameCategoryIds(basket[0], cap * 2, [
      ...basket,
      ...collected,
    ]);
    push(fallback);
  }

  return fetchCardsInOrder(collected);
}

// ── Admin CRUD for manual curation ──────────────────────────────────────────

export interface AdminRelationList {
  success: boolean;
  error?: string;
  items: RecommendationCard[];
}

export async function getProductRelationsForAdmin(
  productId: string,
  type: ProductRelationType = "BOUGHT_TOGETHER",
): Promise<AdminRelationList> {
  const { response } = await requirePermission("products:view");
  if (response) return { success: false, error: "No autorizado", items: [] };

  const rows = await prisma.productRelation.findMany({
    where: { productId, type },
    orderBy: { position: "asc" },
    select: { relatedProductId: true },
  });
  const items = await fetchCardsInOrder(rows.map((r) => r.relatedProductId));
  return { success: true, items };
}

export async function saveProductRelations(
  productId: string,
  relatedProductIds: string[],
  type: ProductRelationType = "BOUGHT_TOGETHER",
): Promise<{ success: boolean; error?: string }> {
  const { response } = await requirePermission("products:update");
  if (response) return { success: false, error: "No autorizado" };

  // Validate: ids must be real, active, and not the product itself.
  const cleanIds = Array.from(
    new Set(relatedProductIds.filter((id) => id && id !== productId)),
  );

  const valid =
    cleanIds.length > 0
      ? await prisma.product.findMany({
          // active + not soft-deleted, consistent with how the storefront
          // resolver filters — avoids silently saving relations that will
          // never render.
          where: { id: { in: cleanIds }, deletedAt: null, active: true },
          select: { id: true },
        })
      : [];
  const validSet = new Set(valid.map((v) => v.id));
  const ordered = cleanIds.filter((id) => validSet.has(id));

  // Replace the set for this (product, type): delete + recreate with order.
  await prisma.$transaction([
    prisma.productRelation.deleteMany({ where: { productId, type } }),
    ...(ordered.length > 0
      ? [
          prisma.productRelation.createMany({
            data: ordered.map((relatedProductId, index) => ({
              productId,
              relatedProductId,
              type,
              position: index,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePath(`/admin/productos/${productId}`);
  return { success: true };
}
