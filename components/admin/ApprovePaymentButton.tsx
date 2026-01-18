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
import { Check } from "lucide-react";

interface ApprovePaymentButtonProps {
  paymentId: string;
  orderId: string;
}

export default function ApprovePaymentButton({
  paymentId,
  orderId,
}: ApprovePaymentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Error al aprobar el pago");
        return;
      }

      router.refresh();
    } catch (error) {
      alert("Error al aprobar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="flex-1" variant="default" disabled={loading}>
          <Check className="mr-2 h-4 w-4" />
          Aprobar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar pago recibido?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción marcará la orden como pagada y el cliente recibirá una
            confirmación. Asegúrate de haber verificado el comprobante de pago.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove} disabled={loading}>
            {loading ? "Aprobando..." : "Confirmar Aprobación"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}