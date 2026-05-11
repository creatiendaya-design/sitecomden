"use client";

import Image from "next/image";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FreeGiftProductSummary } from "@/lib/promotions/types";
import type { FreeGiftProgress as Progress } from "@/lib/promotions/storefront";

interface FreeGiftProgressProps {
  giftProduct: FreeGiftProductSummary | null | undefined;
  progress: Progress;
}

export default function FreeGiftProgress({ giftProduct, progress }: FreeGiftProgressProps) {
  const percent = Math.round(progress.progress * 100);
  const qualified = progress.qualified;

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-3 transition-colors",
        qualified
          ? "border-emerald-400 bg-emerald-50"
          : "border-amber-300 bg-amber-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            qualified ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"
          )}
        >
          <Gift className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">
            {qualified ? (
              <>
                ¡Llévate gratis{" "}
                <span className="text-emerald-700">
                  {giftProduct?.name ?? "tu regalo"}
                </span>
                !
              </>
            ) : (
              <>
                Te falta{" "}
                <span className="text-amber-700">
                  S/. {progress.remaining.toFixed(2)}
                </span>{" "}
                para tu regalo
                {giftProduct ? (
                  <>
                    : <span className="text-slate-700">{giftProduct.name}</span>
                  </>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className={cn(
                "h-full transition-[width] duration-300",
                qualified ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>S/. 0</span>
            <span>{percent}%</span>
            <span>S/. {progress.minSubtotal.toFixed(2)}</span>
          </div>
        </div>

        {giftProduct?.image && (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-white">
            <Image
              src={giftProduct.image}
              alt={giftProduct.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
      </div>
    </div>
  );
}
