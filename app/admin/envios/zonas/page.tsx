import { getShippingZones, getShippingStats } from "@/actions/shipping-system";
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
import { Plus, MapPin, Package, Layers, Pencil } from "lucide-react";
import { DeleteZoneButton } from "@/components/admin/DeleteZoneButton";

export default async function ShippingZonesPage() {
  const { data: zones } = await getShippingZones();
  const { data: stats } = await getShippingStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zonas de Envío</h1>
          <p className="text-muted-foreground">
            Gestiona las zonas geográficas y sus tarifas
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/envios/zonas/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Zona
          </Link>
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Zonas Totales</CardDescription>
              <CardTitle className="text-3xl">{stats.totalZones}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Zonas Activas</CardDescription>
              <CardTitle className="text-3xl">{stats.activeZones}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Grupos de Tarifas</CardDescription>
              <CardTitle className="text-3xl">{stats.totalGroups}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Tarifas Totales</CardDescription>
              <CardTitle className="text-3xl">{stats.totalRates}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Zones List */}
      <Card>
        <CardHeader>
          <CardTitle>Zonas Configuradas</CardTitle>
          <CardDescription>
            Lista de zonas con sus grupos y tarifas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No hay zonas configuradas
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera zona de envío para comenzar
              </p>
              <Button asChild>
                <Link href="/admin/envios/zonas/nueva">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Zona
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {zones.map((zone) => (
                <Card key={zone.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-1 truncate">
                          {zone.name}
                        </CardTitle>
                        {zone.description && (
                          <CardDescription className="text-sm line-clamp-2">
                            {zone.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant={zone.active ? "default" : "secondary"}
                          className="shrink-0"
                        >
                          {zone.active ? "Activa" : "Inactiva"}
                        </Badge>
                        
                        {/* Botón Editar */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          asChild
                        >
                          <Link href={`/admin/envios/zonas/${zone.id}/editar`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        {/* Botón Eliminar */}
                        <DeleteZoneButton
                          zone={{
                            id: zone.id,
                            name: zone.name,
                            districtCount: zone.districtCount,
                            groupCount: zone.groupCount,
                            rateCount: zone.rateCount,
                          }}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {zone.districtCount} dist.
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {zone.groupCount} grupos
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {zone.rateCount} tarifas
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <Link href={`/admin/envios/zonas/${zone.id}/grupos`}>
                          <Package className="h-4 w-4 mr-1" />
                          Ver Grupos
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <Link href={`/admin/envios/zonas/${zone.id}/distritos`}>
                          <MapPin className="h-4 w-4 mr-1" />
                          Distritos
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add New Zone Button (Bottom) */}
          {zones.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <Button variant="outline" asChild className="w-full">
                <Link href="/admin/envios/zonas/nueva">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Nueva Zona
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}