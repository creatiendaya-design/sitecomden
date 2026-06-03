"use server";

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { protectRoute } from "@/lib/protect-route";
import { logAudit } from "@/lib/audit-log";
import {
  type ReviewRewardConfig,
  REVIEW_REWARD_SETTING_KEY,
  coerceReviewRewardConfig,
} from "@/lib/reviews/reward-config";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

/** Reads the reward config, merging over defaults. Usable without auth (the
 *  approval flow calls it server-side). */
export async function getReviewRewardConfig(): Promise<ReviewRewardConfig> {
  const setting = await prisma.setting.findUnique({
    where: { key: REVIEW_REWARD_SETTING_KEY },
  });
  return coerceReviewRewardConfig(setting?.value);
}

export async function updateReviewRewardConfig(
  input: ReviewRewardConfig
): Promise<ActionResult> {
  try {
    const userId = await protectRoute("reviews:moderate");

    const config = coerceReviewRewardConfig(input);
    if (config.value <= 0) {
      return { success: false, error: "El valor debe ser mayor a 0" };
    }
    if (config.couponType === "PERCENTAGE" && config.value > 100) {
      return { success: false, error: "El porcentaje no puede superar 100" };
    }
    if (config.expiresInDays < 1 || config.expiresInDays > 365) {
      return { success: false, error: "La validez debe estar entre 1 y 365 días" };
    }

    const value = config as unknown as Prisma.InputJsonValue;
    await prisma.setting.upsert({
      where: { key: REVIEW_REWARD_SETTING_KEY },
      update: { value, updatedAt: new Date() },
      create: {
        key: REVIEW_REWARD_SETTING_KEY,
        value,
        category: "reviews",
        description: "Configuración del cupón de recompensa por reseña",
      },
    });

    await logAudit({
      action: "review_reward_config.updated",
      userId,
      entityType: "Setting",
      entityId: REVIEW_REWARD_SETTING_KEY,
      after: {
        enabled: config.enabled,
        couponType: config.couponType,
        value: config.value,
      },
    });

    revalidatePath("/admin/resenas/configuracion");
    return { success: true };
  } catch (error) {
    console.error("Error updating review reward config:", error);
    return { success: false, error: "Error al guardar la configuración" };
  }
}
