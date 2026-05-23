"use server";

import { updateTag, revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import { logAudit } from "@/lib/audit-log";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  type SupportedCurrency,
  type SupportedLocale,
} from "@/lib/i18n/types";

const updateI18nSettingsSchema = z.object({
  defaultLocale: z.enum(SUPPORTED_LOCALES),
  defaultCurrency: z.enum(SUPPORTED_CURRENCIES),
});

export interface UpdateI18nSettingsResult {
  success: boolean;
  error?: string;
}

export async function updateI18nSettings(input: {
  defaultLocale: SupportedLocale;
  defaultCurrency: SupportedCurrency;
}): Promise<UpdateI18nSettingsResult> {
  const userId = await protectRoute("settings:update");

  const parsed = updateI18nSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  // Capture previous values for the audit trail (only the keys we care about).
  const previous = await prisma.setting.findMany({
    where: { key: { in: ["default_locale", "default_currency"] } },
  });
  const previousMap = previous.reduce<Record<string, unknown>>((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: "default_locale" },
      create: {
        key: "default_locale",
        value: parsed.data.defaultLocale,
        category: "i18n",
      },
      update: { value: parsed.data.defaultLocale, category: "i18n" },
    }),
    prisma.setting.upsert({
      where: { key: "default_currency" },
      create: {
        key: "default_currency",
        value: parsed.data.defaultCurrency,
        category: "i18n",
      },
      update: { value: parsed.data.defaultCurrency, category: "i18n" },
    }),
  ]);

  // Bust the cached site settings so storefront layouts pick up the new
  // locale/currency on the next request without a full deploy.
  updateTag("site-settings");
  revalidatePath("/admin/configuracion/i18n");

  await logAudit({
    action: "settings.i18n_updated",
    userId,
    entityType: "Setting",
    before: {
      defaultLocale: previousMap.default_locale ?? null,
      defaultCurrency: previousMap.default_currency ?? null,
    },
    after: {
      defaultLocale: parsed.data.defaultLocale,
      defaultCurrency: parsed.data.defaultCurrency,
    },
  });

  return { success: true };
}
