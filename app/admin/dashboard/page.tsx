import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
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
import SalesChart from "@/components/admin/SalesChart";
import OrdersStatusChart from "@/components/admin/OrdersStatusChart";

export default async function AdminDashboardPage() {
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

  const topProductsWithDetails = await Promise.all(
    topProducts.map(async (item) => {
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de tu tienda en tiempo real
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/ordenes">Ver Todas las Órdenes</Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                    {stat.change && (
                      <div className="mt-1 flex items-center gap-1 text-sm">
                        {stat.trend === "up" ? (
                          <ArrowUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-red-600" />
                        )}
                        <span
                          className={
                            stat.trend === "up"
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {stat.change}%
                        </span>
                        <span className="text-muted-foreground">vs mes anterior</span>
                      </div>
                    )}
                    {stat.subtitle && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {stat.subtitle}
                      </p>
                    )}
                  </div>
                  <div className={`rounded-full p-3 ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Sales Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Ventas de los Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={salesByDay} />
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Órdenes por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersStatusChart data={ordersByStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Products and Orders Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProductsWithDetails.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No hay ventas todavía
                </p>
              ) : (
                topProductsWithDetails.map((item, index) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">
                          {item.product?.name || "Producto eliminado"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item._sum.quantity} vendidos
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Stock Bajo (≤10 unidades)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  ✅ Todos los productos tienen stock suficiente
                </p>
              ) : (
                lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <Link
                        href={`/admin/productos/${product.id}`}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      {product.hasVariants && product.variants.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {product.variants.length} variante(s) con stock bajo
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        product.stock <= 5 || (product.hasVariants && product.variants.some(v => v.stock <= 5))
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {product.hasVariants
                        ? `Min: ${Math.min(...product.variants.map((v) => v.stock))}`
                        : product.stock}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Órdenes Recientes</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/ordenes">Ver Todas</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay órdenes todavía
              </p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <Link
                      href={`/admin/ordenes/${order.id}`}
                      className="font-medium hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {order.customerName} • {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatPrice(Number(order.total))}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs ${
                          order.paymentStatus === "PAID"
                            ? "bg-green-100 text-green-700"
                            : order.paymentStatus === "PENDING"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {order.paymentStatus === "PAID"
                          ? "Pagado"
                          : order.paymentStatus === "PENDING"
                          ? "Pendiente"
                          : "Fallido"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {pendingPayments > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-amber-100 p-3">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold">
                    Tienes {pendingPayments} pago{pendingPayments !== 1 ? "s" : ""}{" "}
                    pendiente{pendingPayments !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pagos Yape/Plin esperando verificación
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/admin/pagos-pendientes">Verificar Pagos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}