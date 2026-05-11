"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubscriptionConfig } from "@/lib/promotions/types";

interface SubscriptionFormProps {
  value: SubscriptionConfig;
  onChange: (next: SubscriptionConfig) => void;
}

export default function SubscriptionForm({ value, onChange }: SubscriptionFormProps) {
  const isPercent = value.discountType === "PERCENT";

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Descuento</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Se aplica cuando el cliente marca el checkbox y proporciona un email válido.
          Puede ser porcentaje (%) o monto fijo (S/.).
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={value.discountType}
            onValueChange={(v) =>
              onChange({ ...value, discountType: v as SubscriptionConfig["discountType"] })
            }
          >
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT">%</SelectItem>
              <SelectItem value="FIXED">S/.</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            max={isPercent ? 100 : undefined}
            step={isPercent ? 1 : 0.01}
            value={value.discountValue}
            onChange={(e) => {
              const raw = parseFloat(e.target.value) || 0;
              const clamped = isPercent
                ? Math.min(100, Math.max(0, raw))
                : Math.max(0, raw);
              onChange({ ...value, discountValue: clamped });
            }}
            className="h-9 flex-1"
          />
          <span className="text-sm text-muted-foreground">
            {isPercent ? "%" : "S/."}
          </span>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Texto del CTA (opcional)</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Cómo se muestra el checkbox al cliente. Si lo dejas vacío, usaremos el texto por defecto.
        </p>
        <Input
          value={value.ctaLabel ?? ""}
          placeholder={
            isPercent
              ? `Suscríbete y obtén ${value.discountValue}% de descuento`
              : `Suscríbete y obtén S/ ${value.discountValue.toFixed(2)} de descuento`
          }
          onChange={(e) => onChange({ ...value, ctaLabel: e.target.value || null })}
          className="h-9"
        />
      </div>

      <div className="rounded-md border bg-blue-50 p-3 text-xs text-blue-800">
        <strong>Cómo funciona:</strong> al confirmar el pedido, el email se inscribirá
        automáticamente en <code className="rounded bg-blue-100 px-1 py-0.5">NewsletterSubscriber</code>.
        El cliente recibirá los correos de marketing.
      </div>
    </div>
  );
}
