"use client";

import { useState, useEffect } from "react";
import {
  getShippingOptionsForCheckout,
  type ShippingGroup,
  type ShippingRate,
} from "@/actions/shipping-checkout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Truck, Clock, MapPin, AlertCircle } from "lucide-react";

interface ShippingOptionsProps {
  districtCode: string;
  subtotal: number;
  onSelect: (rate: ShippingRate | null) => void;
  selectedRateId?: string | null;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

export function ShippingOptions({
  districtCode,
  subtotal,
  onSelect,
  selectedRateId,
}: ShippingOptionsProps) {
  const [groups, setGroups] = useState<ShippingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState<string>("");

  // Cargar opciones cuando cambia distrito o subtotal
  useEffect(() => {
    loadShippingOptions();
  }, [districtCode, subtotal]);

  const loadShippingOptions = async () => {
    if (!districtCode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getShippingOptionsForCheckout(districtCode, subtotal);

    if (!result.success) {
      setError(result.error || "Error al cargar opciones de envío");
      setGroups([]);
      setLoading(false);
      return;
    }

    setGroups(result.data);
    setZoneName(result.zone?.name || "");
    setLoading(false);

    // Si solo hay una opción, seleccionarla automáticamente
    if (result.data.length === 1 && result.data[0].rates.length === 1) {
      const singleRate = result.data[0].rates[0];
      onSelect(singleRate);
    }
  };

  const handleSelectRate = (rateId: string) => {
    // Buscar la tarifa seleccionada en todos los grupos
    for (const group of groups) {
      const rate = group.rates.find((r) => r.id === rateId);
      if (rate) {
        onSelect(rate);
        return;
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Calculando opciones de envío...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!districtCode) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Ingresa tu dirección</h3>
            <p className="text-sm text-muted-foreground">
              Completa tu dirección de entrega para ver las opciones de envío
              disponibles
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">
              No hay opciones de envío disponibles
            </h3>
            <p className="text-sm text-muted-foreground">
              Por favor verifica tu dirección o monto del pedido
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Método de Envío
        </CardTitle>
        {zoneName && (
          <CardDescription>
            Zona de entrega: <span className="font-medium">{zoneName}</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedRateId || ""} onValueChange={handleSelectRate}>
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id} className="space-y-3">
                {/* Nombre del Grupo */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    {group.name}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Tarifas del Grupo */}
                {group.rates.map((rate) => (
                  <label
                    key={rate.id}
                    htmlFor={rate.id}
                    className={`relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedRateId === rate.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={rate.id} id={rate.id} className="mt-1" />
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        {rate.name}
                        {rate.isFree && (
                          <Badge variant="default" className="bg-green-600">
                            GRATIS
                          </Badge>
                        )}
                      </div>

                      {rate.description && (
                        <p className="text-sm text-muted-foreground">
                          {rate.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 pt-1">
                        {/* Tiempo de entrega */}
                        {rate.estimatedDays && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{rate.estimatedDays}</span>
                          </div>
                        )}

                        {/* Ventana horaria */}
                        {rate.timeWindow && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Horario: {rate.timeWindow}</span>
                          </div>
                        )}

                        {/* Courier */}
                        {rate.carrier && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            <span>{rate.carrier}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Precio */}
                    <div className="text-right">
                      {rate.isFree ? (
                        <div>
                          <p className="text-lg font-bold text-green-600">
                            GRATIS
                          </p>
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPrice(rate.baseCost)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-lg font-bold">
                          {formatPrice(rate.finalCost)}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </RadioGroup>

        {/* Info de envío gratis */}
        {groups.some((g) =>
          g.rates.some((r) => r.minOrderAmount && subtotal < r.minOrderAmount)
        ) && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>¡Casi!</strong> Agrega{" "}
              {formatPrice(
                Math.min(
                  ...groups.flatMap((g) =>
                    g.rates
                      .filter((r) => r.minOrderAmount && subtotal < r.minOrderAmount!)
                      .map((r) => r.minOrderAmount! - subtotal)
                  )
                )
              )}{" "}
              más para desbloquear más opciones de envío.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}