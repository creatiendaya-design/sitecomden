import { z } from "zod";
import type { ProductPromotionType } from "@prisma/client";

export const DISCOUNT_TYPES = ["PERCENT", "FIXED"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color hex inválido (formato: #RRGGBB)");

const discountValueRefinement = (data: { discountType: DiscountType; discountValue: number }, ctx: z.RefinementCtx) => {
  if (data.discountType === "PERCENT" && data.discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El porcentaje no puede ser mayor a 100",
      path: ["discountValue"],
    });
  }
};

export const volumeTierSchema = z
  .object({
    minQty: z.number().int().min(2),
    discountType: z.enum(DISCOUNT_TYPES).default("PERCENT"),
    discountValue: z.number().min(0),
    label: z.string().max(80).optional().nullable(),
    /** Badge label rendered above the tier card. Empty/null = no badge shown. */
    badgeText: z.string().max(40).optional().nullable(),
    /** Custom hex (e.g. "#F97316") for badge background. */
    badgeColor: hexColorSchema.optional().nullable(),
    /** Custom hex for badge text. Defaults to white when null. */
    badgeTextColor: hexColorSchema.optional().nullable(),
    /** When true, this tier is pre-selected by default on the storefront. */
    featured: z.boolean().default(false),
  })
  .superRefine(discountValueRefinement);

export const volumeConfigSchema = z.object({
  tiers: z.array(volumeTierSchema).min(1).max(10),
  sameVariantOnly: z.boolean().default(false),
});

export const subscriptionConfigSchema = z
  .object({
    discountType: z.enum(DISCOUNT_TYPES).default("PERCENT"),
    discountValue: z.number().min(0),
    ctaLabel: z.string().max(80).optional().nullable(),
  })
  .superRefine(discountValueRefinement);

export const freeGiftConfigSchema = z.object({
  minSubtotal: z.number().min(0),
  giftProductId: z.string().min(1),
  giftVariantId: z.string().optional().nullable(),
});

export const bundleConfigSchema = z
  .object({
    partnerProductIds: z.array(z.string().min(1)).min(1).max(10),
    discountType: z.enum(DISCOUNT_TYPES).default("PERCENT"),
    discountValue: z.number().min(0),
    requireAll: z.boolean().default(true),
  })
  .superRefine(discountValueRefinement);

export type VolumeTier = z.infer<typeof volumeTierSchema>;
export type VolumeConfig = z.infer<typeof volumeConfigSchema>;
export type SubscriptionConfig = z.infer<typeof subscriptionConfigSchema>;
export type FreeGiftConfig = z.infer<typeof freeGiftConfigSchema>;
export type BundleConfig = z.infer<typeof bundleConfigSchema>;

export type PromotionConfigByType = {
  VOLUME: VolumeConfig;
  SUBSCRIPTION: SubscriptionConfig;
  FREE_GIFT: FreeGiftConfig;
  BUNDLE: BundleConfig;
};

export const promotionTypeLabels: Record<ProductPromotionType, string> = {
  VOLUME: "Descuento por volumen",
  SUBSCRIPTION: "Descuento por suscripción",
  FREE_GIFT: "Regalo gratis",
  BUNDLE: "Combo / Pack",
};

export function parsePromotionConfig<T extends ProductPromotionType>(
  type: T,
  config: unknown
): PromotionConfigByType[T] {
  switch (type) {
    case "VOLUME":
      return volumeConfigSchema.parse(config) as PromotionConfigByType[T];
    case "SUBSCRIPTION":
      return subscriptionConfigSchema.parse(config) as PromotionConfigByType[T];
    case "FREE_GIFT":
      return freeGiftConfigSchema.parse(config) as PromotionConfigByType[T];
    case "BUNDLE":
      return bundleConfigSchema.parse(config) as PromotionConfigByType[T];
    default:
      throw new Error(`Unknown promotion type: ${type}`);
  }
}

const baseFields = {
  name: z.string().min(1).max(120),
  active: z.boolean().default(true),
  priority: z.number().int().default(0),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  productIds: z.array(z.string().min(1)).default([]),
  categoryIds: z.array(z.string().min(1)).default([]),
};

export const createPromotionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("VOLUME"),
    config: volumeConfigSchema,
    ...baseFields,
  }),
  z.object({
    type: z.literal("SUBSCRIPTION"),
    config: subscriptionConfigSchema,
    ...baseFields,
  }),
  z.object({
    type: z.literal("FREE_GIFT"),
    config: freeGiftConfigSchema,
    ...baseFields,
  }),
  z.object({
    type: z.literal("BUNDLE"),
    config: bundleConfigSchema,
    ...baseFields,
  }),
]);

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;

export const updatePromotionSchema = createPromotionSchema;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;

export interface PromotionTargetSummary {
  products: Array<{ id: string; name: string; slug: string; image: string | null }>;
  categories: Array<{ id: string; name: string; slug: string }>;
}

export interface FreeGiftProductSummary {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  basePrice: number;
}

export type BundlePartnerProduct = FreeGiftProductSummary;

export interface PromotionData {
  id: string;
  name: string;
  type: ProductPromotionType;
  active: boolean;
  priority: number;
  config: VolumeConfig | SubscriptionConfig | FreeGiftConfig | BundleConfig;
  startsAt: string | null;
  expiresAt: string | null;
  usageCount: number;
  /** Cumulative S/. amount this promotion has saved customers across all
   *  orders. Bumped after each successful checkout. */
  totalDiscountApplied: number;
  productIds: string[];
  categoryIds: string[];
  targets?: PromotionTargetSummary;
  /** Only populated for FREE_GIFT promotions, when the gift product still exists. */
  freeGiftProduct?: FreeGiftProductSummary | null;
  /** Only populated for BUNDLE promotions — partner products to display
   *  in the "frequently bought together" widget. */
  bundlePartnerProducts?: BundlePartnerProduct[];
  createdAt: string;
  updatedAt: string;
}

/** What a Product editor sees: a promotion that affects this product, with
 *  origin info so we can show "linked directly" vs "linked via category X". */
export interface ProductScopedPromotion extends PromotionData {
  matchSource: "DIRECT" | "CATEGORY";
  matchedCategoryName?: string;
}
