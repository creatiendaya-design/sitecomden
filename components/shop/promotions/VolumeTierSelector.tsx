"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TierDisplay } from "@/lib/promotions/storefront";

interface VolumeTierSelectorProps {
  tiers: TierDisplay[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Subtotal / Discount / Total summary visible when a tier with savings is
   *  selected. Pass null to hide the summary. */
  summary?: {
    subtotal: number;
    discount: number;
    total: number;
    shippingLabel?: string;
  } | null;
  title?: string;
}

export default function VolumeTierSelector({
  tiers,
  selectedIndex,
  onSelect,
  summary,
  title = "Elige tu pack",
}: VolumeTierSelectorProps) {
  if (tiers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-slate-900">{title}</div>

      <div className="space-y-2">
        {tiers.map((tier, idx) => {
          const isSelected = idx === selectedIndex;
          const hasDiscount = tier.totalPrice < tier.originalPrice;
          const badgeLabel = tier.badgeText;
          return (
            <button
              type="button"
              key={tier.index}
              onClick={() => onSelect(idx)}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-xl border-2 bg-white p-3 text-left transition-all",
                isSelected
                  ? "border-blue-500 bg-blue-50/40 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              {/* Badge */}
              {badgeLabel && (
                <span
                  className="absolute -top-2.5 right-4 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide shadow-sm"
                  style={{
                    backgroundColor: tier.badgeColor,
                    color: tier.badgeTextColor,
                  }}
                >
                  {badgeLabel}
                </span>
              )}

              {/* Radio indicator */}
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-blue-500 bg-blue-500"
                    : "border-slate-300 bg-white"
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </div>

              {/* Label + savings */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">
                    {tier.label}
                  </span>
                  {tier.savingsLabel && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor: tier.badgeColor,
                        color: tier.badgeTextColor,
                      }}
                    >
                      {tier.savingsLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Prices */}
              <div className="text-right shrink-0">
                <div className="text-base font-bold text-slate-900">
                  S/. {tier.totalPrice.toFixed(2)}
                </div>
                {hasDiscount && (
                  <div className="text-xs text-slate-400 line-through">
                    S/. {tier.originalPrice.toFixed(2)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {summary && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-700">Subtotal</span>
            <span className="font-semibold text-slate-900">
              S/. {summary.subtotal.toFixed(2)}
            </span>
          </div>
          {summary.discount > 0 && (
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-700">Descuento</span>
              <span className="font-semibold text-rose-600">
                -S/. {summary.discount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-700">Envío</span>
            <span className="font-semibold text-slate-900">
              {summary.shippingLabel ?? "Calculado en el checkout"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-blue-200 pt-2">
            <span className="text-base font-bold text-slate-900">Total</span>
            <span className="text-lg font-bold text-blue-600">
              S/. {summary.total.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
