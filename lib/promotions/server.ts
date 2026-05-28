/**
 * Server-side helpers used by the public storefront — these run on every
 * product page render, so they cannot use `protectRoute` (which is admin-only).
 *
 * Admin server actions in `actions/promotions.ts` cover the same surface area
 * for the back-office, with permission checks layered on top.
 */

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { normalizeEmail } from "@/lib/email-normalize";
import { isDisposableEmail } from "@/lib/disposable-emails";
import type {
  BundleConfig,
  BundlePartnerProduct,
  FreeGiftConfig,
  FreeGiftProductSummary,
  ProductScopedPromotion,
  PromotionData,
  PromotionTargetSummary,
  SubscriptionConfig,
  VolumeConfig,
} from "./types";
import { resolveVolumeTier } from "./storefront";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SubscriptionEligibilityReason =
  | "ELIGIBLE"
  | "INVALID_EMAIL"
  | "DISPOSABLE"
  | "ALREADY_SUBSCRIBED";

/** Returns the canonical state of an email for SUBSCRIPTION discount.
 *  Defense layers (in order):
 *   1. Must be a syntactically valid email.
 *   2. Reject disposable email providers (mailinator, tempmail, etc).
 *   3. Reject if the canonical email is already in NewsletterSubscriber.
 *  Canonical form strips plus-addressing and (for Gmail) dots, so
 *  `me+1@gmail.com` and `m.e@gmail.com` map to the same record. */
export async function getSubscriptionEligibility(
  email: string
): Promise<SubscriptionEligibilityReason> {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return "INVALID_EMAIL";
  if (isDisposableEmail(trimmed)) return "DISPOSABLE";

  const canonical = normalizeEmail(trimmed);
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email: canonical },
    select: { id: true },
  });
  return existing === null ? "ELIGIBLE" : "ALREADY_SUBSCRIBED";
}

/** Boolean shortcut around getSubscriptionEligibility, used by the server
 *  resolver to fail-closed when applying the discount. */
export async function isEmailEligibleForSubscriptionDiscount(
  email: string
): Promise<boolean> {
  return (await getSubscriptionEligibility(email)) === "ELIGIBLE";
}

/** Checks whether the customer has completed the double opt-in code flow
 *  for the given email recently. Verification stays valid until the code
 *  record expires (15 min after `sendSubscriptionVerificationCode`). */
export async function isEmailVerifiedForSubscriptionDiscount(
  email: string
): Promise<boolean> {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return false;
  const canonical = normalizeEmail(trimmed);
  const record = await prisma.subscriptionVerification.findUnique({
    where: { email: canonical },
    select: { verifiedAt: true, expiresAt: true },
  });
  if (!record || !record.verifiedAt) return false;
  return record.expiresAt.getTime() >= Date.now();
}

function extractFirstImage(images: Prisma.JsonValue): string | null {
  if (!Array.isArray(images)) return null;
  const first = images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) {
    const url = (first as { url: unknown }).url;
    return typeof url === "string" ? url : null;
  }
  return null;
}

/** Public version of listPromotionsForProduct — no auth, so it can run from
 *  the storefront product page during SSR. */
