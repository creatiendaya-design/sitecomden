import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-static";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();

  return {
    name: settings.site_name,
    short_name: settings.site_name,
    description: settings.seo_home_description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#020617",
    icons: settings.site_favicon
      ? [
          {
            src: settings.site_favicon,
            sizes: "any",
            type: "image/x-icon",
          },
        ]
      : [],
  };
}
