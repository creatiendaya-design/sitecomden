"use client";

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aviso de error del checkout.
 *
 * El error de envío/pago (orden rechazada, tarjeta fallida, RUC inválido, sin
 * stock…) se dispara desde el CTA, que en móvil vive en la barra fija inferior
 * y en desktop en la tarjeta de resumen. Renderizarlo inline al inicio del
 * formulario lo dejaba fuera de pantalla: el cliente tocaba "Confirmar Pedido"
 * y no veía ninguna respuesta. Por eso este banner se monta flotante:
 *   - móvil  → dentro de `[data-checkout-paybar]`, justo encima del botón,
 *   - desktop → en el stack fijo superior.
 *
 * `variant="inline"` es la versión compacta para la barra de pago, donde el
 * espacio vertical compite con el CTA (que nunca debe desaparecer).
 */

interface CheckoutErrorBannerProps {
  message: string;
  /** Omitir para un aviso no descartable. */
  onDismiss?: () => void;
  /** "floating" = tarjeta con sombra; "inline" = compacto para la paybar. */
  variant?: "floating" | "inline";
  className?: string;
}

export function CheckoutErrorBanner({
  message,
  onDismiss,
  variant = "floating",
  className,
}: CheckoutErrorBannerProps) {
  const floating = variant === "floating";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex items-start gap-2.5 border border-red-700 bg-red-600 text-white",
        floating
          ? "animate-in slide-in-from-top-5 rounded-xl p-4 shadow-2xl"
          : "rounded-xl px-2.5 py-2 text-xs",
        className
      )}
    >
      <AlertTriangle
        className={cn("shrink-0", floating ? "mt-0.5 h-5 w-5" : "mt-px h-3.5 w-3.5")}
        aria-hidden="true"
      />
      <p
        className={cn(
          "min-w-0 flex-1 font-medium",
          floating ? "text-sm" : "leading-snug"
        )}
      >
        {message}
      </p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso de error"
          className={cn(
            "shrink-0 rounded text-white/80 transition-colors hover:bg-white/10 hover:text-white",
            floating ? "p-1" : "p-0.5"
          )}
        >
          <X className={floating ? "h-5 w-5" : "h-3.5 w-3.5"} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
