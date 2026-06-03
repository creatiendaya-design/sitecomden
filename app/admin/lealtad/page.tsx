export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Gift,
  TrendingUp,
  Star,
  Settings,
} from "lucide-react";
import { getLoyaltyProgramStats, getLoyaltySettings } from "@/actions/loyalty";
import { protectRoute } from "@/lib/protect-route"; // ← AGREGAR

export default async function AdminLealtadPage() {
  // ✅ PROTEGER la página ANTES de cargar datos
  await protectRoute("loyalty:view");

  const stats = await getLoyaltyProgramStats();
  const settings = await getLoyaltySettings();

  if (!stats || !settings) {
    return <div>Error cargando estadísticas</div>;
  }

  // Calcular distribución de tiers
  const tierDistribution = stats.tierCounts.reduce((acc: Record<string, number>, item) => {
    acc[item.loyaltyTier] = item._count;
    return acc;
  }, {});

  const totalCustomers = stats.totalCustomers;
  const activePoints = stats.totalPointsGiven - stats.totalPointsSpent;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Programa de Lealtad</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona el sistema de puntos, referidos y recompensas
          </p>
        </div>
        <Button asChild variant="outline" size="icon" className="h-9 w-9 sm:hidden shrink-0">
          <Link href="/admin/lealtad/configuracion" aria-label="Configuración">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/admin/lealtad/configuracion">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </Link>
        </Button>
      </div>

      {/* Estado del Programa */}
      <Card className="border-2 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="p-3 sm:p-6 sm:pt-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">
                Estado del Programa
              </p>
              <p className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 sm:gap-2">
                {settings.enabled ? (
                  <>
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse shrink-0" />
                    Activo
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full shrink-0" />
                    Desactivado
                  </>
                )}
              </p>
            </div>
            <div className="text-right min-w-0">
              <p className="text-[11px] sm:text-sm text-muted-foreground">
                Conversión
              </p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums">
                {settings.pointsPerSol} <span className="text-xs sm:text-base font-normal text-muted-foreground">pt/sol</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principales - 2 cols mobile */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:pb-2 sm:p-6">
            <CardTitle className="text-[11px] sm:text-sm font-medium truncate">
              Total Clientes
            </CardTitle>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold tabular-nums">
              {totalCustomers}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              Registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:pb-2 sm:p-6">
            <CardTitle className="text-[11px] sm:text-sm font-medium truncate">
              Puntos Activos
            </CardTitle>
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold tabular-nums">
              {activePoints.toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              ≈ S/. {(activePoints * Number(settings.solsPerPoint)).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:pb-2 sm:p-6">
            <CardTitle className="text-[11px] sm:text-sm font-medium truncate">
              Otorgados
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold tabular-nums">
              {stats.totalPointsGiven.toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              Total histórico
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:pb-2 sm:p-6">
            <CardTitle className="text-[11px] sm:text-sm font-medium truncate">
              Canjeados
            </CardTitle>
            <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold tabular-nums">
              {stats.totalPointsSpent.toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              {stats.totalRedemptions} canjes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribución de Niveles - 2 cols mobile */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">
            Distribución por Niveles VIP
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Cantidad de clientes en cada nivel de lealtad
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="grid gap-2 sm:gap-4 grid-cols-2 md:grid-cols-4">
            <TierCard
              tier="BRONZE"
              count={tierDistribution.BRONZE || 0}
              total={totalCustomers}
              threshold={0}
              color="orange"
            />
            <TierCard
              tier="SILVER"
              count={tierDistribution.SILVER || 0}
              total={totalCustomers}
              threshold={settings.silverThreshold}
              color="gray"
            />
            <TierCard
              tier="GOLD"
              count={tierDistribution.GOLD || 0}
              total={totalCustomers}
              threshold={settings.goldThreshold}
              color="yellow"
            />
            <TierCard
              tier="PLATINUM"
              count={tierDistribution.PLATINUM || 0}
              total={totalCustomers}
              threshold={settings.platinumThreshold}
              color="purple"
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Referrers */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Top Referidores</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Clientes con más referidos
              </CardDescription>
            </div>
            <Button variant="outline" asChild size="sm" className="shrink-0">
              <Link href="/admin/clientes">Ver todos</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          {stats.topReferrers.length > 0 ? (
            <div className="divide-y">
              {stats.topReferrers.slice(0, 5).map((referrer, index) => (
                <div
                  key={referrer.id}
                  className="flex items-center justify-between gap-2 py-2.5 sm:py-3"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <span className="font-bold text-primary text-xs sm:text-base">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {referrer.name}
                      </p>
                      <p className="text-[11px] sm:text-sm text-muted-foreground truncate">
                        {referrer.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      {referrer.referralCount} ref
                    </Badge>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {referrer.points} pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              No hay referidos aún
            </p>
          )}
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <div className="grid gap-2 sm:gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <Link href="/admin/clientes" className="block">
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg shrink-0">
                  <Users className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-lg">
                    Gestionar Clientes
                  </CardTitle>
                  <CardDescription className="text-[11px] sm:text-sm">
                    Ver y editar clientes
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <Link href="/admin/lealtad/recompensas" className="block">
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg shrink-0">
                  <Gift className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-lg">Recompensas</CardTitle>
                  <CardDescription className="text-[11px] sm:text-sm">
                    Crear y gestionar
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <Link href="/admin/lealtad/configuracion" className="block">
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg shrink-0">
                  <Settings className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-lg">Configuración</CardTitle>
                  <CardDescription className="text-[11px] sm:text-sm">
                    Parámetros del programa
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  );
}

// Componente para cada tier
function TierCard({
  tier,
  count,
  total,
  threshold,
  color,
}: {
  tier: string;
  count: number;
  total: number;
  threshold: number;
  color: string;
}) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

  const colorClasses: Record<string, string> = {
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
  };

  const tierNames: Record<string, string> = {
    BRONZE: "Bronce",
    SILVER: "Plata",
    GOLD: "Oro",
    PLATINUM: "Platino",
  };

  return (
    <Card className={`border-2 ${colorClasses[color]}`}>
      <CardHeader className="pb-1 sm:pb-3 p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
          <Badge variant="secondary" className="text-[10px] sm:text-xs h-5 px-1.5 tabular-nums">
            {percentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <p className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1 tabular-nums">
          {count}
        </p>
        <p className="text-xs sm:text-sm font-medium mb-0.5 sm:mb-2">
          {tierNames[tier]}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
          {threshold > 0 ? `${threshold}+ pts` : "0+ pts"}
        </p>
      </CardContent>
    </Card>
  );
}