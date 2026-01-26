"use client";

import { useState, useEffect } from "react";
import { getEnabledPaymentMethods } from "@/actions/payment-settings";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { YapeIcon, PlinIcon, VisaIcon, MastercardIcon, PayPalIcon } from "@/components/payment-icons";

interface PaymentMethodSelectorProps {
  selectedMethod: "YAPE" | "PLIN" | "CARD" | "PAYPAL" | "MERCADOPAGO";
  onMethodChange: (method: "YAPE" | "PLIN" | "CARD" | "PAYPAL" | "MERCADOPAGO") => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({ 
  selectedMethod, 
  onMethodChange, 
  disabled 
}: PaymentMethodSelectorProps) {
  const [enabledMethods, setEnabledMethods] = useState({
    yape: true,
    plin: true,
    card: true,
    paypal: false,
    mercadopago: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMethods() {
      const methods = await getEnabledPaymentMethods();
      setEnabledMethods(methods);
      setLoading(false);

      // Si el método seleccionado ya no está habilitado, cambiar al primero disponible
      const methodKey = selectedMethod.toLowerCase() as keyof typeof methods;
      if (!methods[methodKey]) {
        // Encontrar el primer método habilitado
        const firstEnabled = Object.entries(methods).find(([_, enabled]) => enabled)?.[0];
        if (firstEnabled) {
          onMethodChange(firstEnabled.toUpperCase() as any);
        }
      }
    }
    loadMethods();
  }, [selectedMethod, onMethodChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasAnyMethod = Object.values(enabledMethods).some(enabled => enabled);

  if (!hasAnyMethod) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay métodos de pago habilitados. Por favor contacta al administrador.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <RadioGroup
      value={selectedMethod}
      onValueChange={(value) => onMethodChange(value as any)}
      className="space-y-3 min-w-0"
      disabled={disabled}
    >
      {/* YAPE */}
      {enabledMethods.yape && (
        <label 
          htmlFor="yape" 
          className="flex items-center gap-2.5 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer min-w-0"
        >
          <RadioGroupItem value="YAPE" id="yape" className="flex-shrink-0" />
          <div className="flex-shrink-0 w-7 h-7">
            <YapeIcon width={28} height={28} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">Yape</div>
            <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              Instantáneo • 0%
            </div>
          </div>
          <Badge variant="secondary" className="flex-shrink-0 hidden sm:inline-flex text-xs px-2 py-0.5">
            Top
          </Badge>
        </label>
      )}

      {/* PLIN */}
      {enabledMethods.plin && (
        <label 
          htmlFor="plin" 
          className="flex items-center gap-2.5 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer min-w-0"
        >
          <RadioGroupItem value="PLIN" id="plin" className="flex-shrink-0" />
          <div className="flex-shrink-0 w-7 h-7">
            <PlinIcon width={28} height={28} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">Plin</div>
            <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              Instantáneo • 0%
            </div>
          </div>
        </label>
      )}

      {/* TARJETA */}
      {enabledMethods.card && (
        <label 
          htmlFor="card" 
          className="flex items-center gap-2.5 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer min-w-0"
        >
          <RadioGroupItem value="CARD" id="card" className="flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <VisaIcon width={36} height={24} />
            <MastercardIcon width={28} height={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight truncate">
              Tarjeta
            </div>
            <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              Crédito/Débito
            </div>
          </div>
        </label>
      )}

      {/* PAYPAL */}
      {enabledMethods.paypal && (
        <label 
          htmlFor="paypal" 
          className="flex items-center gap-2.5 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer min-w-0"
        >
          <RadioGroupItem value="PAYPAL" id="paypal" className="flex-shrink-0" />
          <div className="flex-shrink-0 w-7 h-7">
            <PayPalIcon width={28} height={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">PayPal</div>
            <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              Internacional
            </div>
          </div>
        </label>
      )}

      {/* MERCADO PAGO */}
      {enabledMethods.mercadopago && (
        <label 
          htmlFor="mercadopago" 
          className="flex items-center gap-2.5 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer min-w-0"
        >
          <RadioGroupItem value="MERCADOPAGO" id="mercadopago" className="flex-shrink-0" />
          <div className="flex-shrink-0">
            <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">MP</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">Mercado Pago</div>
            <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              LATAM
            </div>
          </div>
        </label>
      )}
    </RadioGroup>
  );
}