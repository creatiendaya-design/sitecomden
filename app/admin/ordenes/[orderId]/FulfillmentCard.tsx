"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/actions/orders";
import {
  FULFILLMENT_STATUS_TRANSITIONS,
  FULFILLMENT_STATUS_LABELS,
  isTerminalFulfillmentStatus,
} from "@/lib/order-status-logic";

interface FulfillmentCardProps {
  orderId: string;
  currentFulfillmentStatus: string;
  currentTrackingNumber: string;
  currentShippingCourier: string;
}

export default function FulfillmentCard({
  orderId,
  currentFulfillmentStatus,
  currentTrackingNumber,
  currentShippingCourier,
}: FulfillmentCardProps) {
  const router = useRouter();
  const [fulfillmentStatus, setFulfillmentStatus] = useState(currentFulfillmentStatus);
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber);
  const [shippingCourier, setShippingCourier] = useState(currentShippingCourier);
  const [loading, setLoading] = useState(false);

  const allowedStatuses =
    FULFILLMENT_STATUS_TRANSITIONS[
      currentFulfillmentStatus as keyof typeof FULFILLMENT_STATUS_TRANSITIONS
    ] || [];

  const hasChanged =
    fulfillmentStatus !== currentFulfillmentStatus ||
    trackingNumber !== currentTrackingNumber ||
    shippingCourier !== currentShippingCourier;

  const handleSave = async () => {
    if (!hasChanged) return;
    setLoading(true);
    try {
      const result = await updateOrderStatus({
        orderId,
        fulfillmentStatus:
          fulfillmentStatus !== currentFulfillmentStatus
            ? (fulfillmentStatus as any)
            : undefined,
        trackingNumber:
          trackingNumber !== currentTrackingNumber ? trackingNumber : undefined,
        shippingCourier:
          shippingCourier !== currentShippingCourier ? shippingCourier : undefined,
      });
      if (result.success) {
        toast.success("Información de despacho actualizada");
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar el despacho");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Despacho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Estado actual</Label>
          <p className="font-medium">
            {FULFILLMENT_STATUS_LABELS[currentFulfillmentStatus as keyof typeof FULFILLMENT_STATUS_LABELS]}
          </p>
        </div>

        {isTerminalFulfillmentStatus(currentFulfillmentStatus as any) ? (
          <p className="text-sm text-muted-foreground">
            Estado final — no se puede modificar
          </p>
        ) : allowedStatuses.length > 0 ? (
          <div className="space-y-1">
            <Label className="text-xs">Cambiar estado</Label>
            <Select value={fulfillmentStatus} onValueChange={setFulfillmentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {FULFILLMENT_STATUS_LABELS[s as keyof typeof FULFILLMENT_STATUS_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1">
          <Label htmlFor="trackingNumber" className="text-xs">
            Número de tracking
          </Label>
          <Input
            id="trackingNumber"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Ej: OLVA123456"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="shippingCourier" className="text-xs">
            Courier
          </Label>
          <Input
            id="shippingCourier"
            value={shippingCourier}
            onChange={(e) => setShippingCourier(e.target.value)}
            placeholder="Ej: Olva Courier"
          />
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={handleSave}
          disabled={!hasChanged || loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Guardar envío
        </Button>
      </CardContent>
    </Card>
  );
}
