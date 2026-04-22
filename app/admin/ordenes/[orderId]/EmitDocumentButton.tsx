"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { emitDocumentAction, resendComprobanteEmailAction } from "@/actions/sunat";
import { useRouter } from "next/navigation";

export function EmitDocumentButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      const result = await emitDocumentAction(orderId);
      if (!result.success) {
        setError(result.error ?? "Error al emitir el comprobante");
      } else {
        router.refresh();
      }
    } catch {
      setError("Error inesperado. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handle} disabled={loading} size="sm">
        {loading ? "Emitiendo..." : "Emitir ahora"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ResendComprobanteButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      const result = await resendComprobanteEmailAction(orderId);
      if (!result.success) {
        setError(result.error ?? "Error al reenviar");
      } else {
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      }
    } catch {
      setError("Error inesperado. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button onClick={handle} disabled={loading} variant="outline" size="sm">
        {loading ? "Enviando..." : done ? "¡Enviado!" : "Reenviar email"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