export async function getPublicPromotionsForProduct(
  productId: string
): Promise<ProductScopedPromotion[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      categories: {
        select: {
          categoryId: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!product) return [];

  const categoryIds = product.categories.map((c) => c.categoryId);
  const categoryNameMap = new Map(
    product.categories.map((c) => [c.categoryId, c.category?.name ?? ""])
  );

  const now = new Date();

  const rows = await prisma.promotion.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        {
          OR: [
            { productTargets: { some: { productId } } },
            ...(categoryIds.length > 0
              ? [{ categoryTargets: { some: { categoryId: { in: categoryIds } } } }]
              : []),
          ],
        },
      ],
    },
    include: {
      productTargets: {
        include: {
          product: { select: { id: true, name: true, slug: true, images: true } },
        },
      },
      categoryTargets: {
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  // Hydrate gift + bundle partner product info for FREE_GIFT and BUNDLE
  // promotions in a single query.
  const giftProductIds = rows
    .filter((r) => r.type === "FREE_GIFT")
    .map((r) => {
      const cfg = r.config as FreeGiftConfig;
      return cfg?.giftProductId;
    })
    .filter((id): id is string => !!id);

  const partnerProductIds = rows
    .filter((r) => r.type === "BUNDLE")
    .flatMap((r) => {
      const cfg = r.config as BundleConfig;
      return cfg?.partnerProductIds ?? [];
    });

  const productInfoIds = [...new Set([...giftProductIds, ...partnerProductIds])];
  const hydratedProducts =
    productInfoIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productInfoIds }, active: true },
          select: { id: true, name: true, slug: true, images: true, basePrice: true },
        })
      : [];

  const productSummaryMap = new Map(
    hydratedProducts.map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: extractFirstImage(p.images),
        basePrice: Number(p.basePrice),
      } satisfies FreeGiftProductSummary,
    ])
  );

  return rows.map((row) => {
    const productIds = row.productTargets.map((t) => t.productId);
    const targetCategoryIds = row.categoryTargets.map((t) => t.categoryId);

    const targets: PromotionTargetSummary = {
      products: row.productTargets
        .filter((t) => t.product)
        .map((t) => ({
          id: t.product!.id,
          name: t.product!.name,
          slug: t.product!.slug,
          image: extractFirstImage(t.product!.images),
        })),
      categories: row.categoryTargets
        .filter((t) => t.category)
        .map((t) => ({
          id: t.category!.id,
          name: t.category!.name,
          slug: t.category!.slug,
        })),
    };

    const config = row.config as PromotionData["config"];
    const freeGiftProduct =
      row.type === "FREE_GIFT"
        ? productSummaryMap.get((config as FreeGiftConfig).giftProductId) ?? null
        : undefined;
    const bundlePartnerProducts =
      row.type === "BUNDLE"
        ? ((config as BundleConfig).partnerProductIds ?? [])
            .map((id) => productSummaryMap.get(id))
            .filter((p): p is BundlePartnerProduct => !!p)
        : undefined;

    const data: PromotionData = {
      id: row.id,
      name: row.name,
      type: row.type,
      active: row.active,
      priority: row.priority,
      config,
      startsAt: row.startsAt ? new Date(row.startsAt).toISOString() : null,
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      usageCount: row.usageCount,
      totalDiscountApplied: Number(row.totalDiscountApplied ?? 0),
      productIds,
      categoryIds: targetCategoryIds,
      targets,
      freeGiftProduct,
      bundlePartnerProducts,
      // Defensive: wrap with `new Date(...)` so callers in cached/serialized
      // paths (where Prisma Dates may come back as ISO strings) still get a
      // valid ISO string out. See app/(shop)/productos/[slug]/page.tsx for
      // the same pattern.
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };

    const isDirect = row.productTargets.some((t) => t.productId === productId);
    if (isDirect) {
      return { ...data, matchSource: "DIRECT" as const };
    }
    const matchedCategory = row.categoryTargets.find((t) =>
      categoryIds.includes(t.categoryId)
    );
    return {
      ...data,
      matchSource: "CATEGORY" as const,
      matchedCategoryName: matchedCategory
        ? categoryNameMap.get(matchedCategory.categoryId) ?? undefined
        : undefined,
    };
  });
}

export interface ResolvedVolumeDiscount {
  promotionId: string;
  tierLabel: string;
  discountPerUnit: number;
}

/** Server-side authoritative resolution of a VOLUME promotion for a given
 *  product/quantity. Returns null if the promotion does not exist, is
 *  inactive, out of schedule, doesn't apply to the product, or no tier
 *  matches the quantity. NEVER trusts client-supplied discount values. */
