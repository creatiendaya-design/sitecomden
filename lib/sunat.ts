import { prisma } from "./db";
import { decrypt } from "./sunat-crypto";
import { NubefactProvider } from "./sunat-nubefact";
import type { SunatConfig, SunatProvider } from "./sunat-types";

export function getSunatProvider(): SunatProvider {
  return new NubefactProvider();
}

export async function getSunatConfig(): Promise<SunatConfig | null> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "sunat_enabled",
          "sunat_emission_mode",
          "sunat_api_key",
          "sunat_api_url",
          "sunat_ruc",
          "sunat_razon_social",
          "sunat_address",
          "sunat_boleta_series",
          "sunat_factura_series",
          "sunat_prices_include_igv",
        ],
      },
    },
  });

  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));

  if (!s.sunat_enabled || s.sunat_enabled !== true) return null;

  const encryptedKey = s.sunat_api_key as string;
  let apiKey = "";
  try {
    apiKey = decrypt(encryptedKey);
  } catch {
    return null;
  }

  return {
    enabled: true,
    emissionMode: (s.sunat_emission_mode as "auto" | "manual" | "mixed") ?? "manual",
    apiKey,
    apiUrl: (s.sunat_api_url as string) ?? "https://demo-ose.nubefact.com/ose/api",
    ruc: s.sunat_ruc as string,
    razonSocial: s.sunat_razon_social as string,
    address: s.sunat_address as string,
    boletaSeries: (s.sunat_boleta_series as string) ?? "B001",
    facturaSeries: (s.sunat_factura_series as string) ?? "F001",
    pricesIncludeIgv: s.sunat_prices_include_igv === true,
  };
}
