"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductPicker from "./ProductPicker";
import type { BundleConfig } from "@/lib/promotions/types";

interface BundleFormProps {
  excludeProductIds?: string[];
  value: BundleConfig;
  onChange: (next: BundleConfig) => void;
}

export default function BundleForm({ excludeProductIds, value, onChange }: BundleFormProps) {
  const isPercent = value.discountType === "PERCENT";

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Productos del combo</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Selecciona los productos que deben acompañar a este para activar el descuento.
        </p>
        <ProductPicker
          excludeProductIds={excludeProductIds}
          selectedIds={value.partnerProductIds}
          onChange={(ids) => onChange({ ...value, partnerProductIds: ids })}
          multi
        />
      </div>

      <div>
        <Label className="text-sm font-medium">Descuento del combo</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Se aplica al subtotal del bundle cuando el cliente añade todos los productos.
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={value.discountType}
            onValueChange={(v) =>
              onChange({ ...value, discountType: v as BundleConfig["discountType"] })
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
            className="h-9 w-32"
          />
          <span className="text-sm text-muted-foreground">
            {isPercent ? "%" : "S/."}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
        <Switch
          checked={value.requireAll}
          onCheckedChange={(checked) => onChange({ ...value, requireAll: checked })}
        />
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Requiere todos los productos</Label>
          <p className="text-xs text-muted-foreground">
            Si está activo, el descuento solo aplica si el carrito tiene este producto + todos los del combo.
            Si está desactivado, basta con que tenga al menos uno.
          </p>
        </div>
      </div>
    </div>
  );
}