export async function resolveAppliedVolumeDiscount(args: {
  promotionId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}): Promise<ResolvedVolumeDiscount | null> {
  const { promotionId, productId, quantity, unitPrice } = args;
  if (quantity < 2) return null;

  const promo = await prisma.promotion.findUnique({
    where: { id: promotionId },
    include: {
      productTargets: { select: { productId: true } },
      categoryTargets: { select: { categoryId: true } },
    },
  });
  if (!promo || !promo.active || promo.type !== "VOLUME") return null;

  const now = Date.now();
  if (promo.startsAt && promo.startsAt.getTime() > now) return null;
  if (promo.expiresAt && promo.expiresAt.getTime() < now) return null;

  const directMatch = promo.productTargets.some((t) => t.productId === productId);
  let categoryMatch = false;
  if (!directMatch && promo.categoryTargets.length > 0) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { categories: { select: { categoryId: true } } },
    });
    const productCategoryIds = product?.categories.map((c) => c.categoryId) ?? [];
    const targetCategoryIds = promo.categoryTargets.map((t) => t.categoryId);
    categoryMatch = productCategoryIds.some((id) => targetCategoryIds.includes(id));
  }
  if (!directMatch && !categoryMatch) return null;

  const config = promo.config as VolumeConfig;
  if (!Array.isArray(config.tiers) || config.tiers.length === 0) return null;

  const matched = resolveVolumeTier(quantity, config.tiers);
  if (!matched) return null;

  const tier = matched.tier;
  let discountPerUnit = 0;
  if (tier.discountType === "PERCENT") {
    discountPerUnit = (unitPrice * tier.discountValue) / 100;
  } else {
    discountPerUnit = Math.min(tier.discountValue, unitPrice);
  }
  const rounded = Math.round(discountPerUnit * 100) / 100;
  if (rounded <= 0) return null;

  return {
    promotionId: promo.id,
    tierLabel: tier.label?.trim() || `${tier.minQty} Unidades`,
    discountPerUnit: rounded,
  };
}

export interface ResolvedSubscriptionDiscount {
  promotionId: string;
  discountPerUnit: number;
}

/** Server-side authoritative resolution of a SUBSCRIPTION promotion. The
 *  unitPrice passed in MUST be already net of any volume discount, so the
 *  subscription % stacks on the discounted price. Returns null if the
 *  promotion is missing/inactive/out-of-schedule, doesn't apply to the
 *  product, the email is invalid, or the resolved discount is non-positive. */
export async function resolveAppliedSubscriptionDiscount(args: {
  promotionId: string;
  productId: string;
  unitPrice: number;
  email: string;
}): Promise<ResolvedSubscriptionDiscount | null> {
  const { promotionId, productId, unitPrice, email } = args;
  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) return null;
  if (unitPrice <= 0) return null;

  // Three layered defenses, in this order:
  //  1. Eligibility (not already a subscriber, not disposable).
  //  2. Double opt-in verification (customer received + entered the code).
  // Each runs independently so we fail closed if any check is bypassed.
  const eligible = await isEmailEligibleForSubscriptionDiscount(trimmed);
  if (!eligible) return null;

  const verified = await isEmailVerifiedForSubscriptionDiscount(trimmed);
  if (!verified) return null;

  const promo = await prisma.promotion.findUnique({
    where: { id: promotionId },
    include: {
      productTargets: { select: { productId: true } },
      categoryTargets: { select: { categoryId: true } },
    },
  });
  if (!promo || !promo.active || promo.type !== "SUBSCRIPTION") return null;

  const now = Date.now();
  if (promo.startsAt && promo.startsAt.getTime() > now) return null;
  if (promo.expiresAt && promo.expiresAt.getTime() < now) return null;

  const directMatch = promo.productTargets.some((t) => t.productId === productId);
  let categoryMatch = false;
  if (!directMatch && promo.categoryTargets.length > 0) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { categories: { select: { categoryId: true } } },
    });
    const productCategoryIds = product?.categories.map((c) => c.categoryId) ?? [];
    const targetCategoryIds = promo.categoryTargets.map((t) => t.categoryId);
    categoryMatch = productCategoryIds.some((id) => targetCategoryIds.includes(id));
  }
  if (!directMatch && !categoryMatch) return null;

  const config = promo.config as SubscriptionConfig;
  let discountPerUnit = 0;
  if (config.discountType === "PERCENT") {
    discountPerUnit = (unitPrice * config.discountValue) / 100;
  } else {
    discountPerUnit = Math.min(config.discountValue, unitPrice);
  }
  const rounded = Math.round(discountPerUnit * 100) / 100;
  if (rounded <= 0) return null;

  return {
    promotionId: promo.id,
    discountPerUnit: rounded,
  };
}

