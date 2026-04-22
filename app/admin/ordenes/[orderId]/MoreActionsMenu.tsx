"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/actions/orders";
import {
  canCancelOrder,
  canRefundPayment,
  canMarkPaymentAsFailed,
} from "@/lib/order-status-logic";

interface MoreActionsMenuProps {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
}

export default function MoreActionsMenu({
  orderId,
  orderStatus,
  paymentStatus,
}: MoreActionsMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);

  const showCancel = canCancelOrder(orderStatus as any);
  const showRefund = canRefundPayment(paymentStatus as any);
  const showFailed = canMarkPaymentAsFailed(paymentStatus as any);

  if (!showCancel && !showRefund && !showFailed) return null;

  const handleCancelOrder = async () => {
    setLoading(true);
    setCancelOpen(false);
    try {
      const result = await updateOrderStatus({ orderId, status: "CANCELLED" as any });
      if (result.success) {
        toast.success("Orden cancelada. Se envió email al cliente.");
        router.refresh();
      } else {
        toast.error(result.error || "Error al cancelar la orden");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefundPayment = async () => {
    setLoading(true);
    setRefundOpen(false);
    try {
      const result = await updateOrderStatus({ orderId, paymentStatus: "REFUNDED" as any });
      if (result.success) {
        toast.success("Reembolso procesado. Se envió email al cliente.");
        router.refresh();
      } else {
        toast.error(result.error || "Error al procesar el reembolso");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsFailed = async () => {
    setLoading(true);
    setFailedOpen(false);
    try {
      const result = await updateOrderStatus({ orderId, paymentStatus: "FAILED" as any });
      if (result.success) {
        toast.success("Pago marcado como fallido. Se envió email al cliente.");
        router.refresh();
      } else {
        toast.error(result.error || "Error al marcar como fallido");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Más acciones
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showCancel && (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={() => setCancelOpen(true)}
            >
              Cancelar orden
            </DropdownMenuItem>
          )}
          {showRefund && (
            <DropdownMenuItem
              className="text-amber-600 focus:text-amber-600 focus:bg-amber-50"
              onClick={() => setRefundOpen(true)}
            >
              Procesar reembolso
            </DropdownMenuItem>
          )}
          {showFailed && (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={() => setFailedOpen(true)}
            >
              Marcar pago como fallido
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un email de notificación al cliente.
              {paymentStatus === "PAID" && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Esta orden ya fue pagada. Considera procesar un reembolso primero.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, cancelar orden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Procesar reembolso?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un email al cliente. El dinero será devuelto en 5-7 días hábiles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefundPayment}>
              Confirmar reembolso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={failedOpen} onOpenChange={setFailedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar pago como fallido?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un email al cliente sugiriendo intentar con otro método de pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsFailed}
              className="bg-red-600 hover:bg-red-700"
            >
              Marcar como fallido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
