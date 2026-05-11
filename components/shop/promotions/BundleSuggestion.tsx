"use client";

import Image from "next/image";
import { Plus, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BundleBreakdown } from "@/lib/promotions/storefront";

interface BundleSuggestionProps {
  promotionName: string;
  breakdown: BundleBreakdown;
  onAddBundle: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

export default function BundleSuggestion({
  promotionName,
  breakdown,
  onAddBundle,
  loading,
  disabled,
}: BundleSuggestionProps) {
  if (breakdown.lines.length < 2) return null;

  const savingsPct =
    breakdown.subtotal > 0
      ? Math.round((breakdown.totalDiscount / breakdown.subtotal) * 100)
      : 0;

  return (
    <div className="rounded-xl border-2 border-purple-300 bg-purple-50/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Package className="h-4 w-4 text-purple-600" />
        <span>{promotionName}</span>
        {savingsPct > 0 && (
          <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            -{savingsPct}%
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Compra estos productos juntos y ahorra{" "}
        <span className="font-semibold text-purple-700">
          S/. {breakdown.totalDiscount.toFixed(2)}
        </span>
        .
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {breakdown.lines.map((line, idx) => (
          <div key={line.productId} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-white">
                {line.image ? (
                  <Image
                    src={line.image}
                    alt={line.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                    sin img
                  </div>
                )}
              </div>
              <div className="max-w-[80px] text-center">
                <p className="truncate text-[11px] font-medium text-slate-900">
                  {line.name}
                </p>
                <p className="text-[11px] font-semibold text-purple-700">
                  S/. {line.finalUnitPrice.toFixed(2)}
                </p>
                {line.discountPerUnit > 0 && (
                  <p className="text-[10px] text-slate-400 line-through">
                    S/. {line.unitPrice.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            {idx < breakdown.lines.length - 1 && (
              <Plus className="h-4 w-4 shrink-0 text-purple-500" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-white p-3 shadow-sm">
        <div>
          <div className="text-xs text-muted-foreground">Total combo</div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-purple-700">
              S/. {breakdown.total.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 line-through">
              S/. {breakdown.subtotal.toFixed(2)}
            </span>
          </div>
        </div>
        <Button
          type="button"
          onClick={onAddBundle}
          disabled={disabled || loading}
          className={cn("bg-purple-600 hover:bg-purple-700")}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Agregar combo
        </Button>
      </div>
    </div>
  );
}
