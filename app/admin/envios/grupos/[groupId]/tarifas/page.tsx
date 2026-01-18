import { getRatesByGroup, getRateGroupById } from "@/actions/shipping-system";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, DollarSign, Clock, Truck } from "lucide-react";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

export default async function ShippingRatesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { data: group } = await getRateGroupById(groupId);
  const { data: rates } = await getRatesByGroup(groupId);

  if (!group) {
    return <div>Grupo no encontrado</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/envios/zonas" className="hover:text-foreground">
          Zonas
        </Link>
        <span>/</span>
        <Link
          href={`/admin/envios/zonas/${group.zone.id}/grupos`}
          className="hover:text-foreground"
        >
          {group.zone.name}
        </Link>
        <span>/</span>
        <span>{group.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/envios/zonas/${group.zone.id}/grupos`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground">
            Tarifas de envío individuales
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/envios/grupos/${groupId}/tarifas/nueva`}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Tarifa
          </Link>
        </Button>
      </div>

      {/* Group Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Zona</p>
              <p className="font-medium">{group.zone.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Descripción</p>
              <p className="font-medium">
                {group.description || "Sin descripción"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant={group.active ? "default" : "secondary"}>
                {group.active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates List */}
      <Card>
        <CardHeader>
          <CardTitle>Tarifas Configuradas</CardTitle>
          <CardDescription>
            Lista de tarifas de envío en este grupo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No hay tarifas configuradas
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera tarifa para este grupo
              </p>
              <Button asChild>
                <Link href={`/admin/envios/grupos/${groupId}/tarifas/nueva`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Tarifa
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rates.map((rate) => (
                <Card
                  key={rate.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">
                              {rate.name}
                            </h3>
                            {rate.description && (
                              <p className="text-sm text-muted-foreground">
                                {rate.description}
                              </p>
                            )}
                          </div>
                          <Badge variant={rate.active ? "default" : "secondary"}>
                            {rate.active ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {/* Costo */}
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Costo Base
                              </p>
                              <p className="font-semibold">
                                {formatPrice(Number(rate.baseCost))}
                              </p>
                            </div>
                          </div>

                          {/* Tiempo */}
                          {rate.estimatedDays && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Tiempo
                                </p>
                                <p className="font-medium text-sm">
                                  {rate.estimatedDays}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Courier */}
                          {rate.carrier && (
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Courier
                                </p>
                                <p className="font-medium text-sm">
                                  {rate.carrier}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Envío Gratis */}
                          {rate.freeShippingMin && (
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Envío Gratis
                              </p>
                              <p className="font-medium text-sm text-green-600">
                                Desde{" "}
                                {formatPrice(Number(rate.freeShippingMin))}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Rangos de pedido */}
                        {(rate.minOrderAmount || rate.maxOrderAmount) && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-1">
                              Aplicable a pedidos:
                            </p>
                            <p className="text-sm">
                              {rate.minOrderAmount &&
                                `Desde ${formatPrice(
                                  Number(rate.minOrderAmount)
                                )}`}
                              {rate.minOrderAmount && rate.maxOrderAmount && " - "}
                              {rate.maxOrderAmount &&
                                `Hasta ${formatPrice(
                                  Number(rate.maxOrderAmount)
                                )}`}
                            </p>
                          </div>
                        )}

                        {/* Ventana horaria */}
                        {rate.timeWindow && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">
                              Horario: <span className="text-foreground font-medium">{rate.timeWindow}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/admin/envios/tarifas/${rate.id}/editar`}
                          >
                            Editar
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add Rate Button */}
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/admin/envios/grupos/${groupId}/tarifas/nueva`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Nueva Tarifa
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}