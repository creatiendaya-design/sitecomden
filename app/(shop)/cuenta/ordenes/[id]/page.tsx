import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, Package, Truck, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

const statusLabels = {
  PENDING: "Pendiente de pago",
  PAID: "Pagado",
  PROCESSING: "Procesando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { sessionClaims } = auth();
  const userEmail = sessionClaims?.email as string;

  // Obtener pedido
  const order = await prisma.order.findUnique({
    where: {
      id: params.id,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Verificar que el pedido pertenece al usuario
  if (order.customerEmail !== userEmail) {
    redirect("/cuenta/ordenes");
  }

  const shippingAddress = order.shippingAddress as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/cuenta/ordenes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a mis pedidos
          </Button>
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pedido #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Realizado el{" "}
              {format(new Date(order.createdAt), "d 'de' MMMM 'de' yyyy", {
                locale: es,
              })}
            </p>
          </div>
          <Badge
            className={statusColors[order.status]}
            variant="secondary"
          >
            {statusLabels[order.status]}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Estado del pedido */}
          <Card>
            <CardHeader>
              <CardTitle>Estado del pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Timeline */}
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <div className="h-full w-px bg-border" />
                    </div>
                    <div className="pb-4">
                      <p className="font-medium">Pedido realizado</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "d MMM, HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>

                  {order.paidAt && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        {order.shippedAt && (
                          <div className="h-full w-px bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium">Pago confirmado</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.paidAt), "d MMM, HH:mm", {
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.shippedAt && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <Truck className="h-6 w-6 text-blue-600" />
                        {order.deliveredAt && (
                          <div className="h-full w-px bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium">En camino</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.shippedAt), "d MMM, HH:mm", {
                            locale: es,
                          })}
                        </p>
                        {order.trackingNumber && (
                          <p className="mt-1 text-sm">
                            Tracking: <code>{order.trackingNumber}</code>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {order.deliveredAt && (
                    <div className="flex gap-4">
                      <Package className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-medium">Entregado</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.deliveredAt), "d MMM, HH:mm", {
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {!order.paidAt && (
                    <div className="flex gap-4">
                      <Clock className="h-6 w-6 text-yellow-600" />
                      <div>
                        <p className="font-medium">Esperando pago</p>
                        <p className="text-sm text-muted-foreground">
                          Método: {order.paymentMethod}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Productos */}
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-20 w-20 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <Link
                        href={`/producto/${item.product.slug}`}
                        className="font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Cantidad: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        S/. {Number(item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>S/. {Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envío</span>
                <span>S/. {Number(order.shipping).toFixed(2)}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span>-S/. {Number(order.discount).toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>S/. {Number(order.total).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Dirección de envío */}
          <Card>
            <CardHeader>
              <CardTitle>Dirección de envío</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customerName}</p>
              <p>{shippingAddress?.address}</p>
              <p>
                {shippingAddress?.district}, {shippingAddress?.city}
              </p>
              <p>{shippingAddress?.department}</p>
              {shippingAddress?.reference && (
                <p className="text-muted-foreground">
                  Ref: {shippingAddress.reference}
                </p>
              )}
              <p className="pt-2">{order.customerPhone}</p>
            </CardContent>
          </Card>

          {/* Método de pago */}
          <Card>
            <CardHeader>
              <CardTitle>Método de pago</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{order.paymentMethod}</p>
              {order.paymentProvider && (
                <p className="text-muted-foreground capitalize">
                  {order.paymentProvider}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}