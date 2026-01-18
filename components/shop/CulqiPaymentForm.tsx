"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Lock } from "lucide-react";

interface CulqiPaymentFormProps {
  amount: number;
  email: string;
  orderId: string;
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
}

// Declarar tipo global de Culqi
declare global {
  interface Window {
    Culqi: any;
  }
}

export default function CulqiPaymentForm({
  amount,
  email,
  orderId,
  onSuccess,
  onError,
}: CulqiPaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [culqiLoaded, setCulqiLoaded] = useState(false);

  useEffect(() => {
    // Cargar script de Culqi
    const script = document.createElement("script");
    script.src = "https://checkout.culqi.com/js/v4";
    script.async = true;
    script.onload = () => {
      setCulqiLoaded(true);
      configureCulqi();
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const configureCulqi = () => {
    if (typeof window !== "undefined" && window.Culqi) {
      window.Culqi.publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;

      window.Culqi.options({
        lang: "es",
        installments: false,
        style: {
          logo: "https://tu-logo.com/logo.png", // Opcional
          maincolor: "#0f172a", // Color primario
          buttontext: "#ffffff",
          maintext: "#0f172a",
          desctext: "#64748b",
        },
      });

      // Callback cuando se obtiene el token
      window.Culqi.culqi = function () {
        if (window.Culqi.token) {
          const token = window.Culqi.token.id;
          onSuccess(token);
        } else if (window.Culqi.error) {
          onError(window.Culqi.error.user_message);
        }
      };
    }
  };

  const handlePay = () => {
    if (!culqiLoaded || !window.Culqi) {
      onError("Culqi no está cargado. Por favor recarga la página.");
      return;
    }

    setLoading(true);

    try {
      // Configurar datos del pago
      window.Culqi.settings({
        title: "ShopGood Perú",
        currency: "PEN",
        amount: Math.round(amount * 100), // Convertir a centavos
        order: orderId,
        description: `Orden #${orderId}`,
      });

      // Abrir formulario de Culqi
      window.Culqi.open();
    } catch (error) {
      onError("Error al abrir el formulario de pago");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Pago con Tarjeta</h3>
              <p className="text-sm text-muted-foreground">
                Visa, Mastercard, American Express
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-center text-sm text-blue-900">
              Monto a pagar:
            </p>
            <p className="mt-1 text-center text-2xl font-bold text-blue-900">
              S/. {amount.toFixed(2)}
            </p>
          </div>

          <Button
            onClick={handlePay}
            disabled={loading || !culqiLoaded}
            className="w-full"
            size="lg"
          >
            {loading ? (
              "Procesando..."
            ) : !culqiLoaded ? (
              "Cargando..."
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Pagar con Tarjeta
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Pago seguro procesado por Culqi</span>
          </div>

          <div className="rounded-lg bg-muted p-3 text-xs">
            <p className="font-medium">Información importante:</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Tus datos están protegidos con encriptación SSL</li>
              <li>No guardamos información de tu tarjeta</li>
              <li>Recibirás confirmación por email</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}