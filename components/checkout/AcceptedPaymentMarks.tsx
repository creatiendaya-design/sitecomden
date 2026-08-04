"use client";

import { Lock } from "lucide-react";
import {
  VisaIcon,
  MastercardIcon,
  YapeIcon,
  PlinIcon,
  PayPalIcon,
  MercadoPagoBadgeIcon,
} from "@/components/payment-icons";
import { cn } from "@/lib/utils";

/**
 * Marcas de pago aceptadas + sello de seguridad.
 *
 * Se dibuja a partir de `enabledMethods` (resuelto en el servidor), no de una
 * lista fija: anunciar un método que la tienda no acepta es un pasivo de
 * confianza — el cliente elige por el sello y después no lo encuentra en el
 * selector. Por el mismo motivo, un método activo siempre aparece.
 *
 * Los SVG van `aria-hidden` porque son decorativos; la lista real se expone a
 * lectores de pantalla como una frase en `sr-only`.
 */

export interface EnabledPaymentMethods {
  yape: boolean;
  plin: boolean;
  card: boolean;
  paypal: boolean;
  mercadopago: boolean;
}

interface AcceptedPaymentMarksProps {
  methods: EnabledPaymentMethods;
  /** "md" para el flujo móvil, "sm" para la tarjeta de resumen en desktop. */
  size?: "sm" | "md";
  /** Texto del sello. */
  securityLabel?: string;
  className?: string;
}

const SIZES = {
  md: { visa: [36, 24], master: [32, 20], wallet: [28, 28], paypal: [64, 36], mp: [38, 24] },
  sm: { visa: [28, 18], master: [26, 16], wallet: [24, 24], paypal: [56, 32], mp: [32, 20] },
} as const;

export function AcceptedPaymentMarks({
  methods,
  size = "md",
  securityLabel = "Pago seguro",
  className,
}: AcceptedPaymentMarksProps) {
  const s = SIZES[size];
  const opacity = size === "md" ? "opacity-80" : "opacity-70";

  const names = [
    methods.card && "Visa y Mastercard",
    methods.yape && "Yape",
    methods.plin && "Plin",
    methods.paypal && "PayPal",
    methods.mercadopago && "Mercado Pago",
  ].filter((n): n is string => typeof n === "string");

  if (names.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-2 gap-y-1",
        className
      )}
    >
      <span className="sr-only">Métodos de pago aceptados: {names.join(", ")}.</span>

      <span className="flex items-center gap-2" aria-hidden="true">
        {methods.card && (
          <>
            <VisaIcon width={s.visa[0]} height={s.visa[1]} className={opacity} />
            <MastercardIcon
              width={s.master[0]}
              height={s.master[1]}
              className={opacity}
            />
          </>
        )}
        {methods.yape && (
          <YapeIcon width={s.wallet[0]} height={s.wallet[1]} className={opacity} />
        )}
        {methods.plin && (
          <PlinIcon width={s.wallet[0]} height={s.wallet[1]} className={opacity} />
        )}
        {methods.mercadopago && (
          <MercadoPagoBadgeIcon
            width={s.mp[0]}
            height={s.mp[1]}
            className={opacity}
          />
        )}
        {methods.paypal && (
          <PayPalIcon width={s.paypal[0]} height={s.paypal[1]} className={opacity} />
        )}
      </span>

      <span className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" aria-hidden="true" />
        {securityLabel}
      </span>
    </div>
  );
}
