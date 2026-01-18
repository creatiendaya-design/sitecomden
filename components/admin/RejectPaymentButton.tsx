"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface RejectPaymentButtonProps {
  paymentId: string;
  orderId: string;
}

export default function RejectPaymentButton({
  paymentId,
  orderId,
}: RejectPaymentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleReject = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/payments/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, orderId, reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Error al rechazar el pago");
        return;
      }

      router.refresh();
    } catch (error) {
      alert("Error al rechazar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="flex-1" variant="destructive" disabled={loading}>
          <X className="mr-2 h-4 w-4" />
          Rechazar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Rechazar este pago?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción cancelará la orden y restaurará el stock de los
            productos. El cliente será notificado del rechazo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="reason">Motivo del rechazo (opcional)</Label>
          <Input
            id="reason"
            placeholder="Ej: Comprobante inválido, monto incorrecto..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? "Rechazando..." : "Confirmar Rechazo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}