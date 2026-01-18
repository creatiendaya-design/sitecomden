import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Clock, CheckCircle2, Upload, AlertCircle } from "lucide-react";
import PaymentUploadForm from "./payment-upload-form";
import { getPaymentMethodSettings } from "@/actions/payment-settings";
import Image from "next/image";

interface PageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function PendingPaymentPage({ params }: PageProps) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      pendingPayment: true,
    },
  });

  if (!order) {
    notFound();
  }

  if (!order.pendingPayment) {
    return (
      <div className="container py-16">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="pt-6 text-center">
            <p>Esta orden no requiere verificación de pago.</p>
            <Link href="/" className="text-primary underline mt-4 block">
              Volver al inicio
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Obtener configuración de métodos de pago
  const paymentSettings = await getPaymentMethodSettings();

  const isYape = order.paymentMethod === "YAPE";
  const isPlin = order.paymentMethod === "PLIN";
  const paymentMethod = isYape ? "Yape" : "Plin";

  // Obtener configuración específica del método
  const methodConfig = isYape ? paymentSettings.yape : paymentSettings.plin;

  // Verificar si ya subió comprobante
  const hasProof = order.pendingPayment.proofImage && order.pendingPayment.reference;

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              {hasProof ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <Clock className="h-8 w-8 text-amber-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {hasProof
                ? "Comprobante Recibido"
                : `Pago Pendiente - ${paymentMethod}`}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Orden #{order.orderNumber}
            </p>
          </CardHeader>
          <CardContent>
            {/* Monto a pagar */}
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-6 text-center">
              <p className="text-sm text-amber-900 font-medium">Monto Total</p>
              <p className="mt-2 text-4xl font-bold text-amber-900">
                {formatPrice(Number(order.total))}
              </p>
            </div>
          </CardContent>
        </Card>

        {hasProof ? (
          /* Ya subió comprobante */
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              <strong>¡Comprobante recibido!</strong>
              <p className="mt-1">
                Estamos verificando tu pago. Te notificaremos por email cuando sea
                confirmado. Esto generalmente toma menos de 1 hora en horario de
                oficina.
              </p>
              <p className="mt-2 text-sm">
                Número de operación: <strong>{order.pendingPayment.reference}</strong>
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          /* Formulario para subir comprobante */
          <>
            {/* Instrucciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instrucciones de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                      1
                    </span>
                    <span>Abre tu app de {paymentMethod}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                      2
                    </span>
                    <span>
                      Envía <strong>{formatPrice(Number(order.total))}</strong> al
                      número: <strong>{methodConfig.phoneNumber}</strong>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                      3
                    </span>
                    <span>Toma captura de pantalla del comprobante</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                      4
                    </span>
                    <span>Sube tu comprobante usando el formulario abajo</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Código QR de {paymentMethod}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
                  {methodConfig.qrImageUrl ? (
                    <div className="relative h-64 w-64 rounded-lg overflow-hidden">
                      <Image
                        src={methodConfig.qrImageUrl}
                        alt={`QR ${paymentMethod}`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="relative h-48 w-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-center text-sm text-muted-foreground px-4">
                        El administrador aún no ha configurado el QR de {paymentMethod}
                      </p>
                    </div>
                  )}
                  <p className="mt-4 text-center font-medium text-lg">
                    {methodConfig.phoneNumber}
                  </p>
                  {methodConfig.accountName && (
                    <p className="text-sm text-muted-foreground">
                      A nombre de: {methodConfig.accountName}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Formulario de Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Subir Comprobante de Pago
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sube una foto clara de tu comprobante para que podamos verificar tu
                  pago más rápido
                </p>
              </CardHeader>
              <CardContent>
                <PaymentUploadForm orderId={order.id} />
              </CardContent>
            </Card>
          </>
        )}

        {/* Resumen de Orden */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen de tu Orden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.name} {item.variantName && `(${item.variantName})`} x{" "}
                    {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatPrice(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío:</span>
                  <span>{formatPrice(Number(order.shipping))}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento:</span>
                    <span>-{formatPrice(Number(order.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatPrice(Number(order.total))}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ayuda */}
        <Alert>
          <AlertDescription>
            <strong>¿Necesitas ayuda?</strong>
            <p className="mt-1 text-sm">
              Si tienes algún problema, contáctanos por WhatsApp:{" "}
              <a
                href={`https://wa.me/51${methodConfig.phoneNumber.replace(/\s/g, '')}?text=Hola, tengo una consulta sobre mi orden ${order.orderNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                +51 {methodConfig.phoneNumber}
              </a>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}