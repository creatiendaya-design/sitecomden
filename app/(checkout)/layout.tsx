import CheckoutHeader from "@/components/shop/CheckoutHeader";
import CheckoutFooter from "@/components/shop/CheckoutFooter";
import { getSiteSettings } from "@/lib/site-settings";
import { getActivePixels } from "@/actions/tracking-pixels";
import PixelScripts from "@/components/tracking/PixelScripts";
import Script from "next/script";

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  
  // ✅ Obtener píxeles activos
  const { pixels } = await getActivePixels();

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
      {/* Structured Data de Organización */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      
      {/* ✅ Píxeles de Tracking */}
      <PixelScripts pixels={pixels} />
      
      {/* Culqi Script */}
      <Script
        src="https://checkout.culqi.com/js/v4"
        strategy="lazyOnload"
      />
      
      <div className="flex min-h-screen flex-col">
        <CheckoutHeader />
        <main className="flex-1 bg-slate-50/50">{children}</main>
        <CheckoutFooter />
      </div>
    </>
  );
}