"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { PayPalIcon } from "@/components/payment-icons";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

interface PaypalRedirectClientProps {
  orderDisplayNumber: string;
  totalPen: number;
  chargeAmount: number | null;
  currency: string;
  approveUrl: string | null;
  canceled: boolean;
  error: string | null;
}

export default function PaypalRedirectClient({
  orderDisplayNumber,
  totalPen,
  chargeAmount,
  currency,
  approveUrl,
  canceled,
  error,
}: PaypalRedirectClientProps) {
  const { clearCart } = useCartStore();
  const [redirecting, setRedirecting] = useState(false);

  const handlePay = () => {
    if (!approveUrl) return;
    setRedirecting(true);
    clearCart();
    window.location.href = approveUrl;
  };

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <PayPalIcon width={36} height={22} />
            </div>
            <CardTitle className="text-2xl">Pago con PayPal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-sm text-blue-900">
                <strong>Orden {orderDisplayNumber}</strong>
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-900">{formatPrice(totalPen)}</p>
              {chargeAmount !== null && (
                <p className="mt-1 text-sm text-blue-800">
                  Se cobrará aprox.{" "}
                  <strong>
                    {chargeAmount.toFixed(2)} {currency}
                  </strong>{" "}
                  en PayPal
                </p>
              )}
            </div>

            {canceled && !error && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Cancelaste el pago. Puedes intentarlo nuevamente cuando quieras.
                </AlertDescription>
              </Alert>
            )}

            {error ? (
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/carrito">Volver al carrito</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  Serás redirigido a PayPal para completar tu pago de forma segura. Al volver,
                  confirmaremos tu orden automáticamente.
                </p>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePay}
                  disabled={redirecting || !approveUrl}
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirigiendo...
                    </>
                  ) : (
                    "Pagar con PayPal"
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  🔒 El pago es procesado de forma segura por PayPal.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
