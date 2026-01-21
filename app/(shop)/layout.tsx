import { getSiteSettings } from "@/lib/site-settings";
import Header from "@/components/shop/Header";
import Footer from "@/components/shop/Footer";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();

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

  return (
    <>
      {/* Structured Data de Organización */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      
      {/* Header y Footer directo - SIN LayoutWrapper */}
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </>
  );
}