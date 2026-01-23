import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { notFound, redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { CheckCircle2, Package, Mail, Phone, MapPin, CreditCard } from "lucide-react";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderId } = await params;
  
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  });

  if (!order) {
    return {
      title: "Orden no encontrada",
    };
  }

  return {
    title: `Confirmación de Pedido - ${order.orderNumber}`,
    description: `Tu pedido ${order.orderNumber} ha sido confirmado exitosamente.`,
    robots: {
      index: false, // No indexar páginas de órdenes
      follow: false,
    },
  };
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;

  // Obtener configuraciones del sitio
  const siteSettings = await getSiteSettings();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Si el pago aún está pendiente, redirigir a la página correspondiente
  if (order.paymentStatus === "PENDING") {
    if (order.paymentMethod === "YAPE" || order.paymentMethod === "PLIN") {
      redirect(`/orden/${order.id}/pago-pendiente`);
    } else if (order.paymentMethod === "PAYPAL") {
      redirect(`/orden/${order.id}/pago-paypal`);
    }
  }

  const isPaid = order.paymentStatus === "PAID";

  // Formatear número de WhatsApp (quitar espacios y caracteres especiales)
  const whatsappNumber = siteSettings.contact_phone.replace(/\D/g, '');

  return (
    <div className="container py-8 md:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header de Confirmación */}
        <Card className="border-green-500 bg-green-50">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl md:text-3xl text-green-900">
              {isPaid ? "¡Pedido Confirmado!" : "Pedido Recibido"}
            </CardTitle>
            <p className="text-green-700 mt-2">
              Orden #{order.orderNumber}
            </p>
          </CardHeader>
          <CardContent>
            <Alert className="bg-white border-green-200">
              <Mail className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Hemos enviado un email de confirmación a:</strong>
                <p className="mt-1">{order.customerEmail}</p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Información del Pedido */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalles del Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Estado del Pedido:</span>
              <span className="text-sm font-bold text-primary">
                {order.status === "PAID" ? "Pagado" : order.status}
              </span>
            </div>

            {/* Items */}
            <div>
              <h3 className="font-medium mb-3">Productos:</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm border-b pb-3">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Cantidad: {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium">
                      {formatPrice(Number(item.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="space-y-2 pt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envío:</span>
                <span>{formatPrice(Number(order.shipping))}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento:</span>
                  <span>-{formatPrice(Number(order.discount))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total:</span>
                <span className="text-primary">{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de Envío */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Información de Envío
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nombre:</p>
              <p className="font-medium">{order.customerName}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dirección:</p>
              <p>{typeof order.shippingAddress === 'object' && order.shippingAddress !== null 
                ? `${(order.shippingAddress as any).address}, ${(order.shippingAddress as any).district}, ${(order.shippingAddress as any).city}`
                : order.shippingAddress}</p>
              {typeof order.shippingAddress === 'object' && (order.shippingAddress as any).reference && (
                <p className="text-sm text-muted-foreground mt-1">
                  Referencia: {(order.shippingAddress as any).reference}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Teléfono:</p>
              <p>{order.customerPhone}</p>
            </div>

            {order.shippingMethod && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Método de Envío:</p>
                <p className="capitalize">{order.shippingMethod}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información de Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Información de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Método de Pago:</p>
              <p className="font-medium">
                {order.paymentMethod === "CARD" && "Tarjeta de Crédito/Débito"}
                {order.paymentMethod === "YAPE" && "Yape"}
                {order.paymentMethod === "PLIN" && "Plin"}
                {order.paymentMethod === "PAYPAL" && "PayPal"}
                {order.paymentMethod === "MERCADOPAGO" && "Mercado Pago"}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estado de Pago:</p>
              <p className={`font-medium ${
                order.paymentStatus === "PAID" ? "text-green-600" : 
                order.paymentStatus === "PENDING" ? "text-amber-600" : 
                "text-red-600"
              }`}>
                {order.paymentStatus === "PAID" && "✅ Pagado"}
                {order.paymentStatus === "PENDING" && "⏳ Pendiente"}
                {order.paymentStatus === "FAILED" && "❌ Fallido"}
              </p>
            </div>

            {order.paymentId && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID de Transacción:</p>
                <p className="text-xs font-mono bg-muted p-2 rounded">{order.paymentId}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos Pasos */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">📦 Próximos Pasos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p>1. Recibirás un email de confirmación en {order.customerEmail}</p>
            <p>2. Prepararemos tu pedido en las próximas 24-48 horas</p>
            <p>3. Te enviaremos el número de seguimiento una vez despachado</p>
            <p>4. Recibirás tu pedido en la dirección indicada</p>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="flex-1" size="lg">
            <Link href="/">Volver al Inicio</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1" size="lg">
            <Link href="/productos">Seguir Comprando</Link>
          </Button>
        </div>

        {/* Ayuda */}
        <Alert>
          <Phone className="h-4 w-4" />
          <AlertDescription>
            <strong>¿Necesitas ayuda?</strong>
            <p className="mt-1 text-sm">
              Contáctanos por WhatsApp:{" "}
              <a
                href={`https://wa.me/${whatsappNumber}?text=Hola, tengo una consulta sobre mi orden ${order.orderNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {siteSettings.contact_phone}
              </a>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              También puedes escribirnos a: {siteSettings.contact_email}
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}