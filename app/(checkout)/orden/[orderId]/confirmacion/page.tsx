import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { notFound, redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { 
  CheckCircle2, 
  Package, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard,
  Truck,
  Clock,
  Shield,
  Download,
  MessageCircle
} from "lucide-react";
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
      index: false,
      follow: false,
    },
  };
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;
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

  if (order.paymentStatus === "PENDING") {
    if (order.paymentMethod === "YAPE" || order.paymentMethod === "PLIN") {
      redirect(`/orden/${order.id}/pago-pendiente`);
    } else if (order.paymentMethod === "PAYPAL") {
      redirect(`/orden/${order.id}/pago-paypal`);
    }
  }

  const isPaid = order.paymentStatus === "PAID";
  const whatsappNumber = siteSettings.contact_phone.replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-100/20 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Success Header - Enhanced */}
          <div className="mb-8 md:mb-12">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwIDYuNjI3LTUuMzczIDEyLTEyIDEycy0xMi01LjM3My0xMi0xMiA1LjM3My0xMiAxMi0xMiAxMiA1LjM3MyAxMiAxMnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
              
              <CardContent className="relative pt-8 pb-8 md:pt-12 md:pb-10 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-8 ring-white/30">
                  <CheckCircle2 className="h-10 w-10 md:h-14 md:w-14 text-white drop-shadow-lg" strokeWidth={2.5} />
                </div>
                
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
                  {isPaid ? "¡Pedido Confirmado!" : "Pedido Recibido"}
                </h1>
                
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-2.5 rounded-full border border-white/30">
                  <Package className="h-4 w-4 text-white" />
                  <span className="text-white font-semibold text-lg">
                    Orden #{order.orderNumber}
                  </span>
                </div>

                <p className="mt-6 text-green-50 text-base md:text-lg max-w-2xl mx-auto">
                  Gracias por tu compra. Hemos recibido tu pedido y lo estamos procesando.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Email Confirmation Alert */}
          <Alert className="mb-6 border-blue-200 bg-blue-50/50 backdrop-blur-sm">
            <Mail className="h-5 w-5 text-blue-600" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-blue-900">Confirmación enviada</p>
              <p className="text-sm text-blue-700 mt-1">
                Hemos enviado los detalles de tu pedido a <span className="font-medium">{order.customerEmail}</span>
              </p>
            </AlertDescription>
          </Alert>

          {/* Main Content Grid */}
          <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="text-lg md:text-xl flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <span>Productos Ordenados</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {order.items.map((item, index) => (
                      <div 
                        key={item.id} 
                        className="p-4 md:p-6 hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                            <span className="text-xl md:text-2xl font-bold text-slate-400">
                              {index + 1}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 mb-1 text-sm md:text-base">
                              {item.name}
                            </h4>
                            {item.variantName && (
                              <p className="text-xs md:text-sm text-slate-500 mb-2">
                                Variante: {item.variantName}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs md:text-sm text-slate-600">
                              <span>Cantidad: <strong>{item.quantity}</strong></span>
                              <span>•</span>
                              <span>{formatPrice(Number(item.price))} c/u</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-bold text-slate-900 text-base md:text-lg">
                              {formatPrice(Number(item.price) * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Summary */}
                  <div className="p-4 md:p-6 bg-slate-50 border-t-2">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm md:text-base text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatPrice(Number(order.subtotal))}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base text-slate-600">
                        <span>Envío</span>
                        <span className="font-medium">{formatPrice(Number(order.shipping))}</span>
                      </div>
                      {Number(order.discount) > 0 && (
                        <div className="flex justify-between text-sm md:text-base text-green-600">
                          <span>Descuento aplicado</span>
                          <span className="font-semibold">-{formatPrice(Number(order.discount))}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t-2 border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="text-base md:text-lg font-bold text-slate-900">Total</span>
                          <span className="text-xl md:text-2xl font-bold text-blue-600">
                            {formatPrice(Number(order.total))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Information */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="text-lg md:text-xl flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-purple-600" />
                    </div>
                    <span>Información de Envío</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Nombre Completo
                      </p>
                      <p className="font-semibold text-slate-900">{order.customerName}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Teléfono
                      </p>
                      <p className="font-semibold text-slate-900">{order.customerPhone}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Dirección de Entrega
                    </p>
                    <div className="bg-slate-50 rounded-lg p-3 md:p-4 border border-slate-200">
                      <p className="text-slate-900 font-medium">
                        {typeof order.shippingAddress === 'object' && order.shippingAddress !== null 
                          ? `${(order.shippingAddress as any).address}, ${(order.shippingAddress as any).district}, ${(order.shippingAddress as any).city}`
                          : order.shippingAddress}
                      </p>
                      {typeof order.shippingAddress === 'object' && (order.shippingAddress as any).reference && (
                        <p className="text-sm text-slate-600 mt-2 flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>Referencia: {(order.shippingAddress as any).reference}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {order.shippingMethod && (
                    <div className="bg-blue-50 rounded-lg p-3 md:p-4 border border-blue-200">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                        Método de Envío
                      </p>
                      <p className="font-semibold text-blue-900 capitalize">{order.shippingMethod}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Status & Actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Payment Status */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="text-lg flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <span>Pago</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Método de Pago
                    </p>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="font-semibold text-slate-900">
                        {order.paymentMethod === "CARD" && "💳 Tarjeta de Crédito/Débito"}
                        {order.paymentMethod === "YAPE" && "📱 Yape"}
                        {order.paymentMethod === "PLIN" && "📱 Plin"}
                        {order.paymentMethod === "PAYPAL" && "💰 PayPal"}
                        {order.paymentMethod === "MERCADOPAGO" && "💳 Mercado Pago"}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Estado
                    </p>
                    <div className={`rounded-lg p-3 border-2 ${
                      order.paymentStatus === "PAID" 
                        ? "bg-green-50 border-green-300" 
                        : order.paymentStatus === "PENDING"
                        ? "bg-amber-50 border-amber-300"
                        : "bg-red-50 border-red-300"
                    }`}>
                      <p className={`font-bold flex items-center gap-2 ${
                        order.paymentStatus === "PAID" ? "text-green-700" : 
                        order.paymentStatus === "PENDING" ? "text-amber-700" : 
                        "text-red-700"
                      }`}>
                        {order.paymentStatus === "PAID" && (
                          <>
                            <CheckCircle2 className="h-5 w-5" />
                            <span>Pagado</span>
                          </>
                        )}
                        {order.paymentStatus === "PENDING" && (
                          <>
                            <Clock className="h-5 w-5" />
                            <span>Pendiente</span>
                          </>
                        )}
                        {order.paymentStatus === "FAILED" && "❌ Fallido"}
                      </p>
                    </div>
                  </div>

                  {order.paymentId && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        ID de Transacción
                      </p>
                      <div className="bg-slate-100 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs font-mono text-slate-700 break-all">
                          {order.paymentId}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader className="border-b border-blue-100">
                  <CardTitle className="text-lg flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-blue-900">Próximos Pasos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        <strong className="text-slate-900">Email de confirmación</strong> enviado a tu correo
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        <strong className="text-slate-900">Preparación del pedido</strong> en 24-48 horas
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        <strong className="text-slate-900">Envío de tracking</strong> una vez despachado
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        4
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        <strong className="text-slate-900">Recepción</strong> en tu dirección
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Badge */}
              <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Compra Segura</p>
                    <p className="text-xs text-slate-600">Datos protegidos con encriptación SSL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 md:mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button asChild size="lg" className="h-12 md:h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
              <Link href="/" className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Volver al Inicio
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="h-12 md:h-14 text-base font-semibold border-2 hover:bg-slate-50">
              <Link href="/productos" className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Seguir Comprando
              </Link>
            </Button>

            <Button 
              asChild 
              size="lg" 
              variant="outline"
              className="h-12 md:h-14 text-base font-semibold border-2 border-green-600 text-green-700 hover:bg-green-50 sm:col-span-2 lg:col-span-1"
            >
              <a
                href={`https://wa.me/${whatsappNumber}?text=Hola, tengo una consulta sobre mi orden ${order.orderNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Contactar por WhatsApp
              </a>
            </Button>
          </div>

          {/* Help Section */}
          <Card className="mt-8 border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <Phone className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    ¿Necesitas ayuda?
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Nuestro equipo está listo para ayudarte con cualquier pregunta sobre tu pedido.
                  </p>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <a
                      href={`https://wa.me/${whatsappNumber}?text=Hola, tengo una consulta sobre mi orden ${order.orderNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{siteSettings.contact_phone}</span>
                    </a>
                    
                    <a
                      href={`mailto:${siteSettings.contact_email}?subject=Consulta sobre orden ${order.orderNumber}`}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Mail className="h-4 w-4" />
                      <span>{siteSettings.contact_email}</span>
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}