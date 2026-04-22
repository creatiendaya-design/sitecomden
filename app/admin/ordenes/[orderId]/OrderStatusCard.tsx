"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/actions/orders";
import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  isTerminalOrderStatus,
} from "@/lib/order-status-logic";

interface OrderStatusCardProps {
  orderId: string;
  currentStatus: string;
}

export default function OrderStatusCard({
  orderId,
  currentStatus,
}: OrderStatusCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const allowedStatuses =
    ORDER_STATUS_TRANSITIONS[
      currentStatus as keyof typeof ORDER_STATUS_TRANSITIONS
    ] || [];
  const hasChanged = status !== currentStatus;

  const handleSave = async () => {
    if (!hasChanged) return;
    setLoading(true);
    try {
      const result = await updateOrderStatus({ orderId, status: status as any });
      if (result.success) {
        toast.success("Estado de orden actualizado");
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar el estado");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Estado de la orden</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Actual</Label>
          <p className="font-medium">
            {ORDER_STATUS_LABELS[currentStatus as keyof typeof ORDER_STATUS_LABELS]}
          </p>
        </div>

        {isTerminalOrderStatus(currentStatus as any) ? (
          <p className="text-sm text-muted-foreground">
            Estado final — no se puede modificar
          </p>
        ) : allowedStatuses.length > 0 ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Cambiar a</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ORDER_STATUS_LABELS[s as keyof typeof ORDER_STATUS_LABELS]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={handleSave}
              disabled={!hasChanged || loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Actualizar estado
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
