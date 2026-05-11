export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getShippingZoneById } from "@/actions/shipping-system";
import { getZoneDistrictsWithDetails } from "@/actions/shipping-edit";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  ChevronRight,
  Layers,
  MapPin,
  Pencil,
  Plus,
  DollarSign,
  Clock,
  Truck,
} from "lucide-react";
import { ZoneDistrictsManager } from "@/components/admin/envios/ZoneDistrictsManager";
import { QuickRateDialog } from "@/components/admin/envios/QuickRateDialog";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ZoneDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;

  const [{ data: zone }, districtsRes] = await Promise.all([
    getShippingZoneById(id),
    getZoneDistrictsWithDetails(id),
  ]);

  if (!zone) notFound();

  const districts = districtsRes.success ? districtsRes.data : [];
  const rates = zone.rates;
  const activeTab = ["distritos", "tarifas"].includes(tab || "") ? tab! : "tarifas";

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
        <Link href="/admin/envios" className="hover:text-foreground transition-colors">
          Envíos
        </Link>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <Link href="/admin/envios/zonas" className="hover:text-foreground transition-colors">
          Zonas
        </Link>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="text-foreground font-medium truncate">{zone.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
            <Link href="/admin/envios/zonas" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-bold truncate">{zone.name}</h1>
              <Badge variant={zone.active ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                {zone.active ? "Activa" : "Inactiva"}
              </Badge>
            </div>
            {zone.description && (
              <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{zone.description}</p>
            )}
          </div>
        </div>
        <Button variant="outline" asChild className="shrink-0" size="sm">
          <Link href={`/admin/envios/zonas/${id}/editar`}>
            <Pencil className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Editar zona</span>
            <span className="sm:hidden ml-1">Editar</span>
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2">
        <SummaryCard
          icon={<MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />}
          title="Distritos"
          value={districts.length}
        />
        <SummaryCard
          icon={<Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />}
          title="Tarifas"
          value={rates.length}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex">
          <TabsTrigger value="tarifas" className="text-xs sm:text-sm">
            <Layers className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Tarifas ({rates.length})
          </TabsTrigger>
          <TabsTrigger value="distritos" className="text-xs sm:text-sm">
            <MapPin className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Distritos ({districts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tarifas" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg">Tarifas de envío</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Costos disponibles para los distritos de esta zona
                  </CardDescription>
                </div>
                <QuickRateDialog
                  zoneId={id}
                  trigger={
                    <Button size="sm" className="w-full sm:w-auto">
                      <Plus className="mr-1.5 sm:mr-2 h-4 w-4" />
                      Nueva tarifa
                    </Button>
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6">
              {rates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center px-4">
                  <Layers className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mb-2 sm:mb-3" />
                  <p className="font-medium mb-1 text-sm sm:text-base">Aún no hay tarifas</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
                    Define el costo de envío para esta zona. Solo necesitas un nombre y
                    el costo en soles.
                  </p>
                  <QuickRateDialog
                    zoneId={id}
                    trigger={
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear primera tarifa
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {rates.map((rate) => (
                    <div
                      key={rate.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border p-2.5 sm:p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-medium text-sm sm:text-base truncate">{rate.name}</span>
                          {rate.category && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                              {rate.category}
                            </Badge>
                          )}
                          {!rate.active && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              Inactiva
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-foreground tabular-nums">
                            <DollarSign className="h-3 w-3" />
                            {formatPrice(Number(rate.baseCost))}
                          </span>
                          {rate.estimatedDays && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rate.estimatedDays}
                            </span>
                          )}
                          {rate.carrier && (
                            <span className="flex items-center gap-1 truncate">
                              <Truck className="h-3 w-3 shrink-0" />
                              <span className="truncate">{rate.carrier}</span>
                            </span>
                          )}
                          {rate.freeShippingMin && (
                            <span className="text-green-700 dark:text-green-400">
                              Gratis desde {formatPrice(Number(rate.freeShippingMin))}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="shrink-0 h-8 self-end sm:self-auto">
                        <Link href={`/admin/envios/tarifas/${rate.id}/editar`}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Editar
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distritos" className="mt-4 sm:mt-6">
          <ZoneDistrictsManager
            zoneId={id}
            zoneName={zone.name}
            initialDistricts={districts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="px-3 py-2.5 sm:px-6 sm:py-4 pb-1 sm:pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs sm:text-sm">{title}</CardDescription>
          {icon}
        </div>
        <CardTitle className="text-xl sm:text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
