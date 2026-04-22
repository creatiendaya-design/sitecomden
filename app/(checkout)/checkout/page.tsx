import { getSiteSettings } from "@/lib/site-settings";
import CheckoutPageClient from "./CheckoutPageClient";
import { prisma } from "@/lib/db";

export default async function CheckoutPage() {
  const [settings, sunatSetting] = await Promise.all([
    getSiteSettings(),
    prisma.setting.findUnique({ where: { key: "sunat_enabled" } }),
  ]);

  const sunatEnabled = sunatSetting?.value === true;

  return (
    <CheckoutPageClient
      siteName={settings.site_name}
      siteLogo={settings.site_logo}
      sunatEnabled={sunatEnabled}
    />
  );
}