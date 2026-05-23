"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getShippingOptionsForCheckout,
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
import { formatPrice } from "@/lib/i18n/format";

interface ShippingOptionsProps {
  districtCode: string;
  subtotal: number;
  onSelect: (rate: ShippingRate | null) => void;
  selectedRateId?: string | null;
}

interface CategoryGroup {
  category: string | null;
  rates: ShippingRate[];
}

function groupByCategory(rates: ShippingRate[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();
  const order: string[] = [];

  for (const rate of rates) {
    const key = rate.category ?? "__none__";
    if (!groups.has(key)) {
      groups.set(key, { category: rate.category, rates: [] });
      order.push(key);
    }
    groups.get(key)!.rates.push(rate);
  }

  return order.map((k) => groups.get(k)!);
}

export function ShippingOptions({
  districtCode,
  subtotal,
  onSelect,
  selectedRateId,
}: ShippingOptionsProps) {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState<string>("");

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
      setRates([]);
      setLoading(false);
      return;
    }

    setRates(result.data);
    setZoneName(result.zone?.name || "");
    setLoading(false);

    if (result.data.length === 1) {
      onSelect(result.data[0]);
    }
  };

  const handleSelectRate = (rateId: string) => {
    const rate = rates.find((r) => r.id === rateId);
    if (rate) onSelect(rate);
  };

  const groups = useMemo(() => groupByCategory(rates), [rates]);
  const hasCategoriesToShow = groups.some((g) => g.category);

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
              Completa tu dirección de entrega para ver las opciones de envío disponibles
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No hay opciones de envío disponibles</h3>
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
          Método de envío
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
            {groups.map((group, idx) => (
              <div key={group.category ?? `none-${idx}`} className="space-y-3">
                {hasCategoriesToShow && group.category && (
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      {group.category}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}

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
                        {rate.estimatedDays && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{rate.estimatedDays}</span>
                          </div>
                        )}

                        {rate.timeWindow && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Horario: {rate.timeWindow}</span>
                          </div>
                        )}

                        {rate.carrier && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            <span>{rate.carrier}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {rate.isFree ? (
                        <div>
                          <p className="text-lg font-bold text-green-600">GRATIS</p>
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

        {rates.some((r) => r.minOrderAmount && subtotal < r.minOrderAmount) && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>¡Casi!</strong> Agrega{" "}
              {formatPrice(
                Math.min(
                  ...rates
                    .filter((r) => r.minOrderAmount && subtotal < r.minOrderAmount!)
                    .map((r) => r.minOrderAmount! - subtotal),
                ),
              )}{" "}
              más para desbloquear más opciones de envío.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
