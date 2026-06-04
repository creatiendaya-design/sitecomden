"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

interface MercadoPagoRedirectClientProps {
  orderDisplayNumber: string;
  total: number;
  redirectUrl: string | null;
  error: string | null;
}

export default function MercadoPagoRedirectClient({
  orderDisplayNumber,
  total,
  redirectUrl,
  error,
}: MercadoPagoRedirectClientProps) {
  const { clearCart } = useCartStore();
  const [redirecting, setRedirecting] = useState(false);

  const handlePay = () => {
    if (!redirectUrl) return;
    setRedirecting(true);
    // El cliente se compromete a pagar: limpiamos el carrito antes de salir
    // del sitio hacia la pantalla segura de MercadoPago.
    clearCart();
    window.location.href = redirectUrl;
  };

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
              <ShieldCheck className="h-8 w-8 text-sky-600" />
            </div>
            <CardTitle className="text-2xl">Pago con Mercado Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-center">
              <p className="text-sm text-sky-900">
                <strong>Orden {orderDisplayNumber}</strong>
              </p>
              <p className="mt-2 text-2xl font-bold text-sky-900">{formatPrice(total)}</p>
            </div>

            {error ? (
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/carrito">Volver al carrito</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  Serás redirigido a la pantalla segura de Mercado Pago para completar tu
                  pago. Puedes pagar con tarjeta, dinero en cuenta y otros medios.
                </p>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePay}
                  disabled={redirecting || !redirectUrl}
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirigiendo...
                    </>
                  ) : (
                    "Pagar con Mercado Pago"
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  🔒 El pago es procesado de forma segura por Mercado Pago.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
