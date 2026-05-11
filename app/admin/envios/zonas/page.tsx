export const dynamic = "force-dynamic";

import Link from "next/link";
import { getShippingZones } from "@/actions/shipping-system";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft, Plus } from "lucide-react";
import { ZonesGrid } from "@/components/admin/envios/ZonesGrid";

export default async function ShippingZonesPage() {
  const { data: zones } = await getShippingZones();

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
        <Link href="/admin/envios" className="hover:text-foreground transition-colors">
          Envíos
        </Link>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="text-foreground font-medium">Zonas</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
            <Link href="/admin/envios" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Zonas de envío</h1>
            <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">
              Gestiona las zonas geográficas de cobertura
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0" size="sm">
          <Link href="/admin/envios/zonas/nueva">
            <Plus className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nueva zona</span>
            <span className="sm:hidden ml-1">Nueva</span>
          </Link>
        </Button>
      </div>

      <ZonesGrid zones={zones} />
    </div>
  );
}
