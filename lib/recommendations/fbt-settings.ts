/**
 * Configuration for the storefront "Comprados juntos" (frequently bought
 * together) section. Stored as a single `Setting` row (key `fbt_config`,
 * JSON value) so it doesn't bloat the cached SiteSettings object.
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

/**
 * How the section adds products to the cart:
 * - `individual`        — each card has its own "add" button.
 * - `add_all`           — one button adds the whole combo at normal price.
 * - `add_all_discount`  — one button adds the combo with a bundle discount.
 */
export type FbtAddMode = "individual" | "add_all" | "add_all_discount";

export interface FbtConfig {
  enabled: boolean;
  title: string;
  mode: FbtAddMode;
  /** How many recommended products to show (excluding the current one). */
  limit: number;
  /** Bundle discount % applied to recommended items in `add_all_discount`. */
  discountPercent: number;
}

export const FBT_SETTING_KEY = "fbt_config";

export const FBT_DEFAULTS: FbtConfig = {
  enabled: true,
  title: "Comprados juntos",
  mode: "add_all",
  limit: 3,
  discountPercent: 0,
};

function coerce(raw: unknown): FbtConfig {
  if (!raw || typeof raw !== "object") return FBT_DEFAULTS;
  const v = raw as Record<string, unknown>;
  const mode: FbtAddMode =
    v.mode === "individual" ||
    v.mode === "add_all" ||
    v.mode === "add_all_discount"
      ? v.mode
      : FBT_DEFAULTS.mode;
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : FBT_DEFAULTS.enabled,
    title:
      typeof v.title === "string" && v.title.trim()
        ? v.title.trim()
        : FBT_DEFAULTS.title,
    mode,
    limit:
      typeof v.limit === "number"
        ? Math.min(Math.max(Math.round(v.limit), 1), 8)
        : FBT_DEFAULTS.limit,
    discountPercent:
      typeof v.discountPercent === "number"
        ? Math.min(Math.max(v.discountPercent, 0), 90)
        : FBT_DEFAULTS.discountPercent,
  };
}

async function _getFbtConfig(): Promise<FbtConfig> {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: FBT_SETTING_KEY },
    });
    return coerce(row?.value);
  } catch {
    return FBT_DEFAULTS;
  }
}

/** Cached config read for the storefront. Invalidate with tag `fbt-config`. */
export const getFbtConfig = unstable_cache(_getFbtConfig, ["fbt-config"], {
  tags: ["fbt-config"],
});
