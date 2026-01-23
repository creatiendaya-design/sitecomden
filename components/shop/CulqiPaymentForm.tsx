"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, AlertCircle, Lock } from "lucide-react";
import { formatPrice } from "@/lib/utils";

// Declarar tipo global de Culqi
declare global {
  interface Window {
    Culqi: any;
  }
}

interface CulqiPaymentFormProps {
  amount: number;
  email: string;
  orderId: string;
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
}

export default function CulqiPaymentForm({
  amount,
  email,
  orderId,
  onSuccess,
  onError,
}: CulqiPaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [culqiLoaded, setCulqiLoaded] = useState(false);

  // Estados del formulario
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  // Verificar si Culqi está cargado
  useEffect(() => {
    const checkCulqi = () => {
      if (typeof window !== "undefined" && window.Culqi) {
        setCulqiLoaded(true);
      } else {
        // Reintentar después de 100ms
        setTimeout(checkCulqi, 100);
      }
    };

    checkCulqi();
  }, []);

  // Configurar Culqi cuando se cargue
  useEffect(() => {
    if (culqiLoaded && window.Culqi) {
      window.Culqi.publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;

      // Callback cuando se obtiene el token
      window.Culqi.options({
        lang: "es",
        modal: false,
        installments: false,
        customButton: "Pagar",
      });
    }
  }, [culqiLoaded]);

  // Formatear número de tarjeta (espacios cada 4 dígitos)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, "");
    const formatted = value.replace(/(\d{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  // Formatear expiración (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2, 4);
    }
    setCardExpiry(value);
  };

  // Formatear CVV (solo números)
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCardCvv(value.slice(0, 4));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validaciones
    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      setError("Número de tarjeta inválido");
      setLoading(false);
      return;
    }

    const [expMonth, expYear] = cardExpiry.split("/");
    if (!expMonth || !expYear || expMonth.length !== 2 || expYear.length !== 2) {
      setError("Fecha de expiración inválida");
      setLoading(false);
      return;
    }

    if (cardCvv.length < 3 || cardCvv.length > 4) {
      setError("CVV inválido");
      setLoading(false);
      return;
    }

    if (!cardholderName.trim()) {
      setError("Ingresa el nombre del titular");
      setLoading(false);
      return;
    }

    try {
      // Crear token con Culqi
      if (!window.Culqi) {
        throw new Error("Culqi no está cargado");
      }

      // Configurar datos de la tarjeta
      window.Culqi.settings({
        title: "ShopGood Perú",
        currency: "PEN",
        amount: Math.round(amount * 100), // Convertir a centavos
        order: orderId,
      });

      // Crear token
      const token = await createCulqiToken({
        card_number: cleanCardNumber,
        cvv: cardCvv,
        expiration_month: expMonth,
        expiration_year: expYear,
        email: email,
      });

      if (token) {
        onSuccess(token);
      } else {
        throw new Error("No se pudo crear el token");
      }
    } catch (err: any) {
      console.error("Error creating Culqi token:", err);
      const errorMessage = err.message || "Error al procesar la tarjeta";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Crear token de Culqi (promisificado)
  const createCulqiToken = (cardData: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Callback de éxito
      window.Culqi.createToken = () => {
        if (window.Culqi.token) {
          resolve(window.Culqi.token.id);
        } else if (window.Culqi.error) {
          reject(new Error(window.Culqi.error.user_message));
        } else {
          reject(new Error("Error desconocido"));
        }
      };

      // Enviar datos a Culqi
      window.Culqi.generateToken(cardData);
    });
  };

  if (!culqiLoaded) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando procesador de pagos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pago con Tarjeta
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Total a pagar: <strong className="text-lg text-foreground">{formatPrice(amount)}</strong>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Número de Tarjeta */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">
              Número de Tarjeta <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cardNumber"
              type="text"
              inputMode="numeric"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={handleCardNumberChange}
              maxLength={19}
              disabled={loading}
              required
            />
          </div>

          {/* Nombre del Titular */}
          <div className="space-y-2">
            <Label htmlFor="cardholderName">
              Nombre del Titular <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cardholderName"
              type="text"
              placeholder="JUAN PEREZ"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
              disabled={loading}
              required
            />
          </div>

          {/* Expiración y CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cardExpiry">
                Expiración <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cardExpiry"
                type="text"
                inputMode="numeric"
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={handleExpiryChange}
                maxLength={5}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardCvv">
                CVV <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cardCvv"
                type="text"
                inputMode="numeric"
                placeholder="123"
                value={cardCvv}
                onChange={handleCvvChange}
                maxLength={4}
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Mensaje de seguridad */}
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Pago 100% seguro</p>
                <p className="text-xs text-blue-700 mt-1">
                  Tu información está protegida con encriptación de nivel bancario.
                  Procesado por Culqi.
                </p>
              </div>
            </div>
          </div>

          {/* Botón de Pago */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando pago...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pagar {formatPrice(amount)}
              </>
            )}
          </Button>

          {/* Tarjetas aceptadas */}
          <div className="text-center text-xs text-muted-foreground">
            Aceptamos Visa, Mastercard, American Express y Diners Club
          </div>
        </form>
      </CardContent>
    </Card>
  );
}