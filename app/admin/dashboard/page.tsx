export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { formatPrice, formatOrderNumber } from "@/lib/utils";
import { getSiteSettings } from "@/lib/site-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  ArrowUp,
  ArrowDown,
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

  // Fecha actual y mes anterior
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Estadísticas generales
  const [
    totalOrders,
    pendingOrders,
    paidOrders,
    totalRevenue,
    monthRevenue,
    lastMonthRevenue,
    pendingPayments,
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
  ]);

  // Calcular cambio porcentual
  const currentMonthTotal = Number(monthRevenue._sum.total || 0);
  const lastMonthTotal = Number(lastMonthRevenue._sum.total || 0);
  const revenueChange =
    lastMonthTotal > 0
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

  // Órdenes por estado
  const ordersByStatus = await prisma.order.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  // Productos más vendidos (top 5)
  const topProducts = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    _count: { productId: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  // ✅ CORREGIDO: Manejar productId nullable
  const topProductsWithDetails = await Promise.all(
    topProducts.map(async (item) => {
      // Si productId es null, retornar sin hacer query
      if (!item.productId) {
        return {
          ...item,
          product: null,
        };
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true, images: true },
      });
      
      return {
        ...item,
        product,
      };
    })
  );

  // Productos con stock bajo (menos de 10)
  const lowStockProducts = await prisma.product.findMany({
    where: {
      OR: [
        { stock: { lte: 10 }, hasVariants: false },
        {
          hasVariants: true,
          variants: {
            some: {
              stock: { lte: 10 },
              active: true,
            },
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

  // Ventas de los últimos 7 días
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
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
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

  // Órdenes recientes
  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const stats = [
    {
      title: "Ventas del Mes",
      value: formatPrice(currentMonthTotal),
      change: revenueChange.toFixed(1),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
      trend: revenueChange >= 0 ? "up" : "down",
    },
    {
      title: "Órdenes Totales",
      value: totalOrders.toString(),
      subtitle: `${paidOrders} pagadas`,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Ingresos Totales",
      value: formatPrice(Number(totalRevenue._sum.total || 0)),
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Pagos Pendientes",
      value: pendingPayments.toString(),
      subtitle: "Yape/Plin",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-8 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Resumen de tu tienda en tiempo real
          </p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/admin/ordenes">Ver Todas las Órdenes</Link>
        </Button>
      </div>

      {/* Stats Grid - 2 cols mobile to keep all 4 visible */}
      <div className="grid gap-2 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-sm text-muted-foreground line-clamp-1">
                      {stat.title}
                    </p>
                    <p className="mt-1 sm:mt-2 text-lg sm:text-3xl font-bold tabular-nums">
                      {stat.value}
                    </p>
                    {stat.change && (
                      <div className="mt-0.5 sm:mt-1 flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-sm">
                        {stat.trend === "up" ? (
                          <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                        ) : (
                          <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 shrink-0" />
                        )}
                        <span
                          className={
                            stat.trend === "up"
                              ? "text-green-600 tabular-nums"
                              : "text-red-600 tabular-nums"
                          }
                        >
                          {stat.change}%
                        </span>
                        <span className="text-muted-foreground truncate hidden sm:inline">
                          vs mes anterior
                        </span>
                      </div>
                    )}
                    {stat.subtitle && (
                      <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-muted-foreground truncate">
                        {stat.subtitle}
                      </p>
                    )}
                  </div>
                  <div className={`rounded-full p-1.5 sm:p-3 ${stat.bgColor} shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 sm:h-6 sm:w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-base sm:text-lg">
              Ventas — Últimos 7 días
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
            <SalesChart data={salesByDay} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Órdenes por Estado</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
            <OrdersStatusChart data={ordersByStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Products and Stock Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {topProductsWithDetails.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No hay ventas todavía
              </p>
            ) : (
              <div className="divide-y sm:divide-y-0 sm:space-y-3">
                {topProductsWithDetails.map((item, index) => (
                  <div
                    key={item.productId || `deleted-${index}`}
                    className="flex items-center gap-2.5 sm:gap-3 py-2 sm:py-0"
                  >
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {item.product?.name || "Producto eliminado"}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {item._sum.quantity} vendidos
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
              <span>Stock Bajo</span>
              <span className="text-xs font-normal text-muted-foreground">
                (≤10 uds)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {lowStockProducts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Todos los productos tienen stock suficiente
              </p>
            ) : (
              <div className="divide-y">
                {lowStockProducts.map((product) => {
                  const minStock = product.hasVariants
                    ? Math.min(...product.variants.map((v) => v.stock))
                    : product.stock;
                  const critical = minStock <= 5;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-2 py-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/admin/productos/${product.id}`}
                          className="font-medium text-sm hover:underline truncate block"
                        >
                          {product.name}
                        </Link>
                        {product.hasVariants && product.variants.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {product.variants.length} variante(s)
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                          critical
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {product.hasVariants ? `Min ${minStock}` : minStock}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Órdenes Recientes</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/ordenes">Ver Todas</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {recentOrders.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No hay órdenes todavía
            </p>
          ) : (
            <div className="divide-y">
              {recentOrders.map((order) => {
                const orderLabel = order.orderSeq
                  ? formatOrderNumber(order.orderSeq, orderPrefix)
                  : `#${order.orderNumber.slice(-8).toUpperCase()}`;
                const payStyle =
                  order.paymentStatus === "PAID"
                    ? "bg-green-100 text-green-700"
                    : order.paymentStatus === "PENDING"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700";
                const payLabel =
                  order.paymentStatus === "PAID"
                    ? "Pagado"
                    : order.paymentStatus === "PENDING"
                    ? "Pendiente"
                    : "Fallido";
                return (
                  <Link
                    key={order.id}
                    href={`/admin/ordenes/${order.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 sm:py-3 hover:bg-muted/30 -mx-3 sm:-mx-6 px-3 sm:px-6"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{orderLabel}</span>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${payStyle}`}
                        >
                          {payLabel}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {order.customerName} · {order.items.length}{" "}
                        {order.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums whitespace-nowrap shrink-0">
                      {formatPrice(Number(order.total))}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Payments Alert */}
      {pendingPayments > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="rounded-full bg-amber-100 p-2 sm:p-3 shrink-0">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm sm:text-base">
                    {pendingPayments} pago{pendingPayments !== 1 ? "s" : ""}{" "}
                    pendiente{pendingPayments !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Pagos Yape/Plin esperando verificación
                  </p>
                </div>
              </div>
              <Button asChild className="w-full sm:w-auto shrink-0">
                <Link href="/admin/pagos-pendientes">Verificar Pagos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}