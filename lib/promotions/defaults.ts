import type { ProductPromotionType } from "@prisma/client";
import type {
  BundleConfig,
  FreeGiftConfig,
  SubscriptionConfig,
  VolumeConfig,
} from "./types";

export const DEFAULT_VOLUME_CONFIG: VolumeConfig = {
  tiers: [
    {
      minQty: 2,
      discountType: "PERCENT",
      discountValue: 20,
      label: "2 Unidades",
      badgeText: "Most popular",
      badgeColor: "#F97316",
      badgeTextColor: "#FFFFFF",
      featured: true,
    },
    {
      minQty: 3,
      discountType: "PERCENT",
      discountValue: 30,
      label: "3 Unidades",
      badgeText: "Best value",
      badgeColor: "#16A34A",
      badgeTextColor: "#FFFFFF",
      featured: false,
    },
  ],
  sameVariantOnly: false,
};

export const DEFAULT_SUBSCRIPTION_CONFIG: SubscriptionConfig = {
  discountType: "PERCENT",
  discountValue: 10,
  ctaLabel: "Suscríbete y obtén 10% de descuento",
};

export const DEFAULT_FREE_GIFT_CONFIG: FreeGiftConfig = {
  minSubtotal: 100,
  giftProductId: "",
  giftVariantId: null,
};

export const DEFAULT_BUNDLE_CONFIG: BundleConfig = {
  partnerProductIds: [],
  discountType: "PERCENT",
  discountValue: 15,
  requireAll: true,
};

export function getDefaultConfig(type: ProductPromotionType) {
  switch (type) {
    case "VOLUME":
      return DEFAULT_VOLUME_CONFIG;
    case "SUBSCRIPTION":
      return DEFAULT_SUBSCRIPTION_CONFIG;
    case "FREE_GIFT":
      return DEFAULT_FREE_GIFT_CONFIG;
    case "BUNDLE":
      return DEFAULT_BUNDLE_CONFIG;
  }
}
