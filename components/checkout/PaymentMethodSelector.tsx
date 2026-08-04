"use client";

import { useState, useEffect, type ReactNode } from "react";
import { getCheckoutPaymentConfig } from "@/actions/payment-settings";
import {
  resolvePaymentMethodTitle,
  type PaymentMethodRow,
  type PaymentMethodTitles,
} from "@/lib/payments/method-titles";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  YapeIcon,
  PlinIcon,
  VisaIcon,
  MastercardIcon,
  PayPalIcon,
  MercadoPagoIcon,
} from "@/components/payment-icons";
import { cn } from "@/lib/utils";

type EnabledMethods = {
  yape: boolean;
  plin: boolean;
  card: boolean;
  paypal: boolean;
  mercadopago: boolean;
};

/**
 * `MERCADOPAGO_CARD` es una opción de INTERFAZ, no un método de pago nuevo en
 * BD: se guarda como `MERCADOPAGO` igual que el flujo con redirección (mismo
 * procesador, misma conciliación, mismos webhooks). Lo único que cambia es
 * dónde paga el cliente — aquí mismo con el Brick, o en la pantalla de
 * MercadoPago. Ver `toDbPaymentMethod` en el checkout.
 */
export type MethodValue = PaymentMethodRow;

const DEFAULT_ENABLED: EnabledMethods = {
  yape: true,
  plin: true,
  card: true,
  paypal: false,
  mercadopago: false,
};

interface PaymentMethodSelectorProps {
  selectedMethod: MethodValue;
  onMethodChange: (method: MethodValue) => void;
  disabled?: boolean;
  /**
   * Enabled methods resolved on the server (passed from the checkout page).
   * When provided, we skip the client round-trip entirely and render
   * instantly — no spinner, no flicker.
   */
  initialEnabledMethods?: EnabledMethods;
  /**
   * Títulos personalizados por fila, configurados en
   * Admin → Configuración → Métodos de Pago. Los que vengan vacíos caen al
   * título de fábrica.
   */
  initialTitles?: PaymentMethodTitles;
  /**
   * Contenido extra dentro del panel desplegado de un método concreto (p. ej.
   * el formulario de tarjeta de MercadoPago). Va aquí y no en el checkout para
   * que el formulario viva DENTRO de la opción seleccionada, como en la
   * referencia, en lugar de flotar debajo de la lista.
   */
  panelExtras?: Partial<Record<MethodValue, ReactNode>>;
}

/**
 * Marca de pago: rectángulo 38×24 con borde, como en la referencia de checkout.
 * Los logos cuadrados (Yape/Plin) se centran a 18px para que todas las marcas
 * ocupen exactamente el mismo espacio y la columna derecha no baile.
 */