/** Upserts a NewsletterSubscriber for a checkout subscription opt-in.
 *  Reactivates if already exists but inactive. Always stores the canonical
 *  email so plus-addressing/Gmail-dot variants dedupe to a single row.
 *  Never throws — failures are swallowed so they cannot block an order. */
export async function subscribeNewsletterFromOrder(args: {
  email: string;
  name?: string;
}): Promise<void> {
  const trimmed = args.email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return;
  const canonical = normalizeEmail(trimmed);

  try {
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: canonical },
    });
    if (existing) {
      if (!existing.active) {
        await prisma.newsletterSubscriber.update({
          where: { email: canonical },
          data: {
            active: true,
            name: args.name || existing.name,
            subscribedAt: new Date(),
            unsubscribedAt: null,
          },
        });
      }
      return;
    }
    await prisma.newsletterSubscriber.create({
      data: {
        email: canonical,
        name: args.name,
        active: true,
      },
    });
  } catch {
    // Subscriber persistence must never block the order.
  }
}

/** Bumps usageCount and totalDiscountApplied on a single promotion. Used
 *  by both order flows (COD + standard checkout) after the order commits.
 *  Failures are swallowed — incrementing analytics counters must never
 *  block the customer from completing their purchase. */
export async function incrementPromotionUsage(
  promotionId: string,
  discountAmount: number
): Promise<void> {
  const amount = Math.max(0, Math.round(discountAmount * 100) / 100);
  if (amount <= 0) return;
  try {
    await prisma.promotion.update({
      where: { id: promotionId },
      data: {
        usageCount: { increment: 1 },
        totalDiscountApplied: { increment: amount },
      },
    });
  } catch {
    // Non-fatal — analytics drift is preferable to a failed order.
  }
}

export interface ResolvedFreeGiftItem {
  promotionId: string;
  productId: string;
  variantId?: string;
  name: string;
  image: string | null;
  /** basePrice of the gift product, used as the "saved" amount when
   *  incrementing promotion metrics after the order commits. */
  basePrice: number;
}

/** Walks the cart's product IDs, finds active FREE_GIFT promotions that
 *  apply to any of them, and (if cart subtotal ≥ minSubtotal AND the gift
 *  product is active and in stock) returns the gift items to add to the
 *  order at price 0. Each promotion is applied at most once.
 *
 *  Caller is responsible for decrementing stock on the returned gifts as
 *  part of its own transaction. */
