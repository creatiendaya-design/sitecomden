import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Gift,
  Users,
  ShoppingBag,
  TrendingUp,
  Star,
  Clock,
  Share2,
  Sparkles,
  Award,
  ChevronRight,
} from "lucide-react";
import {
  getCustomerByEmail,
  getCustomerStats,
  getLoyaltySettings,
} from "@/actions/loyalty";

export const metadata = {
  title: "Mi Cuenta - ShopGood Perú",
};

export default async function CuentaPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/iniciar-sesion");
  }

  // Obtener usuario de Clerk
  const user = await currentUser();
  
  if (!user || !user.primaryEmailAddress?.emailAddress) {
    redirect("/iniciar-sesion");
  }

  const userEmail = user.primaryEmailAddress.emailAddress;
  const customer = await getCustomerByEmail(userEmail);

  if (!customer) {
    // Si no existe el customer, crear uno nuevo
    // Por ahora redirigir a una página de setup
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">¡Bienvenido a ShopGood!</h1>
        <p className="text-muted-foreground mb-6">
          Completa tu primera compra para empezar a acumular puntos y beneficios VIP
        </p>
        <Link href="/productos">
          <Button size="lg">Explorar productos</Button>
        </Link>
      </div>
    );
  }

  const stats = await getCustomerStats(customer.id);
  const settings = await getLoyaltySettings();

  if (!stats || !settings) {
    return <div>Error cargando datos</div>;
  }

  // Calcular porcentaje para próximo nivel
  let progressPercentage = 0;
  if (stats.stats.nextTier) {
    const currentThreshold = getTierThreshold(customer.loyaltyTier, settings);
    const nextThreshold = getTierThreshold(stats.stats.nextTier as any, settings);
    const progress = customer.points - currentThreshold;
    const total = nextThreshold - currentThreshold;
    progressPercentage = Math.min((progress / total) * 100, 100);
  } else {
    progressPercentage = 100; // Ya está en el nivel máximo
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          ¡Hola, {customer.name}! 👋
        </h1>
        <p className="text-muted-foreground">
          Bienvenido a tu cuenta de ShopGood Perú
        </p>
      </div>

      {/* Nivel VIP Card */}
      <Card className="border-2 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Trophy className={getTierColor(customer.loyaltyTier)} size={28} />
                Nivel {getTierName(customer.loyaltyTier)}
              </CardTitle>
              <CardDescription className="mt-1">
                {getTierBenefits(customer.loyaltyTier, settings)}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Sparkles className="h-4 w-4 mr-1 inline" />
              {customer.points.toLocaleString()} pts
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {stats.stats.nextTier ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso a {getTierName(stats.stats.nextTier as any)}</span>
                <span className="font-semibold">
                  {stats.stats.pointsToNextTier} puntos más
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                ¡Gana {stats.stats.pointsToNextTier} puntos más para subir de nivel!
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-purple-600">
              <Award size={20} />
              <span className="font-semibold">¡Has alcanzado el nivel máximo!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Total Puntos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.points.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ S/. {(customer.points * 0.1).toFixed(2)} en descuentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-500" />
              Órdenes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              S/. {stats.stats.totalSpent.toFixed(2)} gastado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              Referidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.referralCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{customer.referralCount * (settings?.referralBonus || 200)} pts ganados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Por Expirar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.expiringPoints}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En los próximos 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/cuenta/recompensas">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Gift className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Canjear Puntos</h3>
                  <p className="text-sm text-muted-foreground">
                    Por descuentos y beneficios
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/cuenta/referidos">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Share2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Referir Amigos</h3>
                  <p className="text-sm text-muted-foreground">
                    Gana {settings?.referralBonus || 200} puntos por referido
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/cuenta/ordenes">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Mis Pedidos</h3>
                  <p className="text-sm text-muted-foreground">
                    Ver historial de compras
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Actividad Reciente */}
      {stats.recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimos movimientos de puntos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentTransactions.slice(0, 5).map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <TransactionIcon type={transaction.type} />
                    <div>
                      <p className="font-medium text-sm">
                        {getTransactionLabel(transaction.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString("es-PE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        transaction.points > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.points > 0 ? "+" : ""}
                      {transaction.points}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beneficios de Nivel */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="text-amber-500" />
            Beneficios de tu Nivel {getTierName(customer.loyaltyTier)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {getTierBenefitsList(customer.loyaltyTier, settings).map(
              (benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500 font-bold">✓</span>
                  <span>{benefit}</span>
                </li>
              )
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function getTierName(tier: string): string {
  const names: Record<string, string> = {
    BRONZE: "Bronce",
    SILVER: "Plata",
    GOLD: "Oro",
    PLATINUM: "Platino",
  };
  return names[tier] || tier;
}

function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    BRONZE: "text-orange-600",
    SILVER: "text-gray-400",
    GOLD: "text-yellow-500",
    PLATINUM: "text-purple-600",
  };
  return colors[tier] || "text-gray-600";
}

function getTierBenefits(tier: string, settings: any): string {
  const benefits: Record<string, string> = {
    BRONZE: "Empieza a acumular puntos",
    SILVER: `${settings?.silverDiscount || 5}% de descuento en todas tus compras`,
    GOLD: `${settings?.goldDiscount || 10}% de descuento en todas tus compras`,
    PLATINUM: `${settings?.platinumDiscount || 15}% de descuento + envío gratis`,
  };
  return benefits[tier] || "";
}

function getTierBenefitsList(tier: string, settings: any): string[] {
  const allBenefits: Record<string, string[]> = {
    BRONZE: [
      "1 punto por cada S/. 1 gastado",
      "Acceso a recompensas básicas",
      "Sistema de referidos",
    ],
    SILVER: [
      `${settings?.silverDiscount || 5}% de descuento en todas tus compras`,
      "1 punto por cada S/. 1 gastado",
      "Acceso prioritario a nuevos productos",
      "Recompensas exclusivas",
    ],
    GOLD: [
      `${settings?.goldDiscount || 10}% de descuento en todas tus compras`,
      "1.5 puntos por cada S/. 1 gastado",
      "Ofertas exclusivas semanales",
      "Soporte prioritario",
    ],
    PLATINUM: [
      `${settings?.platinumDiscount || 15}% de descuento en todas tus compras`,
      "Envío gratis en todos los pedidos",
      "2 puntos por cada S/. 1 gastado",
      "Acceso anticipado a lanzamientos",
      "Asesoría personalizada",
    ],
  };
  return allBenefits[tier] || [];
}

function getTierThreshold(tier: string, settings: any): number {
  const thresholds: Record<string, number> = {
    BRONZE: 0,
    SILVER: settings?.silverThreshold || 500,
    GOLD: settings?.goldThreshold || 2000,
    PLATINUM: settings?.platinumThreshold || 5000,
  };
  return thresholds[tier] || 0;
}

function TransactionIcon({ type }: { type: string }) {
  const icons = {
    PURCHASE: <ShoppingBag className="h-5 w-5 text-blue-500" />,
    REFERRAL_BONUS: <Users className="h-5 w-5 text-green-500" />,
    WELCOME_BONUS: <Gift className="h-5 w-5 text-purple-500" />,
    BIRTHDAY_BONUS: <Star className="h-5 w-5 text-yellow-500" />,
    REWARD_REDEMPTION: <Gift className="h-5 w-5 text-red-500" />,
    ADMIN_ADJUSTMENT: <TrendingUp className="h-5 w-5 text-gray-500" />,
    EXPIRED: <Clock className="h-5 w-5 text-orange-500" />,
  } as const;
  return icons[type as keyof typeof icons] || <Star className="h-5 w-5 text-gray-500" />;
}

function getTransactionLabel(type: string): string {
  const labels: Record<string, string> = {
    PURCHASE: "Compra realizada",
    REFERRAL_BONUS: "Bono por referido",
    WELCOME_BONUS: "Bono de bienvenida",
    BIRTHDAY_BONUS: "Bono de cumpleaños",
    REWARD_REDEMPTION: "Canje de recompensa",
    ADMIN_ADJUSTMENT: "Ajuste manual",
    EXPIRED: "Puntos expirados",
  };
  return labels[type] || type;
}
