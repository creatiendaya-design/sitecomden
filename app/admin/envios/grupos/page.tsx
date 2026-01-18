import { getRateGroupsByZone, getShippingZoneById } from "@/actions/shipping-system";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

export default async function RateGroupsPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: zone } = await getShippingZoneById(params.id);
  const { data: groups } = await getRateGroupsByZone(params.id);

  if (!zone) return <div>Zona no encontrada</div>;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/envios/zonas">Zonas</Link>
        <span>/</span>
        <span>{zone.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{zone.name}</h1>
          <p className="text-muted-foreground">Grupos de Tarifas</p>
        </div>
        <Button asChild>
          <Link href={`/admin/envios/zonas/${params.id}/grupos/nuevo`}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Grupo
          </Link>
        </Button>
      </div>

      {/* Groups List */}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">{group.name}</h3>
              <Badge>{group.rateCount} tarifas</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {group.description}
            </p>
            <Button size="sm" asChild>
              <Link href={`/admin/envios/grupos/${group.id}/tarifas`}>
                Ver Tarifas
              </Link>
            </Button>
          </div>
        ))}
      </div>

      {/* Add Group Button */}
      <Button variant="outline" className="w-full" asChild>
        <Link href={`/admin/envios/zonas/${params.id}/grupos/nuevo`}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Grupo de Tarifas
        </Link>
      </Button>
    </div>
  );
}