function Mark({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span
      className="flex h-6 w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-black/10 bg-white"
      title={label}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

interface MethodConfig {
  /** Toggle de admin que gobierna la fila. Varias filas pueden compartirlo. */
  key: keyof EnabledMethods;
  value: MethodValue;
  /** Aclara la fila cuando su etiqueta se parece a la de otra (dos "Tarjeta"). */
  hint?: string;
  /** Contenido del panel que se despliega bajo la opción seleccionada. */
  detail: string;
  marks: ReactNode;
}

/**
 * El título de cada fila NO vive aquí: es editable desde el admin y su valor
 * de fábrica está en `lib/payments/method-titles.ts` (fuente única compartida
 * con el formulario de configuración).
 */
const METHODS: readonly MethodConfig[] = [
  {
    key: "yape",
    value: "YAPE",
    detail:
      "Al confirmar tu pedido te mostraremos el número Yape para transferir. Luego subes tu constancia de pago y validamos la orden.",
    marks: (
      <Mark label="Yape">
        <YapeIcon width={18} height={18} />
      </Mark>
    ),
  },
  {
    key: "plin",
    value: "PLIN",
    detail:
      "Al confirmar tu pedido te mostraremos el número Plin para transferir. Luego subes tu constancia de pago y validamos la orden.",
    marks: (
      <Mark label="Plin">
        <PlinIcon width={18} height={18} />
      </Mark>
    ),
  },
  {
    key: "card",
    value: "CARD",
    hint: "Pago seguro con Culqi",
    detail:
      "Se abrirá la ventana segura de Culqi para ingresar los datos de tu tarjeta. Nunca almacenamos tu número de tarjeta.",
    marks: (
      <>
        <Mark label="Visa">
          <VisaIcon width={34} height={22} />
        </Mark>
        <Mark label="Mastercard">
          <MastercardIcon width={28} height={18} />
        </Mark>
      </>
    ),
  },
  {
    key: "paypal",
    value: "PAYPAL",
    detail:
      "Se te redirigirá a PayPal para que completes la compra y luego volverás a la tienda.",
    marks: (
      <Mark label="PayPal">
        <PayPalIcon width={32} height={18} />
      </Mark>
    ),
  },
  {
    key: "mercadopago",
    value: "MERCADOPAGO_CARD",
    hint: "Ingresa tu tarjeta aquí, sin salir de la tienda",
    detail:
      "Completa los datos de tu tarjeta abajo. El formulario es de Mercado Pago: tu número de tarjeta nunca pasa por nuestros servidores.",
    marks: (
      <>
        <Mark label="Mercado Pago">
          <MercadoPagoIcon width={20} height={20} />
        </Mark>
        <Mark label="Visa">
          <VisaIcon width={34} height={22} />
        </Mark>
        <Mark label="Mastercard">
          <MastercardIcon width={28} height={18} />
        </Mark>
      </>
    ),
  },
  {
    key: "mercadopago",
    value: "MERCADOPAGO",
    hint: "Yape, efectivo y billetera Mercado Pago",
    detail:
      "Se te redirigirá a Mercado Pago para que completes la compra y luego volverás a la tienda.",
    marks: (
      <Mark label="Mercado Pago">
        <MercadoPagoIcon width={20} height={20} />
      </Mark>
    ),
  },
];

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  disabled,
  initialEnabledMethods,
  initialTitles,
  panelExtras,
}: PaymentMethodSelectorProps) {
  const [enabledMethods, setEnabledMethods] = useState<EnabledMethods>(
    initialEnabledMethods ?? DEFAULT_ENABLED
  );
  const [titles, setTitles] = useState<PaymentMethodTitles | undefined>(
    initialTitles
  );
  const [loading, setLoading] = useState(!initialEnabledMethods);

  // Fetch only when the server didn't already provide the data.
  useEffect(() => {
    if (initialEnabledMethods) return;
    let active = true;
    getCheckoutPaymentConfig().then((config) => {
      if (!active) return;
      setEnabledMethods(config.enabled);
      setTitles(config.titles);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [initialEnabledMethods]);

  // If the currently selected method is disabled, fall back to the first
  // enabled one. Kept separate from the fetch so it never re-triggers a load.
  //
  // Se resuelve contra METHODS y no derivando la clave del valor: desde que hay
  // filas que comparten toggle (`MERCADOPAGO_CARD` → `mercadopago`), pasar el
  // valor a minúsculas ya no da una clave válida de `EnabledMethods`.
  useEffect(() => {
    if (loading) return;
    const current = METHODS.find((m) => m.value === selectedMethod);
    if (current && enabledMethods[current.key]) return;

    const firstEnabled = METHODS.find((m) => enabledMethods[m.key]);
    if (firstEnabled) {
      onMethodChange(firstEnabled.value);
    }
  }, [loading, enabledMethods, selectedMethod, onMethodChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" role="status">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          aria-hidden="true"
        ></div>
        <span className="sr-only">Cargando métodos de pago…</span>
      </div>
    );
  }

  const availableMethods = METHODS.filter((m) => enabledMethods[m.key]);

  if (availableMethods.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>
          No hay métodos de pago habilitados. Por favor contacta al administrador.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <RadioGroup
      value={selectedMethod}
      onValueChange={(value) => onMethodChange(value as MethodValue)}
      className={cn(
        // Un solo bloque con divisores internos, como en la referencia: las
        // opciones no son tarjetas sueltas sino filas de una misma lista.
        "grid gap-0 overflow-hidden rounded-lg border min-w-0",
        disabled && "opacity-60"
      )}
      disabled={disabled}
    >
      {availableMethods.map((method, index) => {
        const selected = selectedMethod === method.value;
        const id = `payment-${method.value.toLowerCase()}`;

        return (
          <div
            key={method.value}
            className={cn("relative min-w-0", index > 0 && "border-t")}
          >
            {/* Borde de selección superpuesto (inset -1px): duplica el borde
                existente en lugar de desplazar el layout, igual que la
                referencia. */}
            {selected && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px z-10 border-2 border-foreground/30"
              />
            )}

            <label
              htmlFor={id}
              className={cn(
                "grid cursor-pointer grid-cols-[min-content_1fr_minmax(0,max-content)] items-center gap-3 px-4 py-3.5 transition-colors",
                !selected && !disabled && "hover:bg-muted/50",
                disabled && "cursor-not-allowed"
              )}
            >
              <RadioGroupItem
                value={method.value}
                id={id}
                className="size-[18px] shrink-0"
              />

              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">
                  {resolvePaymentMethodTitle(method.value, titles)}
                </span>
                {method.hint && (
                  <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">
                    {method.hint}
                  </span>
                )}
              </span>

              <span className="flex items-center gap-1.5">{method.marks}</span>
            </label>

            {selected && (
              <div className="space-y-4 border-t bg-muted/40 px-4 py-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {method.detail}
                </p>
                {panelExtras?.[method.value]}
              </div>
            )}
          </div>
        );
      })}
    </RadioGroup>
  );
}
