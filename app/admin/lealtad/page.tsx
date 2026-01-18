import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Gift,
  TrendingUp,
  DollarSign,
  Target,
  Star,
  Settings,
} from "lucide-react";
import { getLoyaltyProgramStats, getLoyaltySettings } from "@/actions/loyalty";

export default async function AdminLealtadPage() {
  const stats = await getLoyaltyProgramStats();
  const settings = await getLoyaltySettings();

  if (!stats || !settings) {
    return <div>Error cargando estadísticas</div>;
  }

  // Calcular distribución de tiers
  const tierDistribution = stats.tierCounts.reduce((acc: any, item: any) => {
    acc[item.loyaltyTier] = item._count;
    return acc;
  }, {});

  const totalCustomers = stats.totalCustomers;
  const activePoints = stats.totalPointsGiven - stats.totalPointsSpent;
  const redemptionRate =
    totalCustomers > 0 ? (stats.totalRedemptions / totalCustomers) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Programa de Lealtad</h1>
          <p className="text-muted-foreground">
            Gestiona el sistema de puntos, referidos y recompensas
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/lealtad/configuracion">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </Link>
        </Button>
      </div>

      {/* Estado del Programa */}
      <Card className="mb-8 border-2 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Estado del Programa
              </p>
              <p className="text-2xl font-bold flex items-center gap-2">
                {settings.enabled ? (
                  <>
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    Activo
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 bg-red-500 rounded-full" />
                    Desactivado
                  </>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Tasa de conversión</p>
              <p className="text-2xl font-bold">{settings.pointsPerSol} pt/sol</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registrados en el programa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Activos</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activePoints.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ S/. {(activePoints * Number(settings.solsPerPoint)).toFixed(2)} en
              pasivo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Puntos Otorgados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalPointsGiven.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total histórico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Puntos Canjeados
            </CardTitle>
            <Gift className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalPointsSpent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalRedemptions} canjes totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribución de Niveles */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Distribución por Niveles VIP</CardTitle>
          <CardDescription>
            Cantidad de clientes en cada nivel de lealtad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
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
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Referidores</CardTitle>
              <CardDescription>
                Clientes con más referidos exitosos
              </CardDescription>
            </div>
            <Button variant="outline" asChild size="sm">
              <Link href="/admin/lealtad/clientes">Ver todos</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats.topReferrers.length > 0 ? (
            <div className="space-y-4">
              {stats.topReferrers.slice(0, 5).map((referrer, index) => (
                <div
                  key={referrer.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="font-bold text-primary">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{referrer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {referrer.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      {referrer.referralCount} referidos
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {referrer.points} puntos totales
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay referidos aún
            </p>
          )}
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/admin/lealtad/clientes">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Gestionar Clientes</CardTitle>
                  <CardDescription>
                    Ver y editar clientes del programa
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/admin/lealtad/recompensas">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Gift className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recompensas</CardTitle>
                  <CardDescription>
                    Crear y gestionar recompensas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/admin/lealtad/configuracion">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Settings className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Configuración</CardTitle>
                  <CardDescription>
                    Ajustar parámetros del programa
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Trophy className="h-5 w-5" />
          <Badge variant="secondary">{percentage}%</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold mb-1">{count}</p>
        <p className="text-sm font-medium mb-2">{tierNames[tier]}</p>
        <p className="text-xs text-muted-foreground">
          {threshold > 0 ? `${threshold}+ puntos` : "0+ puntos"}
        </p>
      </CardContent>
    </Card>
  );
}