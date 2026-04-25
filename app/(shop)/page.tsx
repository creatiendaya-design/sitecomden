import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import { getActiveThemeHome } from "@/lib/themes/get-active-theme-home";
import LandingBlockRenderer from "@/components/shop/templates/blocks/LandingBlockRenderer";
import LegacyHome from "@/components/shop/home/LegacyHome";
import type { LandingBlock } from "@/lib/types/landing-blocks";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, themeHome] = await Promise.all([
    getSiteSettings(),
    getActiveThemeHome(),
  ]);

  // When the active theme has a Page assigned as home, prefer its SEO fields
  // (so the admin can override per-page just like any other static page).
  // Site-level seo_home_* settings remain the fallback.
  const title =
    themeHome?.seoTitle ?? themeHome?.title ?? settings.seo_home_title;
  const description =
    themeHome?.seoDescription ??
    themeHome?.description ??
    settings.seo_home_description;
  const ogImage = themeHome?.seoImage ?? settings.seo_home_og_image;
  const noIndex = themeHome?.noIndex ?? false;

  return {
    title,
    description,
    keywords: settings.seo_home_keywords.split(",").map((k) => k.trim()),
    openGraph: {
      title,
      description,
      url: settings.site_url,
      siteName: settings.site_name,
      locale: "es_PE",
      type: "website",
      images: ogImage ? [ogImage] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

export default async function HomePage() {
  const themeHome = await getActiveThemeHome();

  // Theme-managed home: render the page's blocks using the same renderer
  // that powers /[slug] static pages and product landings.
  if (themeHome) {
    const blocks: LandingBlock[] = themeHome.blocks.map((b) => ({
      id: b.id,
      productId: "",
      type: b.type as LandingBlock["type"],
      position: b.position,
      content: b.content as LandingBlock["content"],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return (
      <div className="min-h-screen">
        <LandingBlockRenderer blocks={blocks} />
      </div>
    );
  }

  // No theme home assigned — fall back to the legacy hardcoded layout so the
  // storefront keeps working before any seed runs.
  return <LegacyHome />;
}
