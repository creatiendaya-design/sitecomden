import { getSiteSettings } from "@/lib/site-settings";
import { getCspNonce } from "@/lib/csp";
import Header from "@/components/shop/Header";
import Footer from "@/components/shop/Footer";
import GeneralCartDrawer from "@/components/shop/GeneralCartDrawer";
import ThemePreviewBanner from "@/components/shop/ThemePreviewBanner";
import { PreviewRefreshListener } from "@/components/shop/PreviewRefreshListener";
import { getActivePixels } from "@/actions/tracking-pixels";
import ConsentAwarePixels from "@/components/tracking/ConsentAwarePixels";
import CookieConsentBanner from "@/components/shop/CookieConsentBanner";
import { resolveActiveTheme } from "@/lib/themes/resolve-active-theme";
import { getThemesHash } from "@/lib/themes/get-themes-hash";
import { buildOnlineStoreSchema, buildWebSiteSchema } from "@/lib/seo/jsonld";
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

  // Structured Data — OnlineStore (subtype of Store/Organization). Richer
  // than a bare Organization for retail; lets generative shopping engines
  // (Copilot Shopping, Perplexity) compare us against other merchants.
  const organizationSchema = buildOnlineStoreSchema({
    name: settings.site_name,
    url: settings.site_url,
    logo: settings.site_logo,
    description: settings.seo_home_description,
    email: settings.contact_email,
    phone: settings.contact_phone,
    streetAddress: settings.contact_address,
    countryCode: "PE",
    sameAs: [
      settings.social_facebook,
      settings.social_instagram,
      settings.social_twitter,
      settings.social_tiktok,
    ],
    currenciesAccepted: settings.default_currency || "PEN",
    paymentAccepted: [
      "Visa",
      "Mastercard",
      "American Express",
      "Yape",
      "Plin",
      "PayPal",
      "Contra entrega",
    ],
    areaServed: ["PE"],
  });

  const siteUrl = settings.site_url.replace(/\/$/, "");
  const websiteSchema = buildWebSiteSchema({
    name: settings.site_name,
    url: settings.site_url,
    searchUrlTemplate: `${siteUrl}/productos?q={search_term_string}`,
  });

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
      {/* Structured Data del sitio (habilita el search-box en Google) */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      {/* Theme scope: every storefront rule that uses var(--theme-*) lives
          under this wrapper, so admin pages never inherit storefront tokens. */}
      <div className={`flex min-h-screen flex-col${themeClass ? ` ${themeClass}` : ""}`}>
        <ThemePreviewBanner />
        <PreviewRefreshListener />
        {/* Plan 19 — wrappers let a product template hide the global header /
            footer via CSS (landing-style pages). See product page. */}
        <div data-site-header>
          <Header />
        </div>
        <main className="flex-1">{children}</main>
        <div data-site-footer>
          <Footer />
        </div>
        <GeneralCartDrawer />
      </div>
    </>
  );
}