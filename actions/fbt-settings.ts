"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { updateTag, revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import {
  FBT_SETTING_KEY,
  FBT_DEFAULTS,
  type FbtConfig,
  type FbtAddMode,
} from "@/lib/recommendations/fbt-settings";

function sanitize(input: Partial<FbtConfig>): FbtConfig {
  const mode: FbtAddMode =
    input.mode === "individual" ||
    input.mode === "add_all" ||
    input.mode === "add_all_discount"
      ? input.mode
      : FBT_DEFAULTS.mode;
  return {
    enabled: Boolean(input.enabled),
    title: (input.title ?? FBT_DEFAULTS.title).toString().trim().slice(0, 80) ||
      FBT_DEFAULTS.title,
    mode,
    limit: Math.min(Math.max(Math.round(Number(input.limit ?? FBT_DEFAULTS.limit)), 1), 8),
    discountPercent: Math.min(
      Math.max(Number(input.discountPercent ?? 0), 0),
      90,
    ),
  };
}

export async function saveFbtConfig(
  input: Partial<FbtConfig>,
): Promise<{ success: boolean; error?: string }> {
  const { response } = await requirePermission("settings:update");
  if (response) return { success: false, error: "No autorizado" };

  const value = sanitize(input) as unknown as Prisma.InputJsonValue;

  await prisma.setting.upsert({
    where: { key: FBT_SETTING_KEY },
    update: { value, category: "commerce" },
    create: { key: FBT_SETTING_KEY, value, category: "commerce" },
  });

  updateTag("fbt-config");
  revalidatePath("/admin/configuracion/comprados-juntos");
  return { success: true };
}
