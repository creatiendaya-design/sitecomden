import CheckoutHeader from "@/components/shop/CheckoutHeader";
import "@/app/styles/checkout.css";
import CheckoutFooter from "@/components/shop/CheckoutFooter";
import { getSiteSettings } from "@/lib/site-settings";
import { getCspNonce } from "@/lib/csp";
import { getActivePixels } from "@/actions/tracking-pixels";
import ConsentAwarePixels from "@/components/tracking/ConsentAwarePixels";
import CookieConsentBanner from "@/components/shop/CookieConsentBanner";
import Script from "next/script";
import { resolveActiveTheme } from "@/lib/themes/resolve-active-theme";
import { getThemesHash } from "@/lib/themes/get-themes-hash";

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const nonce = await getCspNonce();

  // ✅ Obtener píxeles activos
  const { pixels } = await getActivePixels();

  // Plan 11: theme tokens — checkout inherits the same brand identity as
  // the storefront so the buy flow stays visually consistent.
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
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: settings.contact_email,
      telephone: settings.contact_phone,
      availableLanguage: ["Spanish"],
    },
  };

  return (
    <>
      {/* Plan 11: shared theme tokens stylesheet (same hash & cache as the
          storefront layout). */}
      <link rel="stylesheet" href={`/api/themes/tokens.css?h=${themesHash}`} />
      {/* Structured Data de Organización */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* Píxeles de Tracking (solo con consentimiento) */}
      <ConsentAwarePixels pixels={pixels} nonce={nonce} />
      <CookieConsentBanner />

      {/* Culqi Script */}
      <Script
        src="https://checkout.culqi.com/js/v4"
        strategy="lazyOnload"
        nonce={nonce}
      />

      <div className={`flex min-h-screen flex-col${themeClass ? ` ${themeClass}` : ""}`}>
        <CheckoutHeader />
        <main className="flex-1 bg-slate-50/50">{children}</main>
        <CheckoutFooter />
      </div>
    </>
  );
}