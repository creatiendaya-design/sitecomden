import { getSiteSettings } from "@/lib/site-settings";
import CheckoutPageClient from "./CheckoutPageClient";
import { prisma } from "@/lib/db";

export default async function CheckoutPage() {
  const [settings, sunatSetting, igvSetting] = await Promise.all([
    getSiteSettings(),
    prisma.setting.findUnique({ where: { key: "sunat_enabled" } }),
    prisma.setting.findUnique({ where: { key: "sunat_prices_include_igv" } }),
  ]);

  const sunatEnabled = sunatSetting?.value === true || sunatSetting?.value === "true";
  const pricesIncludeIgv = igvSetting?.value !== false;

  return (
    <CheckoutPageClient
      siteName={settings.site_name}
      siteLogo={settings.site_logo}
      sunatEnabled={sunatEnabled}
      pricesIncludeIgv={pricesIncludeIgv}
    />
  );
}