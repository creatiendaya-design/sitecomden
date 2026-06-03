"use server";

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { protectRoute } from "@/lib/protect-route";
import { logAudit } from "@/lib/audit-log";
import {
  type ReviewRequestConfig,
  REVIEW_REQUEST_SETTING_KEY,
  coerceReviewRequestConfig,
} from "@/lib/reviews/request-config";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

/** Reads the config from the DB, merging over defaults. Usable from the cron
 *  endpoint (no auth) and the admin page. */
export async function getReviewRequestConfig(): Promise<ReviewRequestConfig> {
  const setting = await prisma.setting.findUnique({
    where: { key: REVIEW_REQUEST_SETTING_KEY },
  });
  return coerceReviewRequestConfig(setting?.value);
}

export async function updateReviewRequestConfig(
  input: ReviewRequestConfig
): Promise<ActionResult> {
  try {
    const userId = await protectRoute("reviews:moderate");

    const config = coerceReviewRequestConfig(input);
    if (config.daysAfterDelivery > 365) {
      return { success: false, error: "El máximo es 365 días" };
    }
    if (!config.subject.trim() || !config.message.trim()) {
      return { success: false, error: "Asunto y mensaje son obligatorios" };
    }

    const value = config as unknown as Prisma.InputJsonValue;
    await prisma.setting.upsert({
      where: { key: REVIEW_REQUEST_SETTING_KEY },
      update: { value, updatedAt: new Date() },
      create: {
        key: REVIEW_REQUEST_SETTING_KEY,
        value,
        category: "reviews",
        description: "Configuración del email post-compra de reseñas",
      },
    });

    await logAudit({
      action: "review_request_config.updated",
      userId,
      entityType: "Setting",
      entityId: REVIEW_REQUEST_SETTING_KEY,
      after: { enabled: config.enabled, days: config.daysAfterDelivery },
    });

    revalidatePath("/admin/resenas/configuracion");
    return { success: true };
  } catch (error) {
    console.error("Error updating review request config:", error);
    return { success: false, error: "Error al guardar la configuración" };
  }
}
