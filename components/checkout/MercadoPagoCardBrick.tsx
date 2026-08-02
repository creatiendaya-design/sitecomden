"use client";

/**
 * Card Payment Brick de MercadoPago embebido en el checkout.
 *
 * Los campos de tarjeta son iframes servidos por MercadoPago: el PAN, el CVV y
 * la fecha nunca tocan nuestro DOM ni nuestro servidor, así que el alcance PCI
 * sigue siendo SAQ-A (igual que el modal de Culqi).
 *
 * El botón propio del Brick va oculto (`hidePaymentButton`): quien dispara el
 * cobro es el CTA del checkout, que además valida dirección, envío y términos.
 * Tener dos botones de pago en la misma pantalla es una fuente garantizada de
 * pedidos a medio crear.
 *
 * Docs: https://www.mercadopago.com.pe/developers/es/docs/checkout-bricks/card-payment-brick
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

/** Lo que devuelve `getFormData()`. `transaction_amount` se ignora a propósito. */
export interface MercadoPagoCardFormData {
  token: string;
  payment_method_id: string;
  issuer_id?: string | number | null;
  installments?: number;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string } | null;
  };
}

export interface MercadoPagoBrickController {
  getFormData: () => Promise<MercadoPagoCardFormData>;
  unmount: () => void;
  update?: (data: { amount: number }) => Promise<unknown> | unknown;
}

interface MercadoPagoSdk {
  bricks: () => {
    create: (
      brick: string,
      containerId: string,
      settings: Record<string, unknown>
    ) => Promise<MercadoPagoBrickController>;
  };
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoSdk;
  }
}

const SDK_URL = "https://sdk.mercadopago.com/js/v2";
const CONTAINER_ID = "mercadopago-card-brick";

/**
 * Carga del SDK compartida por todo el árbol: si el componente se monta y
 * desmonta al cambiar de método de pago, no queremos N etiquetas <script>.
 */
let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_URL}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("sdk-load-failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Permitir reintento en el siguiente montaje.
      sdkPromise = null;
      reject(new Error("sdk-load-failed"));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

interface MercadoPagoCardBrickProps {
  /** Importe a cobrar (solo para mostrar cuotas; el cobro real usa order.total). */
  amount: number;
  /** Precarga el email del comprador en el formulario. */
  payerEmail?: string;
  /**
   * El padre guarda aquí el controlador para poder llamar a `getFormData()`
   * desde el CTA de pago del checkout.
   */
  controllerRef: RefObject<MercadoPagoBrickController | null>;
  disabled?: boolean;
}

export function MercadoPagoCardBrick({
  amount,
  payerEmail,
  controllerRef,
  disabled,
}: MercadoPagoCardBrickProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // El Brick se crea UNA vez. `amount` y `payerEmail` cambian mientras el
  // comprador edita el carrito; recrearlo en cada cambio borraría la tarjeta ya
  // tecleada, así que el importe se refresca con `update()`.
  const initializedRef = useRef(false);
  const latestEmailRef = useRef(payerEmail);
  latestEmailRef.current = payerEmail;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;
    const controllerRefLocal = controllerRef;

    (async () => {
      try {
        const response = await fetch("/api/mercadopago/public-key");
        const data = (await response.json()) as {
          success: boolean;
          publicKey?: string;
        };
        if (!response.ok || !data.success || !data.publicKey) {
          throw new Error("public-key-unavailable");
        }

        await loadSdk();
        if (cancelled) return;

        if (!window.MercadoPago) throw new Error("sdk-missing");

        const mp = new window.MercadoPago(data.publicKey, { locale: "es-PE" });
        const controller = await mp.bricks().create("cardPayment", CONTAINER_ID, {
          initialization: {
            amount,
            ...(latestEmailRef.current
              ? { payer: { email: latestEmailRef.current } }
              : {}),
          },
          customization: {
            // El CTA del checkout es quien cobra — ver doc del módulo.
            visual: { hidePaymentButton: true },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setStatus("ready");
            },
            onError: (error: unknown) => {
              // Los errores de validación de campo los pinta el propio Brick;
              // aquí solo registramos para no tapar su UI con un banner nuestro.
              console.error("MercadoPago Brick error:", error);
            },
          },
        });

        if (cancelled) {
          controller.unmount();
          return;
        }

        controllerRefLocal.current = controller;
      } catch (error) {
        console.error("No se pudo cargar el formulario de tarjeta:", error);
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(
            "No pudimos cargar el formulario de tarjeta. Recarga la página o elige otro método de pago."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        controllerRefLocal.current?.unmount();
      } catch {
        // El Brick ya puede haberse ido con el nodo del DOM: no es un fallo.
      }
      controllerRefLocal.current = null;
      initializedRef.current = false;
    };
    // Deliberadamente sin `amount` / `payerEmail`: ver `initializedRef`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresca el importe (cambia con el envío, el cupón o el carrito) sin
  // destruir el formulario que el comprador ya está llenando.
  useEffect(() => {
    if (status !== "ready") return;
    const controller = controllerRef.current;
    if (typeof controller?.update !== "function") return;
    Promise.resolve(controller.update({ amount })).catch((error) => {
      console.error("No se pudo actualizar el importe del Brick:", error);
    });
  }, [amount, status, controllerRef]);

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      {status === "loading" && (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando formulario seguro de tarjeta…
        </div>
      )}

      {status === "error" && errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/*
        El contenedor debe existir en el DOM ANTES de crear el Brick y quedar
        visible: los iframes de MercadoPago se miden al montarse, y crearlos
        dentro de un `display:none` los deja con altura 0 aunque después se
        muestre el bloque.
      */}
      <div id={CONTAINER_ID} />
    </div>
  );
}
