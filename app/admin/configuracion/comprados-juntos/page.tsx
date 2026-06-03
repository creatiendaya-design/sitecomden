export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { protectRoute } from "@/lib/protect-route";
import { getFbtConfig } from "@/lib/recommendations/fbt-settings";
import FbtSettingsForm from "@/components/admin/recommendations/FbtSettingsForm";

export default async function FbtSettingsPage() {
  await protectRoute("settings:view");

  const config = await getFbtConfig();

  return (
    <div className="space-y-6 pb-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link href="/admin/configuracion">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Configuración
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Comprados juntos</h1>
        <p className="mt-2 text-muted-foreground">
          Configura la sección de venta cruzada (&quot;frequently bought
          together&quot;) que aparece en las fichas de producto. Las
          recomendaciones son híbridas: usan la selección manual de cada
          producto y, si no hay, se deducen de las compras reales y la
          categoría.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Configuración de la sección</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <FbtSettingsForm initial={config} />
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <p className="font-medium text-blue-900">¿Cómo se eligen los productos?</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
            <li>
              <strong>Manual</strong>: lo que defines en cada producto (sección
              &quot;Comprados juntos&quot; del editor) tiene prioridad.
            </li>
            <li>
              <strong>Automático</strong>: si un producto no tiene selección
              manual, se recomiendan los artículos más comprados junto a él.
            </li>
            <li>
              <strong>Respaldo</strong>: si aún no hay historial, se usan
              productos de la misma categoría para no dejar la sección vacía.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
