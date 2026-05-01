import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export type PixelPlatform =
  | "FACEBOOK"
  | "TIKTOK"
  | "GOOGLE_ADS"
  | "GOOGLE_ANALYTICS";

export interface ActivePixel {
  platform: PixelPlatform;
  config: unknown;
  testMode: boolean;
}

/**
 * Plan 16 perf: cached read of enabled tracking pixels for the storefront
 * layout. Wrapped with `unstable_cache` + tag `tracking-pixels` so that
 * iframe `router.refresh()` round-trips during the customizer don't re-hit
 * Postgres. Mutations in `actions/tracking-pixels.ts` invalidate via
 * `updateTag("tracking-pixels")`.
 */
export const getActivePixelsCached = unstable_cache(
  async (): Promise<{ success: boolean; pixels: ActivePixel[] }> => {
    try {
      const pixels = await prisma.trackingPixel.findMany({
        where: { enabled: true },
        select: {
          platform: true,
          config: true,
          testMode: true,
        },
      });
      return {
        success: true,
        pixels: pixels.map((p) => ({
          platform: p.platform as PixelPlatform,
          config: p.config,
          testMode: p.testMode,
        })),
      };
    } catch (error) {
      console.error("Error al obtener píxeles activos:", error);
      return { success: false, pixels: [] };
    }
  },
  ["tracking-pixels-active"],
  { tags: ["tracking-pixels"] },
);
