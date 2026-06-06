"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkoutPayButtonClass } from "@/components/checkout/pay-button-class";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";

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
  const redirectedRef = useRef(false);
  const [redirecting, setRedirecting] = useState(!error && !!redirectUrl);

  const goToMercadoPago = () => {
    if (!redirectUrl || redirectedRef.current) return;
    redirectedRef.current = true;
    setRedirecting(true);
    // NO vaciamos el carrito al salir: el cliente aún no pagó. Se vacía recién
    // en la confirmación, cuando ya volvió de pagar (como Shopify).
    window.location.href = redirectUrl;
  };

  // Redirección automática a MercadoPago: 1 solo clic ("Confirmar Pedido") en
  // todo el flujo. El botón manual queda como respaldo si el navegador bloquea
  // la navegación automática.
  useEffect(() => {
    if (error || !redirectUrl) return;
    const t = setTimeout(goToMercadoPago, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
              <ShieldCheck className="h-8 w-8 text-sky-600" />
            </div>
            <CardTitle className="text-2xl">
              {error ? "No se pudo iniciar el pago" : "Redirigiendo a Mercado Pago…"}
            </CardTitle>
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
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                  <p className="text-sm text-muted-foreground">
                    Te estamos llevando a la pantalla segura de Mercado Pago…
                  </p>
                </div>
                {/* Respaldo si la redirección automática no ocurre. */}
                <Button
                  variant="cta"
                  className={`w-full ${checkoutPayButtonClass}`}
                  size="lg"
                  onClick={goToMercadoPago}
                  disabled={!redirectUrl}
                >
                  {redirecting ? "Continuar a Mercado Pago" : "Pagar con Mercado Pago"}
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
