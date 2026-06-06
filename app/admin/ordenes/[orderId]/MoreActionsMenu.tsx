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
import { refundOrder } from "@/actions/refunds";
import {
  canCancelOrder,
  canRefundPayment,
  canMarkPaymentAsFailed,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/order-status-logic";

interface MoreActionsMenuProps {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
}

export default function MoreActionsMenu({
  orderId,
  orderStatus,
  paymentStatus,
  paymentMethod,
}: MoreActionsMenuProps) {
  const isMercadoPago = paymentMethod === "MERCADOPAGO";
  const router = useRouter();
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [failedLoading, setFailedLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);

  const showCancel = canCancelOrder(orderStatus as OrderStatus);
  const showRefund = canRefundPayment(paymentStatus as PaymentStatus);
  const showFailed = canMarkPaymentAsFailed(paymentStatus as PaymentStatus);

  if (!showCancel && !showRefund && !showFailed) return null;

  const handleCancelOrder = async () => {
    setCancelLoading(true);
    setCancelOpen(false);
    try {
      const result = await updateOrderStatus({ orderId, status: "CANCELLED" });
      if (result.success) {
        toast.success("Orden cancelada. Se envió email al cliente.");
        router.refresh();
      } else {
        toast.error(result.error || "Error al cancelar la orden");
      }
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRefundPayment = async () => {
    setRefundLoading(true);
    setRefundOpen(false);
    try {
      const result = await refundOrder({ orderId });
      if (result.success) {
        toast.success(
          result.automatic
            ? "Reembolso procesado en MercadoPago. Se devolvió el dinero, se repuso el stock y se notificó al cliente."
            : "Reembolso registrado (stock y puntos ajustados). Recuerda devolver el dinero manualmente en la pasarela."
        );
        router.refresh();
      } else {
        toast.error(result.error || "Error al procesar el reembolso");
      }
    } finally {
      setRefundLoading(false);
    }
  };

  const handleMarkAsFailed = async () => {
    setFailedLoading(true);
    setFailedOpen(false);
    try {
      const result = await updateOrderStatus({ orderId, paymentStatus: "FAILED" as PaymentStatus });
      if (result.success) {
        toast.success("Pago marcado como fallido. Se envió email al cliente.");
        router.refresh();
      } else {
        toast.error(result.error || "Error al marcar como fallido");
      }
    } finally {
      setFailedLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={cancelLoading || refundLoading || failedLoading}>
            {(cancelLoading || refundLoading || failedLoading) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
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
            <AlertDialogTitle>¿Procesar reembolso total?</AlertDialogTitle>
            <AlertDialogDescription>
              {isMercadoPago ? (
                <>
                  Se devolverá el <strong>monto total</strong> al cliente vía MercadoPago,
                  se repondrá el stock al inventario, se revertirán sus puntos y se le
                  enviará un correo. Esta acción no se puede deshacer.
                </>
              ) : (
                <>
                  Se marcará la orden como reembolsada, se repondrá el stock, se
                  revertirán los puntos y se notificará al cliente.{" "}
                  <span className="font-medium text-amber-600">
                    El reembolso automático aún no está disponible para este método: debes
                    devolver el dinero manualmente en la pasarela.
                  </span>
                </>
              )}
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