export async function resolveAppliedFreeGifts(args: {
  cartProductIds: string[];
  cartSubtotal: number;
}): Promise<ResolvedFreeGiftItem[]> {
  const { cartProductIds, cartSubtotal } = args;
  if (cartProductIds.length === 0) return [];

  const uniqueIds = [...new Set(cartProductIds)];

  // Find category memberships for these products so we can match category
  // targets without round-tripping per product.
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, categories: { select: { categoryId: true } } },
  });
  const productCategoryMap = new Map<string, string[]>();
  for (const p of products) {
    productCategoryMap.set(p.id, p.categories.map((c) => c.categoryId));
  }
  const allCategoryIds = [
    ...new Set(products.flatMap((p) => p.categories.map((c) => c.categoryId))),
  ];

  const now = new Date();
  const promos = await prisma.promotion.findMany({
    where: {
      active: true,
      type: "FREE_GIFT",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        {
          OR: [
            { productTargets: { some: { productId: { in: uniqueIds } } } },
            ...(allCategoryIds.length > 0
              ? [{ categoryTargets: { some: { categoryId: { in: allCategoryIds } } } }]
              : []),
          ],
        },
      ],
    },
    include: {
      productTargets: { select: { productId: true } },
      categoryTargets: { select: { categoryId: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  if (promos.length === 0) return [];

  const giftIds = [
    ...new Set(
      promos
        .map((p) => (p.config as FreeGiftConfig)?.giftProductId)
        .filter((id): id is string => !!id)
    ),
  ];
  const giftProducts =
    giftIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: giftIds }, active: true },
          select: {
            id: true,
            name: true,
            images: true,
            stock: true,
            hasVariants: true,
            basePrice: true,
          },
        })
      : [];
  const giftMap = new Map(giftProducts.map((p) => [p.id, p]));

  const resolved: ResolvedFreeGiftItem[] = [];
  for (const promo of promos) {
    const config = promo.config as FreeGiftConfig;
    if (!config?.giftProductId) continue;
    if (cartSubtotal < (config.minSubtotal ?? 0)) continue;

    const gift = giftMap.get(config.giftProductId);
    if (!gift) continue;
    if (gift.hasVariants) continue; // Variant-bound gifts are out of scope (Phase 2).
    if (gift.stock < 1) continue;

    // Verify at least one cart product is a target (direct or via category).
    const targetIds = new Set(promo.productTargets.map((t) => t.productId));
    const targetCategoryIds = new Set(promo.categoryTargets.map((t) => t.categoryId));
    const hasMatchingProduct = uniqueIds.some((pid) => {
      if (targetIds.has(pid)) return true;
      const cats = productCategoryMap.get(pid) ?? [];
      return cats.some((cid) => targetCategoryIds.has(cid));
    });
    if (!hasMatchingProduct) continue;

    // Don't add the gift if the buyer is already buying it (avoid loops where
    // we'd undercharge for a product that's also a paid line item).
    if (uniqueIds.includes(gift.id)) continue;

    resolved.push({
      promotionId: promo.id,
      productId: gift.id,
      name: gift.name,
      image: extractFirstImage(gift.images),
      basePrice: Number(gift.basePrice),
    });
  }

  return resolved;
}

export interface CartFreeGiftPromotion {
  promotionId: string;
  name: string;
  config: FreeGiftConfig;
  /** Gift product info, hydrated. null if the gift product was deleted or
   *  has variants (unsupported in Phase 1). */
  giftProduct: FreeGiftProductSummary | null;
}

/** Loads every active FREE_GIFT promotion that applies to ANY of the
 *  products in the cart (direct or via category target). Used by the
 *  cart UI to preview which gifts are unlocked or close to unlocking,
 *  before the customer hits checkout. */
export async function getActiveFreeGiftPromotionsForCart(
  cartProductIds: string[]
): Promise<CartFreeGiftPromotion[]> {
  if (cartProductIds.length === 0) return [];
  const uniqueIds = [...new Set(cartProductIds)];

  const products = await prisma.product.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, categories: { select: { categoryId: true } } },
  });
  const allCategoryIds = [
    ...new Set(products.flatMap((p) => p.categories.map((c) => c.categoryId))),
  ];

  const now = new Date();
  const promos = await prisma.promotion.findMany({
    where: {
      active: true,
      type: "FREE_GIFT",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        {
          OR: [
            { productTargets: { some: { productId: { in: uniqueIds } } } },
            ...(allCategoryIds.length > 0
              ? [{ categoryTargets: { some: { categoryId: { in: allCategoryIds } } } }]
              : []),
          ],
        },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  if (promos.length === 0) return [];

  const giftIds = [
    ...new Set(
      promos
        .map((p) => (p.config as FreeGiftConfig)?.giftProductId)
        .filter((id): id is string => !!id)
    ),
  ];
  const giftProducts =
    giftIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: giftIds }, active: true },
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            basePrice: true,
            hasVariants: true,
          },
        })
      : [];
  const giftMap = new Map(
    giftProducts.map((p) => [
      p.id,
      p.hasVariants
        ? null
        : ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            image: extractFirstImage(p.images),
            basePrice: Number(p.basePrice),
          } satisfies FreeGiftProductSummary),
    ])
  );

  return promos.map((p) => {
    const config = p.config as FreeGiftConfig;
    return {
      promotionId: p.id,
      name: p.name,
      config,
      giftProduct: giftMap.get(config.giftProductId) ?? null,
    };
  });
}

