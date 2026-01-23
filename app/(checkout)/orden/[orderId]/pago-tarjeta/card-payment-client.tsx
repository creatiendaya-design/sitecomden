"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CulqiPaymentForm from "@/components/shop/CulqiPaymentForm";
import { processCardPayment } from "@/actions/payments";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

interface CardPaymentClientProps {
  orderId: string;
  orderNumber: string;
  total: number;
  customerEmail: string;
}

export default function CardPaymentClient({
  orderId,
  orderNumber,
  total,
  customerEmail,
}: CardPaymentClientProps) {
  const router = useRouter();
  const { clearCart } = useCartStore();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = async (culqiToken: string) => {
    setProcessing(true);
    setError(null);

    try {
      const result = await processCardPayment({
        orderId,
        culqiToken,
        email: customerEmail,
      });

      if (!result.success) {
        setError(result.error || "Error al procesar el pago");
        setProcessing(false);
        return;
      }

      // Limpiar carrito
      clearCart();

      // Redirigir a confirmación
      router.push(`/orden/${orderId}/confirmacion`);
    } catch (err) {
      console.error("Error processing payment:", err);
      setError("Error inesperado al procesar el pago");
      setProcessing(false);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Completar Pago</h1>
          <p className="text-muted-foreground mt-2">
            Orden #{orderNumber}
          </p>
        </div>

        {/* Error global */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Estado de procesamiento */}
        {processing && (
          <Alert className="border-blue-500 bg-blue-50">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              <strong>Procesando tu pago...</strong>
              <p className="mt-1">No cierres esta ventana ni recargues la página.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Formulario de pago */}
        {!processing && (
          <CulqiPaymentForm
            amount={total}
            email={customerEmail}
            orderId={orderId}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}

        {/* Resumen de orden */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen de la Orden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium">Total a Pagar:</span>
              <span className="font-bold text-primary">{formatPrice(total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Información de seguridad */}
        <div className="rounded-lg bg-muted p-4 text-sm text-center">
          <p className="text-muted-foreground">
            🔒 Este pago es procesado de forma segura por <strong>Culqi</strong>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tu información bancaria está protegida con encriptación de nivel bancario
          </p>
        </div>
      </div>
    </div>
  );
}