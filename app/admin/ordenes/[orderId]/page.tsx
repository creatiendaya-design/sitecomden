import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { getSiteSettings } from "@/lib/site-settings";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, User, MapPin, CreditCard } from "lucide-react";
import Image from "next/image";
import OrderUpdateForm from "./order-update-form";
import CopyLinkButton from "./copy-link-button";

interface OrderDetailPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function AdminOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { orderId } = await params;

  // Obtener configuración del sitio para el URL
  const siteSettings = await getSiteSettings();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
          variant: {
            select: {
              id: true,
              sku: true,
              options: true,
              image: true,
            },
          },
        },
      },
      pendingPayment: true,
    },
  });

  if (!order) {
    notFound();
  }

  const shippingAddress = order.shippingAddress as any;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: "secondary", label: "Pendiente" },
      PAID: { variant: "default", label: "Pagado" },
      PROCESSING: { variant: "default", label: "Procesando" },
      SHIPPED: { variant: "default", label: "Enviado" },
      DELIVERED: { variant: "default", label: "Entregado" },
      CANCELLED: { variant: "destructive", label: "Cancelado" },
    };
    return variants[status] || { variant: "secondary", label: status };
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700",
      PAID: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
      VERIFYING: "bg-blue-100 text-blue-700",
      REFUNDED: "bg-slate-100 text-slate-700",
    };
    const labels: Record<string, string> = {
      PENDING: "Pendiente",
      PAID: "Pagado",
      FAILED: "Fallido",
      VERIFYING: "Verificando",
      REFUNDED: "Reembolsado",
    };
    return {
      color: colors[paymentStatus] || "bg-slate-100 text-slate-700",
      label: labels[paymentStatus] || paymentStatus,
    };
  };

  const statusBadge = getStatusBadge(order.status);
  const paymentBadge = getPaymentBadge(order.paymentStatus);

  // Usar site_url de la configuración en lugar de variable de entorno
  const baseUrl = siteSettings.site_url || 'http://localhost:3000';
  const viewLink = order.viewToken
    ? `${baseUrl}/orden/verificar?token=${order.viewToken}&email=${order.customerEmail}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/ordenes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Orden #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleString("es-PE", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusBadge.variant as any}>
            {statusBadge.label}
          </Badge>
          <span className={`rounded-full px-2 py-1 text-xs ${paymentBadge.color}`}>
            {paymentBadge.label}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {(item.image || item.variant?.image) && (
                      <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                        <Image
                          src={item.image || item.variant?.image || ''}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.sku}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        Cantidad: {item.quantity} × {formatPrice(Number(item.price))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatPrice(Number(item.price) * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatPrice(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío:</span>
                  <span>{formatPrice(Number(order.shipping))}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="text-green-600">
                      -{formatPrice(Number(order.discount))}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatPrice(Number(order.total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nombre:</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="font-medium">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono:</p>
                <p className="font-medium">{order.customerPhone}</p>
              </div>
              {order.customerDni && (
                <div>
                  <p className="text-sm text-muted-foreground">DNI:</p>
                  <p className="font-medium">{order.customerDni}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dirección de Envío
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{shippingAddress.address}</p>
              <p className="text-muted-foreground">
                {shippingAddress.district}, {shippingAddress.city}
              </p>
              <p className="text-muted-foreground">{shippingAddress.department}</p>
              {shippingAddress.reference && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Referencia: {shippingAddress.reference}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {order.customerNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas del Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{order.customerNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Link para Cliente */}
          {viewLink && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Link para Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={viewLink}
                    readOnly
                    className="flex-1 text-xs bg-slate-50 border rounded px-2 py-1"
                  />
                  <CopyLinkButton link={viewLink} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  URL configurado: {baseUrl}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Formulario de Actualización */}
          <OrderUpdateForm
            orderId={order.id}
            currentStatus={order.status}
            currentPaymentStatus={order.paymentStatus}
            currentFulfillmentStatus={order.fulfillmentStatus}
            currentTrackingNumber={order.trackingNumber || ""}
            currentShippingCourier={order.shippingCourier || ""}
            currentAdminNotes={order.adminNotes || ""}
          />

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.paymentMethod}</p>
              {order.pendingPayment && (
                <div className="mt-3 rounded-lg bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-900">
                    Pago pendiente de verificación
                  </p>
                  <Button size="sm" className="mt-2" asChild>
                    <Link href="/admin/pagos-pendientes">
                      Verificar Pago
                    </Link>
                  </Button>
                </div>
              )}
              {order.paidAt && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Pagado: {new Date(order.paidAt).toLocaleString("es-PE")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Fechas Importantes */}
          <Card>
            <CardHeader>
              <CardTitle>Fechas Importantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="font-medium">Creada</p>
                <p className="text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString("es-PE")}
                </p>
              </div>
              {order.paidAt && (
                <div>
                  <p className="font-medium">Pagada</p>
                  <p className="text-muted-foreground">
                    {new Date(order.paidAt).toLocaleString("es-PE")}
                  </p>
                </div>
              )}
              {order.shippedAt && (
                <div>
                  <p className="font-medium">Enviada</p>
                  <p className="text-muted-foreground">
                    {new Date(order.shippedAt).toLocaleString("es-PE")}
                  </p>
                </div>
              )}
              {order.deliveredAt && (
                <div>
                  <p className="font-medium">Entregada</p>
                  <p className="text-muted-foreground">
                    {new Date(order.deliveredAt).toLocaleString("es-PE")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}