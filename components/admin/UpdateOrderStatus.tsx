"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface UpdateOrderStatusProps {
  orderId: string;
  currentStatus: string;
}

export default function UpdateOrderStatus({
  orderId,
  currentStatus,
}: UpdateOrderStatusProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (status === currentStatus) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al actualizar estado");
        return;
      }

      router.refresh();
    } catch (err) {
      setError("Error al actualizar estado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actualizar Estado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pendiente</SelectItem>
            <SelectItem value="PAID">Pagado</SelectItem>
            <SelectItem value="PROCESSING">Procesando</SelectItem>
            <SelectItem value="SHIPPED">Enviado</SelectItem>
            <SelectItem value="DELIVERED">Entregado</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={handleUpdate}
          className="w-full"
          disabled={loading || status === currentStatus}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Actualizando...
            </>
          ) : (
            "Actualizar Estado"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}