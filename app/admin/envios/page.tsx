export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  getShippingStats,
  getShippingZones,
  getAllShippingRates,
} from "@/actions/shipping-system";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  MapPin,
  Layers,
  Plus,
  ArrowRight,
  AlertTriangle,
  Globe,
  ListChecks,
} from "lucide-react";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

export default async function ShippingDashboardPage() {
  const [{ data: stats }, { data: zones }, { data: rates }] = await Promise.all([
    getShippingStats(),
    getShippingZones(),
    getAllShippingRates(),
  ]);

  const activeRates = rates.filter((r) => r.active && r.zoneActive);
  const minActiveRate = activeRates.length
    ? activeRates.reduce((m, r) => (r.baseCost < m.baseCost ? r : m))
    : null;
  const zonesWithoutDistricts = zones.filter((z) => z.districtCount === 0).length;
  const zonesWithoutRates = zones.filter((z) => z.rateCount === 0).length;

  const isEmpty = !stats || stats.totalZones === 0;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 sm:h-8 sm:w-8" />
            Envíos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configura zonas, tarifas y precios de envío
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="flex-1 sm:flex-initial">
            <Link href="/admin/envios/zonas">
              <Globe className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Ver zonas</span>
              <span className="sm:hidden ml-2">Zonas</span>
            </Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-initial">
            <Link href="/admin/envios/zonas/nueva">
              <Plus className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nueva zona</span>
              <span className="sm:hidden ml-2">Nueva</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Empty state — onboarding */}
      {isEmpty && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-base sm:text-lg">¿Cómo funcionan los envíos?</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Sigue estos 3 pasos para configurar tu primera zona de cobertura
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:gap-4 md:grid-cols-3 px-4 pb-4 sm:px-6 sm:pb-6">
            <Step n={1} title="Crear zona" description="Define una zona como 'Lima Metropolitana' o 'Callao'" />
            <Step n={2} title="Asignar distritos" description="Asigna los distritos UBIGEO que cubre esa zona" />
            <Step n={3} title="Crear tarifas" description="Agrega grupos (Standard / Express) y precios de envío" />
            <div className="md:col-span-3 pt-2">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/admin/envios/zonas/nueva">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera zona
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && !isEmpty && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          <StatCard
            title="Zonas activas"
            value={`${stats.activeZones}`}
            sub={`${stats.totalZones} totales`}
            icon={<Globe className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />}
            href="/admin/envios/zonas"
          />
          <StatCard
            title="Distritos"
            value={`${stats.totalDistricts}`}
            sub="UBIGEOs asignados"
            icon={<MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Tarifas"
            value={`${stats.totalRates}`}
            sub={
              minActiveRate
                ? `Desde ${formatPrice(minActiveRate.baseCost)}`
                : "Sin tarifas activas"
            }
            icon={<Layers className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />}
            href="/admin/envios/tarifas"
          />
          <StatCard
            title="Activas"
            value={`${stats.activeRates}`}
            sub="Visibles en checkout"
            icon={<Layers className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />}
            href="/admin/envios/tarifas"
          />
        </div>
      )}

      {/* Warnings */}
      {!isEmpty && (zonesWithoutDistricts > 0 || zonesWithoutRates > 0) && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              Configuración incompleta
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 sm:px-6 sm:pb-4 text-xs sm:text-sm space-y-1">
            {zonesWithoutDistricts > 0 && (
              <p>
                <strong>{zonesWithoutDistricts}</strong>{" "}
                {zonesWithoutDistricts === 1 ? "zona sin" : "zonas sin"} distritos
                — los clientes no podrán seleccionarlas.
              </p>
            )}
            {zonesWithoutRates > 0 && (
              <p>
                <strong>{zonesWithoutRates}</strong>{" "}
                {zonesWithoutRates === 1 ? "zona sin" : "zonas sin"} tarifas
                — el costo caerá a $20 por defecto.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick access */}
      {!isEmpty && (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                Zonas geográficas
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Administra zonas y distritos asignados
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <Button variant="outline" asChild className="w-full">
                <Link href="/admin/envios/zonas">
                  Ver {stats?.totalZones} zonas
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ListChecks className="h-4 w-4 sm:h-5 sm:w-5" />
                Tarifas (vista global)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Compara y filtra todas las tarifas
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <Button variant="outline" asChild className="w-full">
                <Link href="/admin/envios/tarifas">
                  Ver {stats?.totalRates} tarifas
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top zones preview */}
      {!isEmpty && zones.length > 0 && (
        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4 flex flex-row items-center justify-between space-y-0 gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Zonas configuradas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Acceso rápido a las zonas existentes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/envios/zonas">
                <span className="hidden sm:inline">Ver todas</span>
                <ArrowRight className="sm:ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {zones.slice(0, 6).map((zone) => (
                <Link
                  key={zone.id}
                  href={`/admin/envios/zonas/${zone.id}`}
                  className="group rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-medium text-sm sm:text-base truncate group-hover:text-primary">
                      {zone.name}
                    </p>
                    <Badge variant={zone.active ? "default" : "secondary"} className="shrink-0 text-[10px] sm:text-xs">
                      {zone.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    {zone.districtCount} distritos · {zone.rateCount} tarifas
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Step({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
        {n}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm sm:text-base">{title}</p>
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  href,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <Card className={href ? "hover:shadow-md transition-shadow cursor-pointer h-full" : "h-full"}>
      <CardHeader className="px-3 py-2.5 sm:px-6 sm:py-4 pb-1 sm:pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardDescription className="text-xs sm:text-sm truncate">{title}</CardDescription>
          {icon}
        </div>
        <CardTitle className="text-xl sm:text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{sub}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
