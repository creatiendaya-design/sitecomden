export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, Package, Paintbrush, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { protectRoute } from "@/lib/protect-route";

export default async function FbtSettingsPage() {
  await protectRoute("settings:view");

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
          La sección de venta cruzada (&quot;comprados juntos&quot;) ahora es una
          sección del tema: se agrega, edita y posiciona desde el Personalizador,
          como cualquier otra sección de la ficha de producto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Paintbrush className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">¿Dónde la edito?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>
              Entra al{" "}
              <Link
                href="/admin/personalizar"
                className="font-medium text-primary underline underline-offset-2"
              >
                Personalizador
              </Link>{" "}
              y abre tu tema.
            </li>
            <li>
              Ve a la plantilla <strong>Producto</strong> y pulsa{" "}
              <strong>“Agregar sección”</strong>.
            </li>
            <li>
              Elige <strong>“Comprados juntos”</strong> y ajusta título, modo
              (combo o botón por producto), cantidad y estilos.
            </li>
          </ol>
          <Button asChild>
            <Link href="/admin/personalizar">
              <Paintbrush className="mr-2 h-4 w-4" />
              Ir al Personalizador
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="space-y-3 p-6 text-sm">
          <div className="flex items-start gap-3 text-blue-800">
            <Package className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>¿Cómo se eligen los productos?</strong> Lo que definas en
              cada producto (sección &quot;Comprados juntos&quot; del editor de
              producto) tiene prioridad; si no, se deducen de las compras reales
              y la categoría.
            </p>
          </div>
          <div className="flex items-start gap-3 text-blue-800">
            <Tag className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>¿Descuento en combos?</strong> Crea una promoción tipo{" "}
              <Link
                href="/admin/promociones"
                className="underline underline-offset-2"
              >
                Bundle
              </Link>
              ; el descuento se valida en el checkout.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
