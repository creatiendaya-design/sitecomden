export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import SunatConfigForm from "./SunatConfigForm";

export default async function SunatConfigPage() {
  await protectRoute("settings:edit");

  const settings = await prisma.setting.findMany({
    where: { category: "sunat" },
  });
  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));

  const initialConfig = {
    enabled: s.sunat_enabled === true || s.sunat_enabled === "true",
    emissionMode: (s.sunat_emission_mode as string) ?? "manual",
    apiKeyMasked: s.sunat_api_key ? "ENCRYPTED" : "",
    apiUrl: (s.sunat_api_url as string) ?? "https://demo-ose.nubefact.com/ose/api",
    ruc: (s.sunat_ruc as string) ?? "",
    razonSocial: (s.sunat_razon_social as string) ?? "",
    address: (s.sunat_address as string) ?? "",
    boletaSeries: (s.sunat_boleta_series as string) ?? "B001",
    facturaSeries: (s.sunat_factura_series as string) ?? "F001",
    pricesIncludeIgv: s.sunat_prices_include_igv === true || s.sunat_prices_include_igv === "true",
  };

  return <SunatConfigForm initialConfig={initialConfig} />;
}
