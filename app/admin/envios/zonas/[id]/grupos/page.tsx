import { getRateGroupsByZone, getShippingZoneById } from "@/actions/shipping-system";
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
import { Plus, Package, ArrowLeft, Layers } from "lucide-react";

export default async function RateGroupsPage({
  params,
}: {
  params: Promise<{ id: string }>; // ← Ahora es Promise
}) {
  const { id } = await params; // ← Unwrap la Promise primero
  const { data: zone } = await getShippingZoneById(id);
  const { data: groups } = await getRateGroupsByZone(id);

  if (!zone) {
    return <div>Zona no encontrada</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/envios/zonas" className="hover:text-foreground">
          Zonas
        </Link>
        <span>/</span>
        <span>{zone.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/envios/zonas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{zone.name}</h1>
          <p className="text-muted-foreground">Grupos de tarifas de envío</p>
        </div>
        <Button asChild>
          <Link href={`/admin/envios/zonas/${id}/grupos/nuevo`}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Grupo
          </Link>
        </Button>
      </div>

      {/* Zone Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Zona</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Descripción</p>
              <p className="font-medium">
                {zone.description || "Sin descripción"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant={zone.active ? "default" : "secondary"}>
                {zone.active ? "Activa" : "Inactiva"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groups List */}
      <Card>
        <CardHeader>
          <CardTitle>Grupos de Tarifas</CardTitle>
          <CardDescription>
            Organiza tus tarifas en grupos lógicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No hay grupos configurados
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primer grupo de tarifas para esta zona
              </p>
              <Button asChild>
                <Link href={`/admin/envios/zonas/${id}/grupos/nuevo`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Grupo
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {group.name}
                        </CardTitle>
                        {group.description && (
                          <CardDescription>{group.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant={group.active ? "default" : "secondary"}>
                        {group.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Layers className="h-4 w-4" />
                        <span>{group.rateCount} tarifas</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/admin/envios/grupos/${group.id}/tarifas`}
                          >
                            Ver Tarifas
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/admin/envios/grupos/${group.id}/editar`}
                          >
                            Editar
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add Group Button */}
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/admin/envios/zonas/${id}/grupos/nuevo`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Grupo de Tarifas
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}