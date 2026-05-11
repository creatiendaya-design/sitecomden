import type {
  BundleConfig,
  FreeGiftConfig,
  ProductScopedPromotion,
  VolumeConfig,
  VolumeTier,
} from "./types";

/** Pure-function helpers used by the storefront to render and resolve
 *  promotions on the product page. Server actions read from the DB; these
 *  helpers operate on already-loaded data. */

export function pickActiveVolumePromotion(
  promotions: ProductScopedPromotion[]
): ProductScopedPromotion | null {
  const candidates = promotions.filter(
    (p) => p.active && p.type === "VOLUME" && isWithinSchedule(p)
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.matchSource !== b.matchSource) {
      return a.matchSource === "DIRECT" ? -1 : 1;
    }
    return 0;
  });
  return candidates[0];
}

export function pickActiveSubscriptionPromotion(
  promotions: ProductScopedPromotion[]
): ProductScopedPromotion | null {
  const candidates = promotions.filter(
    (p) => p.active && p.type === "SUBSCRIPTION" && isWithinSchedule(p)
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

function isWithinSchedule(p: ProductScopedPromotion): boolean {
  const now = Date.now();
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return false;
  if (p.expiresAt && new Date(p.expiresAt).getTime() < now) return false;
  return true;
}

export interface VolumeAppliedTier {
  tier: VolumeTier;
  index: number;
}

/** Finds the best (highest qty matching) tier for a given quantity. */
export function resolveVolumeTier(
  qty: number,
  tiers: VolumeTier[]
): VolumeAppliedTier | null {
  let best: VolumeAppliedTier | null = null;
  tiers.forEach((tier, index) => {
    if (qty >= tier.minQty) {
      if (!best || tier.minQty > best.tier.minQty) {
        best = { tier, index };
      }
    }
  });
  return best;
}

export interface VolumeBreakdown {
  qty: number;
  unitPrice: number;
  appliedTier: VolumeAppliedTier | null;
  discountPerUnit: number;
  totalDiscount: number;
  subtotal: number;
  total: number;
}

export function computeVolumeBreakdown(
  qty: number,
  unitPrice: number,
  config: VolumeConfig
): VolumeBreakdown {
  const safeQty = Math.max(1, Math.floor(qty));
  const subtotal = unitPrice * safeQty;
  const matched = resolveVolumeTier(safeQty, config.tiers);

  if (!matched) {
    return {
      qty: safeQty,
      unitPrice,
      appliedTier: null,
      discountPerUnit: 0,
      totalDiscount: 0,
      subtotal,
      total: subtotal,
    };
  }

  const tier = matched.tier;
  let discountPerUnit = 0;
  if (tier.discountType === "PERCENT") {
    discountPerUnit = (unitPrice * tier.discountValue) / 100;
  } else {
    discountPerUnit = Math.min(tier.discountValue, unitPrice);
  }
  const totalDiscount = roundCurrency(discountPerUnit * safeQty);
  const total = roundCurrency(subtotal - totalDiscount);

  return {
    qty: safeQty,
    unitPrice,
    appliedTier: matched,
    discountPerUnit: roundCurrency(discountPerUnit),
    totalDiscount,
    subtotal: roundCurrency(subtotal),
    total,
  };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface TierDisplay {
  index: number;
  qty: number;
  label: string;
  totalPrice: number;
  originalPrice: number;
  savingsLabel: string | null;
  /** Empty string when the tier should render without a badge. */
  badgeText: string;
  /** Resolved hex (with the # prefix) for badge background. */
  badgeColor: string;
  /** Resolved hex for badge text. */
  badgeTextColor: string;
  featured: boolean;
}

const FALLBACK_BADGE_COLOR = "#F97316"; // tailwind orange-500
const FALLBACK_BADGE_TEXT_COLOR = "#FFFFFF";

function resolveBadgeText(tier: VolumeTier): string {
  return tier.badgeText?.trim() ?? "";
}

function resolveBadgeColor(tier: VolumeTier): string {
  return tier.badgeColor ?? FALLBACK_BADGE_COLOR;
}

function resolveBadgeTextColor(tier: VolumeTier): string {
  return tier.badgeTextColor ?? FALLBACK_BADGE_TEXT_COLOR;
}

/** Pre-compute display data for every tier (plus the synthetic "1 unit"
 *  baseline) so the radio-card selector can render without re-running the
 *  math on each click. */
export function buildTierDisplays(
  unitPrice: number,
  config: VolumeConfig
): TierDisplay[] {
  const baseline: TierDisplay = {
    index: -1,
    qty: 1,
    label: "1 Unidad",
    totalPrice: roundCurrency(unitPrice),
    originalPrice: roundCurrency(unitPrice),
    savingsLabel: null,
    badgeText: "",
    badgeColor: FALLBACK_BADGE_COLOR,
    badgeTextColor: FALLBACK_BADGE_TEXT_COLOR,
    featured: false,
  };

  const tiers = config.tiers.map((tier, index): TierDisplay => {
    const breakdown = computeVolumeBreakdown(tier.minQty, unitPrice, config);
    const savingsLabel =
      tier.discountType === "PERCENT"
        ? `Ahorra ${tier.discountValue}%`
        : `Ahorra S/ ${tier.discountValue.toFixed(2)}`;
    return {
      index,
      qty: tier.minQty,
      label: tier.label && tier.label.length > 0 ? tier.label : `${tier.minQty} Unidades`,
      totalPrice: breakdown.total,
      originalPrice: breakdown.subtotal,
      savingsLabel,
      badgeText: resolveBadgeText(tier),
      badgeColor: resolveBadgeColor(tier),
      badgeTextColor: resolveBadgeTextColor(tier),
      featured: tier.featured ?? false,
    };
  });

  return [baseline, ...tiers];
}

/** Returns the index of the tier flagged as `featured`, otherwise baseline. */
export function pickDefaultTierIndex(displays: TierDisplay[]): number {
  const featuredIdx = displays.findIndex((d) => d.featured);
  if (featuredIdx >= 0) return featuredIdx;
  return 0;
}

export function pickActiveFreeGiftPromotion(
  promotions: ProductScopedPromotion[]
): ProductScopedPromotion | null {
  const candidates = promotions.filter(
    (p) => p.active && p.type === "FREE_GIFT" && isWithinSchedule(p)
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

export interface FreeGiftProgress {
  qualified: boolean;
  /** 0..1 ratio of currentSubtotal toward minSubtotal. */
  progress: number;
  /** Currency amount still needed to qualify. 0 once qualified. */
  remaining: number;
  minSubtotal: number;
}

export function computeFreeGiftProgress(
  currentSubtotal: number,
  config: FreeGiftConfig
): FreeGiftProgress {
  const min = Math.max(0, config.minSubtotal);
  if (min <= 0) {
    return { qualified: true, progress: 1, remaining: 0, minSubtotal: 0 };
  }
  const ratio = Math.min(1, Math.max(0, currentSubtotal / min));
  const remaining = Math.max(0, min - currentSubtotal);
  return {
    qualified: currentSubtotal >= min,
    progress: ratio,
    remaining: Math.round(remaining * 100) / 100,
    minSubtotal: min,
  };
}

export function pickActiveBundlePromotion(
  promotions: ProductScopedPromotion[]
): ProductScopedPromotion | null {
  const candidates = promotions.filter(
    (p) => p.active && p.type === "BUNDLE" && isWithinSchedule(p)
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

export interface BundleLine {
  productId: string;
  name: string;
  image: string | null;
  unitPrice: number;
  /** Discount per unit applied to this product line. */
  discountPerUnit: number;
  /** Final price per unit after discount. */
  finalUnitPrice: number;
}

export interface BundleBreakdown {
  lines: BundleLine[];
  subtotal: number;
  totalDiscount: number;
  total: number;
}

/** Computes per-line discount for a bundle. PERCENT applies to each line
 *  proportionally; FIXED is distributed across lines weighted by price so
 *  no line goes below 0. */
export function computeBundleBreakdown(args: {
  config: BundleConfig;
  anchor: { productId: string; name: string; image: string | null; unitPrice: number };
  partners: Array<{
    productId: string;
    name: string;
    image: string | null;
    unitPrice: number;
  }>;
}): BundleBreakdown {
  const { config, anchor, partners } = args;
  const items = [anchor, ...partners];
  const subtotal = items.reduce((sum, p) => sum + p.unitPrice, 0);

  const lines: BundleLine[] = items.map((p) => {
    let discountPerUnit = 0;
    if (config.discountType === "PERCENT") {
      discountPerUnit = (p.unitPrice * config.discountValue) / 100;
    } else if (subtotal > 0) {
      const proportion = p.unitPrice / subtotal;
      discountPerUnit = Math.min(p.unitPrice, config.discountValue * proportion);
    }
    discountPerUnit = Math.round(discountPerUnit * 100) / 100;
    return {
      productId: p.productId,
      name: p.name,
      image: p.image,
      unitPrice: p.unitPrice,
      discountPerUnit,
      finalUnitPrice: Math.round((p.unitPrice - discountPerUnit) * 100) / 100,
    };
  });

  const totalDiscount =
    Math.round(lines.reduce((sum, l) => sum + l.discountPerUnit, 0) * 100) / 100;
  const total = Math.round((subtotal - totalDiscount) * 100) / 100;
  return {
    lines,
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount,
    total,
  };
}
