export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { protectRoute } from "@/lib/protect-route";
import { getStoreLocaleConfig } from "@/lib/i18n/settings";
import I18nSettingsForm from "@/components/admin/i18n/I18nSettingsForm";

export default async function I18nSettingsPage() {
  await protectRoute("settings:view");

  const config = await getStoreLocaleConfig();

  return (
    <div className="space-y-6 pb-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link href="/admin/configuracion">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Configuración
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Idioma y Moneda</h1>
        <p className="mt-2 text-muted-foreground">
          Configura el idioma y la moneda por defecto que se muestran en el
          storefront. Los importes guardados en la base de datos no se
          convierten — sólo cambia su presentación.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Preferencias regionales</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <I18nSettingsForm
            initial={{
              defaultLocale: config.locale,
              defaultCurrency: config.currency,
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <p className="font-medium text-blue-900">
            ¿Por qué esta sección es importante?
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
            <li>
              Sienta las bases para la versión multi-tenant del sistema: cada
              tienda podrá tener su propio idioma y moneda.
            </li>
            <li>
              Los formatos de fecha, número y precio del storefront se generan
              a partir de estos valores.
            </li>
            <li>
              Cambiar la moneda <strong>no</strong> convierte importes
              existentes — sólo cambia el símbolo y el formato.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
