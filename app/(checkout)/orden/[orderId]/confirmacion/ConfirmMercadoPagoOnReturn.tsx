"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { confirmMercadoPagoReturn } from "@/actions/mercadopago-return";

/**
 * Al volver de MercadoPago, verifica el pago contra la API (vía Server Action) y
 * refresca la página si el estado cambió (PAID/FAILED). Respalda al webhook, que
 * en localhost no llega. Solo se monta cuando la orden aún no está pagada y el
 * retorno trae un payment_id, así que normalmente corre una sola vez.
 */
export default function ConfirmMercadoPagoOnReturn({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    confirmMercadoPagoReturn(paymentId)
      .then((res) => {
        // Si el pago se aprobó (o quedó fallido), reflejarlo de inmediato.
        if (res.ok && (res.status === "paid" || res.status === "failed")) {
          router.refresh();
        }
      })
      .finally(() => setVerifying(false));
  }, [paymentId, router]);

  if (!verifying) return null;

  return (
    <div className="mx-auto mb-6 flex max-w-2xl items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-cta" />
      Confirmando tu pago…
    </div>
  );
}
