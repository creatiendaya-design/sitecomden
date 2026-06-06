export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { formatPrice, formatOrderNumber } from "@/lib/utils";
import { formatPeruDateShort, formatPeruDate, formatPeruTime } from "@/lib/format-date";
import { getSiteSettings } from "@/lib/site-settings";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import OrderFiltersPanel from "@/components/admin/OrderFiltersPanel";

const PER_PAGE = 50;

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CARD: "Tarjeta",
  YAPE: "Yape",
  PLIN: "Plin",
  PAYPAL: "PayPal",
  COD: "COD",
  BANK_TRANSFER: "Transferencia",
};

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string;
    desde?: string;
    hasta?: string;
    status?: string | string[];
    payment?: string | string[];
    productId?: string;
    categoryId?: string;
    department?: string;
    province?: string;
    district?: string;
    q?: string;
    montoMin?: string;
    montoMax?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const settings = await getSiteSettings();
  const orderPrefix = settings.order_prefix || "PED";

  const where: Record<string, unknown> = {};

  if (params.desde || params.hasta) {
    const createdAt: Record<string, Date> = {};
    if (params.desde) createdAt.gte = new Date(params.desde);
    if (params.hasta) {
      const end = new Date(params.hasta);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  const statuses = params.status
    ? Array.isArray(params.status)
      ? params.status
      : [params.status]
    : [];
  if (statuses.length > 0) where.status = { in: statuses };

  const methods = params.payment
    ? Array.isArray(params.payment)
      ? params.payment
      : [params.payment]
    : [];
  if (methods.length > 0) where.paymentMethod = { in: methods };

  const itemsConditions: Record<string, unknown>[] = [];
  if (params.productId) itemsConditions.push({ productId: params.productId });
  if (params.categoryId)
    itemsConditions.push({
      product: { categories: { some: { categoryId: params.categoryId } } },
    });
  if (itemsConditions.length === 1) where.items = { some: itemsConditions[0] };
  if (itemsConditions.length > 1)
    where.items = { some: { AND: itemsConditions } };

  const addressConditions: Record<string, unknown>[] = [];
  if (params.department)
    addressConditions.push({
      shippingAddress: { path: ["department"], equals: params.department },
    });
  if (params.province)
    addressConditions.push({
      shippingAddress: { path: ["province"], equals: params.province },
    });
  if (params.district)
    addressConditions.push({
      shippingAddress: { path: ["district"], equals: params.district },
    });
  if (addressConditions.length === 1) Object.assign(where, addressConditions[0]);
  if (addressConditions.length > 1) where.AND = addressConditions;

  if (params.q) {
    where.OR = [
      { customerName: { contains: params.q, mode: "insensitive" } },
      { customerEmail: { contains: params.q, mode: "insensitive" } },
      { customerPhone: { contains: params.q, mode: "insensitive" } },
    ];
  }

  if (params.montoMin || params.montoMax) {
    const total: Record<string, number> = {};
    if (params.montoMin) total.gte = parseFloat(params.montoMin);
    if (params.montoMax) total.lte = parseFloat(params.montoMax);
    where.total = total;
  }

  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PER_PAGE;

  const [orders, filteredCount, totalOrders, pendingPayment, paidOrders, categories] =
    await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { select: { id: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: PER_PAGE,
      }),
      prisma.order.count({ where }),
      prisma.order.count(),
      prisma.order.count({ where: { paymentStatus: "PENDING" } }),
      prisma.order.count({ where: { paymentStatus: "PAID" } }),
      prisma.category.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PER_PAGE));

  const buildHref = (target: number): string => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page" || v == null) continue;
      if (Array.isArray(v)) v.forEach((val) => sp.append(k, val));
      else sp.set(k, v);
    }
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return `/admin/ordenes${qs ? `?${qs}` : ""}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      PENDING: { variant: "secondary", label: "Pendiente" },
      PAID: { variant: "default", label: "Pagado" },
      PROCESSING: { variant: "default", label: "Procesando" },
      SHIPPED: { variant: "default", label: "Enviado" },
      DELIVERED: { variant: "default", label: "Entregado" },
      CANCELLED: { variant: "destructive", label: "Cancelado" },
      REFUNDED: { variant: "destructive", label: "Reembolsado" },
    };
    return variants[status] || { variant: "secondary" as const, label: status };
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

  const currentPayment = Array.isArray(params.payment)
    ? params.payment[0]
    : params.payment;

  const from = filteredCount === 0 ? 0 : skip + 1;
  const to = Math.min(skip + PER_PAGE, filteredCount);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Órdenes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona todas las órdenes de tu tienda
          </p>
        </div>
      </div>

      {/* Advanced Filters + Export */}
      <OrderFiltersPanel categories={categories} />

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <Link href="/admin/ordenes">
          <Button
            variant={!currentPayment ? "default" : "outline"}
            size="sm"
            className="whitespace-nowrap"
          >
            Todas ({totalOrders})
          </Button>
        </Link>
        <Link href="/admin/ordenes?payment=PENDING">
          <Button
            variant={currentPayment === "PENDING" ? "default" : "outline"}
            size="sm"
            className="whitespace-nowrap"
          >
            Pendientes ({pendingPayment})
          </Button>
        </Link>
        <Link href="/admin/ordenes?payment=PAID">
          <Button
            variant={currentPayment === "PAID" ? "default" : "outline"}
            size="sm"
            className="whitespace-nowrap"
          >
            Pagadas ({paidOrders})
          </Button>
        </Link>
      </div>

      {/* Orders */}
      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Lista de Órdenes</CardTitle>
            {filteredCount > 0 && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {from}–{to} de {filteredCount}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No hay órdenes que coincidan con los filtros
            </div>
          ) : (
            <>
              {/* MOBILE: compact list */}
              <ul className="divide-y md:hidden">
                {orders.map((order) => {
                  const paymentBadge = getPaymentBadge(order.paymentStatus);
                  const statusBadge = getStatusBadge(order.status);
                  const orderLabel = order.orderSeq
                    ? formatOrderNumber(order.orderSeq, orderPrefix)
                    : `#${order.orderNumber.slice(-8).toUpperCase()}`;
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/admin/ordenes/${order.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted/60"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">
                              {orderLabel}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${paymentBadge.color}`}
                            >
                              {paymentBadge.label}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground truncate">
                            <span className="font-medium text-foreground/80">
                              {order.customerName}
                            </span>
                            <span> · </span>
                            <span>
                              {formatPeruDateShort(order.createdAt)}
                            </span>
                            <span> · </span>
                            <span>{order.items.length} item{order.items.length === 1 ? "" : "s"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-sm font-bold tabular-nums">
                            {formatPrice(Number(order.total))}
                          </span>
                          <Badge
                            variant={statusBadge.variant}
                            className="text-[10px] mt-1 h-5 px-1.5"
                          >
                            {statusBadge.label}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* DESKTOP: dense table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="px-4 text-xs uppercase tracking-wide text-muted-foreground">
                        Orden
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Cliente
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Fecha
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-center">
                        Items
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Pago
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Estado
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right px-4">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const paymentBadge = getPaymentBadge(order.paymentStatus);
                      const statusBadge = getStatusBadge(order.status);
                      const orderLabel = order.orderSeq
                        ? formatOrderNumber(order.orderSeq, orderPrefix)
                        : `#${order.orderNumber.slice(-8).toUpperCase()}`;
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="px-4 py-2.5">
                            <Link
                              href={`/admin/ordenes/${order.id}`}
                              className="font-semibold text-sm hover:underline tabular-nums"
                            >
                              {orderLabel}
                            </Link>
                          </TableCell>
                          <TableCell className="py-2.5 max-w-[220px]">
                            <div className="font-medium text-sm leading-tight truncate">
                              {order.customerName}
                            </div>
                            <div className="text-xs text-muted-foreground leading-tight truncate">
                              {order.customerEmail}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-sm">
                            <div className="leading-tight">
                              {formatPeruDate(order.createdAt)}
                            </div>
                            <div className="text-xs text-muted-foreground leading-tight tabular-nums">
                              {formatPeruTime(order.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-center text-sm tabular-nums">
                            {order.items.length}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground leading-tight">
                                {PAYMENT_METHOD_LABEL[order.paymentMethod] ??
                                  order.paymentMethod}
                              </span>
                              <span
                                className={`inline-block w-fit rounded-full px-1.5 py-0.5 text-[10px] font-medium ${paymentBadge.color}`}
                              >
                                {paymentBadge.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge
                              variant={statusBadge.variant}
                              className="text-xs"
                            >
                              {statusBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 text-right px-4 font-bold text-sm tabular-nums">
                            {formatPrice(Number(order.total))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Página {pageNum} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    {pageNum > 1 ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={buildHref(pageNum - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">Anterior</span>
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Anterior</span>
                      </Button>
                    )}
                    {pageNum < totalPages ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={buildHref(pageNum + 1)}>
                          <span className="hidden sm:inline mr-1">Siguiente</span>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <span className="hidden sm:inline mr-1">Siguiente</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
