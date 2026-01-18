import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface OrdersPageProps {
  searchParams: Promise<{
    status?: string;
    payment?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const { status, payment } = await searchParams;

  // Construir filtros
  const where: any = {};
  if (status) where.status = status;
  if (payment) where.paymentStatus = payment;

  // Obtener órdenes
  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  // Obtener totales para los filtros
  const [totalOrders, pendingPayment, paidOrders] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: "PENDING" } }),
    prisma.order.count({ where: { paymentStatus: "PAID" } }),
  ]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: "secondary", label: "Pendiente" },
      PAID: { variant: "default", label: "Pagado" },
      PROCESSING: { variant: "default", label: "Procesando" },
      SHIPPED: { variant: "default", label: "Enviado" },
      DELIVERED: { variant: "default", label: "Entregado" },
      CANCELLED: { variant: "destructive", label: "Cancelado" },
      REFUNDED: { variant: "destructive", label: "Reembolsado" },
    };
    return variants[status] || { variant: "secondary", label: status };
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700",
      PAID: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
      REFUNDED: "bg-slate-100 text-slate-700",
      VERIFYING: "bg-blue-100 text-blue-700",
    };
    const labels: Record<string, string> = {
      PENDING: "Pendiente",
      PAID: "Pagado",
      FAILED: "Fallido",
      REFUNDED: "Reembolsado",
      VERIFYING: "Verificando",
    };
    return {
      color: colors[paymentStatus] || "bg-slate-100 text-slate-700",
      label: labels[paymentStatus] || paymentStatus,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Órdenes</h1>
          <p className="text-muted-foreground">
            Gestiona todas las órdenes de tu tienda
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <Link href="/admin/ordenes">
          <Button variant={!payment ? "default" : "outline"} size="sm">
            Todas ({totalOrders})
          </Button>
        </Link>
        <Link href="/admin/ordenes?payment=PENDING">
          <Button variant={payment === "PENDING" ? "default" : "outline"} size="sm">
            Pendientes ({pendingPayment})
          </Button>
        </Link>
        <Link href="/admin/ordenes?payment=PAID">
          <Button variant={payment === "PAID" ? "default" : "outline"} size="sm">
            Pagadas ({paidOrders})
          </Button>
        </Link>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No hay órdenes que coincidan con los filtros
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const paymentBadge = getPaymentBadge(order.paymentStatus);
                const statusBadge = getStatusBadge(order.status);

                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/ordenes/${order.id}`}
                          className="font-semibold hover:underline"
                        >
                          #{order.orderNumber}
                        </Link>
                        <span className={`rounded-full px-2 py-1 text-xs ${paymentBadge.color}`}>
                          {paymentBadge.label}
                        </span>
                        <Badge variant={statusBadge.variant as any}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">{order.customerName}</span>
                        {" • "}
                        {order.customerEmail}
                        {" • "}
                        {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString("es-PE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {" • "}
                        {order.paymentMethod}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {formatPrice(Number(order.total))}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/ordenes/${order.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}