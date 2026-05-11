"use client";

import { Gift, Mail, Package, Trophy } from "lucide-react";
import type { ProductPromotionType } from "@prisma/client";
import { promotionTypeLabels } from "@/lib/promotions/types";

interface Option {
  type: ProductPromotionType;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const OPTIONS: Option[] = [
  {
    type: "VOLUME",
    description: "Tiers por cantidad: 2 unidades 20%, 3 unidades 30%…",
    icon: Trophy,
  },
  {
    type: "SUBSCRIPTION",
    description: "Descuento al suscribirse al newsletter",
    icon: Mail,
  },
  {
    type: "FREE_GIFT",
    description: "Regalo gratis al alcanzar un monto",
    icon: Gift,
  },
  {
    type: "BUNDLE",
    description: "Combo: compra X + Y con descuento",
    icon: Package,
  },
];

interface PromotionTypePickerProps {
  disabledTypes?: ProductPromotionType[];
  onPick: (type: ProductPromotionType) => void;
}

export default function PromotionTypePicker({
  disabledTypes = [],
  onPick,
}: PromotionTypePickerProps) {
  return (
    <div className="grid gap-2">
      {OPTIONS.map(({ type, description, icon: Icon }) => {
        const disabled = disabledTypes.includes(type);
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onPick(type)}
            className="group flex items-start gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium leading-tight">
                {promotionTypeLabels[type]}
                {disabled && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (ya configurada)
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
