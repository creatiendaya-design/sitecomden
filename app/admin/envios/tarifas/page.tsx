export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  getAllShippingRates,
  getShippingZones,
} from "@/actions/shipping-system";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { GlobalRatesTable } from "@/components/admin/envios/GlobalRatesTable";

export default async function GlobalRatesPage() {
  const [{ data: rates }, { data: zones }] = await Promise.all([
    getAllShippingRates(),
    getShippingZones(),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
        <Link href="/admin/envios" className="hover:text-foreground transition-colors">
          Envíos
        </Link>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="text-foreground font-medium">Tarifas</span>
      </div>

      <div className="flex items-start gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
          <Link href="/admin/envios" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-bold">Tarifas globales</h1>
          <p className="text-xs sm:text-base text-muted-foreground">
            Filtra y compara todas las tarifas en una sola vista
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Listado de tarifas</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {zones.length} zonas · {rates.length} tarifas en total
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6">
          <GlobalRatesTable rates={rates} />
        </CardContent>
      </Card>
    </div>
  );
}
