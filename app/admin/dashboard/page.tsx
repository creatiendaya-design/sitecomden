export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { formatPrice, formatOrderNumber } from "@/lib/utils";
import { getSiteSettings } from "@/lib/site-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  ChevronRight,
  BarChart3,
  Sparkles,
} from "lucide-react";
import nextDynamic from "next/dynamic";

const SalesChart = nextDynamic(() => import("@/components/admin/SalesChart"), {
  loading: () => (
    <div className="h-[300px] animate-pulse rounded-lg bg-muted" />
  ),
});

const OrdersStatusChart = nextDynamic(
  () => import("@/components/admin/OrdersStatusChart"),
  {
    loading: () => (
      <div className="h-[300px] animate-pulse rounded-lg bg-muted" />
    ),
  }
);

export default async function AdminDashboardPage() {
  const settings = await getSiteSettings();
  const orderPrefix = settings.order_prefix || "PED";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalOrders,
    pendingOrders,
    paidOrders,
    totalRevenue,
    monthRevenue,
    lastMonthRevenue,
    pendingPayments,
    totalCustomers,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: "PENDING" } }),
    prisma.order.count({ where: { paymentStatus: "PAID" } }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        paymentStatus: "PAID",
        createdAt: { gte: startOfMonth },
      },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        paymentStatus: "PAID",
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { total: true },
    }),
    prisma.pendingPayment.count({ where: { status: "pending" } }),
    prisma.customer.count(),
  ]);

  const currentMonthTotal = Number(monthRevenue._sum.total || 0);
  const lastMonthTotal = Number(lastMonthRevenue._sum.total || 0);
  const revenueChange =
    lastMonthTotal > 0
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

  const ordersByStatus = await prisma.order.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  const topProducts = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    _count: { productId: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const topProductsWithDetails = await Promise.all(
    topProducts.map(async (item) => {
      if (!item.productId) {
        return { ...item, product: null };
      }
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true, images: true },
      });
      return { ...item, product };
    })
  );

  const lowStockProducts = await prisma.product.findMany({
    where: {
      OR: [
        { stock: { lte: 10 }, hasVariants: false },
        {
          hasVariants: true,
          variants: {
            some: { stock: { lte: 10 }, active: true },
          },
        },
      ],
      active: true,
    },
    select: {
      id: true,
      name: true,
      stock: true,
      hasVariants: true,
      variants: {
        where: { stock: { lte: 10 }, active: true },
        select: { id: true, options: true, stock: true },
      },
    },
    take: 10,
  });

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const salesByDay = await Promise.all(
    last7Days.map(async (day) => {
      const startOfDay = new Date(day.setHours(0, 0, 0, 0));
      const endOfDay = new Date(day.setHours(23, 59, 59, 999));

      const result = await prisma.order.aggregate({
        where: {
          paymentStatus: "PAID",
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { total: true },
        _count: { id: true },
      });

      return {
        date: startOfDay.toLocaleDateString("es-PE", {
          month: "short",
          day: "numeric",
        }),
        ventas: Number(result._sum.total || 0),
        ordenes: result._count.id,
      };
    })
  );

  const recentOrders = await prisma.order.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const stats = [
    {
      title: "Ventas del Mes",
      value: formatPrice(currentMonthTotal),
      change: revenueChange.toFixed(1),
      icon: DollarSign,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
      trend: revenueChange >= 0 ? ("up" as const) : ("down" as const),
    },
    {
      title: "Ordenes Totales",
      value: totalOrders.toLocaleString(),
      subtitle: `${paidOrders} pagadas`,
      icon: ShoppingCart,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10",
    },
    {
      title: "Ingresos Totales",
      value: formatPrice(Number(totalRevenue._sum.total || 0)),
      icon: TrendingUp,
      iconColor: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-500/10",
    },
    {
      title: "Clientes",
      value: totalCustomers.toLocaleString(),
      subtitle: `${pendingPayments} pagos pendientes`,
      icon: Users,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
    },
  ];

  const greeting = getGreeting();

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Aqui tienes el resumen de tu tienda
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/admin/ordenes">
              <Eye className="mr-1.5 h-4 w-4" />
              Ver Ordenes
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {pendingPayments > 0 && (
        <div className="rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 dark:border-amber-800/40 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-full bg-amber-500/15 p-2.5 shrink-0">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base text-amber-900 dark:text-amber-200">
                  {pendingPayments} pago{pendingPayments !== 1 ? "s" : ""}{" "}
                  pendiente{pendingPayments !== 1 ? "s" : ""} de verificacion
                </p>
                <p className="text-xs sm:text-sm text-amber-700/80 dark:text-amber-400/70">
                  Pagos Yape/Plin esperando revision manual
                </p>
              </div>
            </div>
            <Button size="sm" asChild className="w-full sm:w-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white">
              <Link href="/admin/pagos-pendientes">
                Verificar Pagos
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1">
                      {stat.title}
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums">
                      {stat.value}
                    </p>
                    {stat.change && (
                      <div className="flex items-center gap-1 text-xs sm:text-sm">
                        {stat.trend === "up" ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        )}
                        <span
                          className={`font-medium tabular-nums ${
                            stat.trend === "up"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-500"
                          }`}
                        >
                          {stat.change}%
                        </span>
                        <span className="text-muted-foreground hidden sm:inline">
                          vs mes anterior
                        </span>
                      </div>
                    )}
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {stat.subtitle}
                      </p>
                    )}
                  </div>
                  <div className={`rounded-xl p-2.5 sm:p-3 ${stat.iconBg} shrink-0`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-border/50 shadow-sm">
          <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg font-semibold">
                Ventas
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Ultimos 7 dias
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
            <SalesChart data={salesByDay} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/50 shadow-sm">
          <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg font-semibold">
                Ordenes por Estado
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Distribucion actual
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <Package className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
            <OrdersStatusChart data={ordersByStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Products and Stock Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Top Products */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg font-semibold">
                Mas Vendidos
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Top 5 productos
              </p>
            </div>
            <div className="rounded-lg bg-violet-500/10 p-2">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {topProductsWithDetails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No hay ventas todavia
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {topProductsWithDetails.map((item, index) => (
                  <div
                    key={item.productId || `deleted-${index}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold tabular-nums">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.product?.name || "Producto eliminado"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="tabular-nums font-medium">
                      {item._sum.quantity} uds
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg font-semibold">
                Stock Bajo
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Productos con 10 unidades o menos
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-emerald-500/10 p-3 mb-3">
                  <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Todos los productos tienen stock suficiente
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {lowStockProducts.map((product) => {
                  const minStock = product.hasVariants
                    ? Math.min(...product.variants.map((v) => v.stock))
                    : product.stock;
                  const critical = minStock <= 5;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/admin/productos/${product.id}`}
                          className="font-medium text-sm hover:underline truncate block"
                        >
                          {product.name}
                        </Link>
                        {product.hasVariants && product.variants.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {product.variants.length} variante(s) con stock bajo
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={critical ? "destructive" : "secondary"}
                        className={`tabular-nums font-medium ${
                          !critical ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40" : ""
                        }`}
                      >
                        {product.hasVariants ? `Min ${minStock}` : minStock}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg font-semibold">
              Ordenes Recientes
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Ultimas {recentOrders.length} ordenes
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/ordenes">
              Ver Todas
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="rounded-full bg-muted p-3 mb-3">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No hay ordenes todavia
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentOrders.map((order) => {
                const orderLabel = order.orderSeq
                  ? formatOrderNumber(order.orderSeq, orderPrefix)
                  : `#${order.orderNumber.slice(-8).toUpperCase()}`;
                const payConfig = getPaymentConfig(order.paymentStatus);
                return (
                  <Link
                    key={order.id}
                    href={`/admin/ordenes/${order.id}`}
                    className="flex items-center justify-between gap-3 py-3.5 sm:py-4 px-4 sm:px-6 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                        {order.customerName
                          ? order.customerName.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{orderLabel}</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] sm:text-xs px-1.5 py-0 ${payConfig.className}`}
                          >
                            {payConfig.label}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {order.customerName} · {order.items.length}{" "}
                          {order.items.length === 1 ? "item" : "items"} ·{" "}
                          {new Date(order.createdAt).toLocaleDateString("es-PE", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatPrice(Number(order.total))}
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos dias";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getPaymentConfig(status: string): { label: string; className: string } {
  switch (status) {
    case "PAID":
      return {
        label: "Pagado",
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40",
      };
    case "PENDING":
      return {
        label: "Pendiente",
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40",
      };
    default:
      return {
        label: "Fallido",
        className:
          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200/60 dark:border-red-800/40",
      };
  }
}
