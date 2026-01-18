"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Loader2 } from "lucide-react";

interface MarkAsShippedProps {
  orderId: string;
  orderNumber: string;
  isShipped: boolean;
}

export default function MarkAsShipped({
  orderId,
  orderNumber,
  isShipped,
}: MarkAsShippedProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    trackingNumber: "",
    shippingCourier: "",
    estimatedDelivery: "",
  });

  if (isShipped) {
    return null; // No mostrar si ya está enviado
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/orders/mark-shipped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al marcar como enviada");
        return;
      }

      router.refresh();
    } catch (err) {
      setError("Error al marcar como enviada");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Marcar como Enviada
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="trackingNumber">Número de Tracking</Label>
            <Input
              id="trackingNumber"
              value={formData.trackingNumber}
              onChange={(e) =>
                setFormData({ ...formData, trackingNumber: e.target.value })
              }
              placeholder="Ej: OC123456789"
            />
          </div>

          <div>
            <Label htmlFor="shippingCourier">Courier</Label>
            <Input
              id="shippingCourier"
              value={formData.shippingCourier}
              onChange={(e) =>
                setFormData({ ...formData, shippingCourier: e.target.value })
              }
              placeholder="Ej: Olva Courier"
            />
          </div>

          <div>
            <Label htmlFor="estimatedDelivery">Fecha Estimada de Entrega</Label>
            <Input
              id="estimatedDelivery"
              type="date"
              value={formData.estimatedDelivery}
              onChange={(e) =>
                setFormData({ ...formData, estimatedDelivery: e.target.value })
              }
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Marcar como Enviada"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}