export interface ResolvedBundleDiscount {
  promotionId: string;
  /** Map productId → discount per unit (already rounded). Items not in this
   *  map are not part of the bundle. */
  perProductDiscount: Map<string, number>;
}

/** Validates a BUNDLE promotion against the actual cart contents. The anchor
 *  is derived as any cart item that is a target of the promotion (directly
 *  or via category). Returns the per-product discount the caller should
 *  apply, or null if no anchor / partners are missing / promo invalid. */
export async function resolveAppliedBundleDiscount(args: {
  promotionId: string;
  cartItems: Array<{ productId: string; unitPrice: number; quantity: number }>;
}): Promise<ResolvedBundleDiscount | null> {
  const { promotionId, cartItems } = args;
  if (cartItems.length < 2) return null;

  const promo = await prisma.promotion.findUnique({
    where: { id: promotionId },
    include: {
      productTargets: { select: { productId: true } },
      categoryTargets: { select: { categoryId: true } },
    },
  });
  if (!promo || !promo.active || promo.type !== "BUNDLE") return null;

  const now = Date.now();
  if (promo.startsAt && promo.startsAt.getTime() > now) return null;
  if (promo.expiresAt && promo.expiresAt.getTime() < now) return null;

  const config = promo.config as BundleConfig;
  const partnerIds = config.partnerProductIds ?? [];
  if (partnerIds.length === 0) return null;

  // Find any cart item that's a target of the promo (anchor candidate).
  const targetProductIds = new Set(promo.productTargets.map((t) => t.productId));
  const targetCategoryIds = new Set(promo.categoryTargets.map((t) => t.categoryId));
  const cartProductIds = [...new Set(cartItems.map((i) => i.productId))];

  let anchorProductId: string | null =
    cartProductIds.find((id) => targetProductIds.has(id)) ?? null;
  if (!anchorProductId && targetCategoryIds.size > 0) {
    const productsWithCats = await prisma.product.findMany({
      where: { id: { in: cartProductIds } },
      select: { id: true, categories: { select: { categoryId: true } } },
    });
    for (const p of productsWithCats) {
      const cats = p.categories.map((c) => c.categoryId);
      if (cats.some((id) => targetCategoryIds.has(id))) {
        anchorProductId = p.id;
        break;
      }
    }
  }
  if (!anchorProductId) return null;

  const cartProductIdSet = new Set(cartProductIds);
  const presentPartners = partnerIds.filter((id) => cartProductIdSet.has(id));
  if (config.requireAll) {
    if (presentPartners.length !== partnerIds.length) return null;
  } else if (presentPartners.length === 0) {
    return null;
  }

  const bundleProductIds = new Set([anchorProductId, ...presentPartners]);
  const lines = cartItems
    .filter((i) => bundleProductIds.has(i.productId))
    .map((i) => ({ productId: i.productId, unitPrice: i.unitPrice }));

  const subtotal = lines.reduce((s, l) => s + l.unitPrice, 0);
  if (subtotal <= 0) return null;

  const perProductDiscount = new Map<string, number>();
  for (const line of lines) {
    let discount = 0;
    if (config.discountType === "PERCENT") {
      discount = (line.unitPrice * config.discountValue) / 100;
    } else {
      const proportion = line.unitPrice / subtotal;
      discount = Math.min(line.unitPrice, config.discountValue * proportion);
    }
    discount = Math.round(discount * 100) / 100;
    if (discount > 0) {
      perProductDiscount.set(line.productId, discount);
    }
  }

  if (perProductDiscount.size === 0) return null;

  return {
    promotionId: promo.id,
    perProductDiscount,
  };
}
