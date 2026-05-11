import { getSiteSettings } from "@/lib/site-settings";
import { getCspNonce } from "@/lib/csp";
import Header from "@/components/shop/Header";
import Footer from "@/components/shop/Footer";
import ThemePreviewBanner from "@/components/shop/ThemePreviewBanner";
import { PreviewRefreshListener } from "@/components/shop/PreviewRefreshListener";
import { getActivePixels } from "@/actions/tracking-pixels";
import ConsentAwarePixels from "@/components/tracking/ConsentAwarePixels";
import CookieConsentBanner from "@/components/shop/CookieConsentBanner";
import { resolveActiveTheme } from "@/lib/themes/resolve-active-theme";
import { getThemesHash } from "@/lib/themes/get-themes-hash";
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const nonce = await getCspNonce();
  // Plan 11: pull the active/preview theme + tokens-stylesheet hash so we
  // can scope storefront rendering with `.theme-<id>` and load the right
  // CSS file. The hash is derived from MAX(theme.updatedAt) + active id so
  // the URL only changes when an admin edits or switches themes.
  const [theme, themesHash] = await Promise.all([
    resolveActiveTheme(),
    getThemesHash(),
  ]);
  const themeClass = theme ? `theme-${theme.id}` : undefined;

  // Structured Data para la organización
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.site_name,
    url: settings.site_url,
    logo: settings.site_logo,
    description: settings.seo_home_description,
    address: {
      "@type": "PostalAddress",
      addressCountry: "PE",
      streetAddress: settings.contact_address,
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: settings.contact_email,
      telephone: settings.contact_phone,
      availableLanguage: ["Spanish"],
    },
    sameAs: [
      settings.social_facebook,
      settings.social_instagram,
      settings.social_twitter,
      settings.social_tiktok,
    ].filter(Boolean),
  };
 const { pixels } = await getActivePixels();
  return (
    <>
      {/* Plan 11: theme tokens stylesheet. URL changes (?h=...) when any
          theme is edited so browsers/CDNs hit the immutable cache the rest
          of the time. Scoped via the .theme-<id> wrapper below. */}
      <link rel="stylesheet" href={`/api/themes/tokens.css?h=${themesHash}`} />
     <ConsentAwarePixels pixels={pixels} nonce={nonce} />
      <CookieConsentBanner />
      {/* Structured Data de Organización */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* Theme scope: every storefront rule that uses var(--theme-*) lives
          under this wrapper, so admin pages never inherit storefront tokens. */}
      <div className={`flex min-h-screen flex-col${themeClass ? ` ${themeClass}` : ""}`}>
        <ThemePreviewBanner />
        <PreviewRefreshListener />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </>
  );
}