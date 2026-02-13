// app/checkout/page.tsx
import { getSiteSettings } from "@/lib/site-settings"; // ✅ Correcto
import CheckoutPageClient from "./CheckoutPageClient";

export default async function CheckoutPage() {
  // ✅ Obtener settings en el servidor
  const settings = await getSiteSettings();
  
  return (
    <CheckoutPageClient 
      siteName={settings.site_name}
      siteLogo={settings.site_logo}
    />
  );
}