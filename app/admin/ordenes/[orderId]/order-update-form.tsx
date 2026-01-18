"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { updateOrderStatus } from "@/actions/orders";
import {
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS_TRANSITIONS,
  FULFILLMENT_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
  canCancelOrder,
  canRefundPayment,
  canMarkPaymentAsFailed,
  isTerminalOrderStatus,
  isTerminalPaymentStatus,
  isTerminalFulfillmentStatus,
} from "@/lib/order-status-logic";

interface OrderUpdateFormProps {
  orderId: string;
  currentStatus: string;
  currentPaymentStatus: string;
  currentFulfillmentStatus: string;
  currentTrackingNumber: string;
  currentShippingCourier: string;
  currentAdminNotes: string;
}

export default function OrderUpdateForm({
  orderId,
  currentStatus,
  currentPaymentStatus,
  currentFulfillmentStatus,
  currentTrackingNumber,
  currentShippingCourier,
  currentAdminNotes,
}: OrderUpdateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Estados del formulario
  const [status, setStatus] = useState(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus);
  const [fulfillmentStatus, setFulfillmentStatus] = useState(currentFulfillmentStatus);
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber);
  const [shippingCourier, setShippingCourier] = useState(currentShippingCourier);
  const [adminNotes, setAdminNotes] = useState(currentAdminNotes);

  // Modales de confirmación
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [failedDialogOpen, setFailedDialogOpen] = useState(false);

  // Obtener transiciones permitidas
  const allowedOrderStatuses = ORDER_STATUS_TRANSITIONS[currentStatus as keyof typeof ORDER_STATUS_TRANSITIONS] || [];
  const allowedPaymentStatuses = PAYMENT_STATUS_TRANSITIONS[currentPaymentStatus as keyof typeof PAYMENT_STATUS_TRANSITIONS] || [];
  const allowedFulfillmentStatuses = FULFILLMENT_STATUS_TRANSITIONS[currentFulfillmentStatus as keyof typeof FULFILLMENT_STATUS_TRANSITIONS] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await updateOrderStatus({
      orderId,
      status: status !== currentStatus ? (status as any) : undefined,
      paymentStatus: paymentStatus !== currentPaymentStatus ? (paymentStatus as any) : undefined,
      fulfillmentStatus: fulfillmentStatus !== currentFulfillmentStatus ? (fulfillmentStatus as any) : undefined,
      trackingNumber: trackingNumber !== currentTrackingNumber ? trackingNumber : undefined,
      shippingCourier: shippingCourier !== currentShippingCourier ? shippingCourier : undefined,
      adminNotes: adminNotes !== currentAdminNotes ? adminNotes : undefined,
    });

    if (result.success) {
      toast.success("Estado actualizado correctamente");
      router.refresh();
    } else {
      toast.error(result.error || "Error al actualizar");
    }

    setLoading(false);
  };

  const handleCancelOrder = async () => {
    setLoading(true);
    setCancelDialogOpen(false);

    const result = await updateOrderStatus({
      orderId,
      status: "CANCELLED",
      adminNotes: adminNotes || "Orden cancelada por el administrador",
    });

    if (result.success) {
      toast.success("Orden cancelada. Se envió email al cliente.");
      router.refresh();
    } else {
      toast.error(result.error || "Error al cancelar");
    }

    setLoading(false);
  };

  const handleRefundPayment = async () => {
    setLoading(true);
    setRefundDialogOpen(false);

    const result = await updateOrderStatus({
      orderId,
      paymentStatus: "REFUNDED",
      adminNotes: adminNotes || "Reembolso procesado",
    });

    if (result.success) {
      toast.success("Reembolso procesado. Se envió email al cliente.");
      router.refresh();
    } else {
      toast.error(result.error || "Error al procesar reembolso");
    }

    setLoading(false);
  };

  const handleMarkAsFailed = async () => {
    setLoading(true);
    setFailedDialogOpen(false);

    const result = await updateOrderStatus({
      orderId,
      paymentStatus: "FAILED",
      adminNotes: adminNotes || "Pago marcado como fallido",
    });

    if (result.success) {
      toast.success("Pago marcado como fallido. Se envió email al cliente.");
      router.refresh();
    } else {
      toast.error(result.error || "Error al marcar como fallido");
    }

    setLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Estado de Orden */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📦 Estado de Orden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Actual:</Label>
              <p className="font-medium">{ORDER_STATUS_LABELS[currentStatus as keyof typeof ORDER_STATUS_LABELS]}</p>
            </div>

            {!isTerminalOrderStatus(currentStatus as any) && allowedOrderStatuses.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="status">Cambiar a:</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedOrderStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ORDER_STATUS_LABELS[s as keyof typeof ORDER_STATUS_LABELS]} →
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isTerminalOrderStatus(currentStatus as any) && (
              <p className="text-sm text-muted-foreground">
                ✓ Estado final - No se puede modificar
              </p>
            )}

            {/* Botón Cancelar Orden */}
            {canCancelOrder(currentStatus as any) && (
              <div className="pt-4 border-t">
                <Label className="text-xs text-amber-600">⚠️ Acciones Especiales:</Label>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={loading}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Cancelar Orden
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado de Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💳 Estado de Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Actual:</Label>
              <p className="font-medium">{PAYMENT_STATUS_LABELS[currentPaymentStatus as keyof typeof PAYMENT_STATUS_LABELS]}</p>
            </div>

            {!isTerminalPaymentStatus(currentPaymentStatus as any) && allowedPaymentStatuses.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Cambiar a:</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedPaymentStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PAYMENT_STATUS_LABELS[s as keyof typeof PAYMENT_STATUS_LABELS]} →
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isTerminalPaymentStatus(currentPaymentStatus as any) && (
              <p className="text-sm text-muted-foreground">
                ✓ Estado final - No se puede modificar
              </p>
            )}

            {/* Botones especiales de pago */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-xs text-amber-600">⚠️ Acciones Especiales:</Label>
              
              {canRefundPayment(currentPaymentStatus as any) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => setRefundDialogOpen(true)}
                  disabled={loading}
                >
                  Procesar Reembolso
                </Button>
              )}

              {canMarkPaymentAsFailed(currentPaymentStatus as any) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => setFailedDialogOpen(true)}
                  disabled={loading}
                >
                  Marcar como Fallido
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Estado de Despacho */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📮 Estado de Despacho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Actual:</Label>
              <p className="font-medium">{FULFILLMENT_STATUS_LABELS[currentFulfillmentStatus as keyof typeof FULFILLMENT_STATUS_LABELS]}</p>
            </div>

            {!isTerminalFulfillmentStatus(currentFulfillmentStatus as any) && allowedFulfillmentStatuses.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="fulfillmentStatus">Cambiar a:</Label>
                <Select value={fulfillmentStatus} onValueChange={setFulfillmentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedFulfillmentStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {FULFILLMENT_STATUS_LABELS[s as keyof typeof FULFILLMENT_STATUS_LABELS]} →
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isTerminalFulfillmentStatus(currentFulfillmentStatus as any) && (
              <p className="text-sm text-muted-foreground">
                ✓ Estado final - No se puede modificar
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tracking y Notas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📝 Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Número de Tracking</Label>
              <Input
                id="trackingNumber"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ej: TRACK123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingCourier">Courier</Label>
              <Input
                id="shippingCourier"
                value={shippingCourier}
                onChange={(e) => setShippingCourier(e.target.value)}
                placeholder="Ej: Olva Courier"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminNotes">Notas Internas</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notas visibles solo para el equipo"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Actualizando...
            </>
          ) : (
            "Guardar Cambios"
          )}
        </Button>
      </form>

      {/* Modal: Cancelar Orden */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción enviará un email de notificación al cliente informando que su orden fue cancelada.
              {currentPaymentStatus === "PAID" && (
                <span className="block mt-2 text-amber-600 font-medium">
                  ⚠️ Esta orden ya fue pagada. Considera procesar un reembolso.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener orden</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelOrder} className="bg-red-600">
              Sí, cancelar orden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Procesar Reembolso */}
      <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Procesar reembolso?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un email al cliente notificando que el reembolso ha sido procesado.
              El dinero será devuelto en 5-7 días hábiles dependiendo del método de pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefundPayment}>
              Confirmar Reembolso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Marcar como Fallido */}
      <AlertDialog open={failedDialogOpen} onOpenChange={setFailedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar pago como fallido?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un email al cliente notificando que el pago no pudo ser procesado
              y sugiriendo que intente con otro método de pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsFailed} className="bg-red-600">
              Marcar como Fallido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}