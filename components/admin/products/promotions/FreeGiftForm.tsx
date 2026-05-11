"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductPicker from "./ProductPicker";
import type { FreeGiftConfig } from "@/lib/promotions/types";

interface FreeGiftFormProps {
  excludeProductIds?: string[];
  value: FreeGiftConfig;
  onChange: (next: FreeGiftConfig) => void;
}

export default function FreeGiftForm({ excludeProductIds, value, onChange }: FreeGiftFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Subtotal mínimo (S/.)</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          El regalo se desbloquea cuando el carrito alcanza este monto.
        </p>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={value.minSubtotal}
          onChange={(e) =>
            onChange({ ...value, minSubtotal: Math.max(0, parseFloat(e.target.value) || 0) })
          }
          className="h-9 w-32"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">Producto de regalo</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Selecciona el producto que se entregará gratis al alcanzar el monto.
        </p>
        <ProductPicker
          excludeProductIds={excludeProductIds}
          selectedIds={value.giftProductId ? [value.giftProductId] : []}
          onChange={(ids) =>
            onChange({ ...value, giftProductId: ids[0] ?? "" })
          }
          multi={false}
        />
      </div>
    </div>
  );
}
