import { getSiteSettings } from "@/lib/site-settings";
import CheckoutPageClient from "./CheckoutPageClient";
import { prisma } from "@/lib/db";
import { getDepartments } from "@/actions/locations";
import { getEnabledPaymentMethods } from "@/actions/payment-settings";

export default async function CheckoutPage() {
  // Fetch everything the checkout needs on the server, in parallel. Loading
  // departments + enabled payment methods here (instead of in client effects)
  // removes two cold-Neon round-trips on mount — they arrive with the SSR'd
  // page so the location + payment selectors render instantly, no spinner.
  const [settings, sunatSetting, igvSetting, departmentsResult, enabledMethods] =
    await Promise.all([
      getSiteSettings(),
      prisma.setting.findUnique({ where: { key: "sunat_enabled" } }),
      prisma.setting.findUnique({ where: { key: "sunat_prices_include_igv" } }),
      getDepartments(),
      getEnabledPaymentMethods(),
    ]);

  const sunatEnabled = sunatSetting?.value === true || sunatSetting?.value === "true";
  const pricesIncludeIgv = igvSetting?.value !== false;
  const departments = departmentsResult.success ? departmentsResult.data : [];

  return (
    <CheckoutPageClient
      siteName={settings.site_name}
      siteLogo={settings.site_logo}
      sunatEnabled={sunatEnabled}
      pricesIncludeIgv={pricesIncludeIgv}
      departments={departments}
      enabledMethods={enabledMethods}
    />
  );
}
