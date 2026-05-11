"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCartFreeGifts } from "@/actions/cart-promotions";
import { computeFreeGiftProgress } from "@/lib/promotions/storefront";
import type { CartFreeGiftPromotion } from "@/lib/promotions/server";

interface CartFreeGiftsPreviewProps {
  productIds: string[];
  subtotal: number;
}

export default function CartFreeGiftsPreview({
  productIds,
  subtotal,
}: CartFreeGiftsPreviewProps) {
  const [promos, setPromos] = useState<CartFreeGiftPromotion[]>([]);
  const key = productIds.slice().sort().join(",");

  useEffect(() => {
    if (productIds.length === 0) {
      setPromos([]);
      return;
    }
    let cancelled = false;
    getCartFreeGifts(productIds)
      .then((data) => {
        if (!cancelled) setPromos(data);
      })
      .catch(() => {
        if (!cancelled) setPromos([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (promos.length === 0) return null;

  return (
    <div className="space-y-2">
      {promos.map((promo) => {
        const progress = computeFreeGiftProgress(subtotal, promo.config);
        return (
          <FreeGiftRow
            key={promo.promotionId}
            name={promo.name}
            giftProduct={promo.giftProduct}
            qualified={progress.qualified}
            progressPct={Math.round(progress.progress * 100)}
            remaining={progress.remaining}
            minSubtotal={progress.minSubtotal}
          />
        );
      })}
    </div>
  );
}

interface FreeGiftRowProps {
  name: string;
  giftProduct: CartFreeGiftPromotion["giftProduct"];
  qualified: boolean;
  progressPct: number;
  remaining: number;
  minSubtotal: number;
}

function FreeGiftRow({
  name,
  giftProduct,
  qualified,
  progressPct,
  remaining,
  minSubtotal,
}: FreeGiftRowProps) {
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
                ! Se incluye al confirmar el pedido.
              </>
            ) : (
              <>
                Te falta{" "}
                <span className="text-amber-700">
                  S/. {remaining.toFixed(2)}
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
          {name && (
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {name}
            </div>
          )}

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className={cn(
                "h-full transition-[width] duration-300",
                qualified ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>S/. 0</span>
            <span>{progressPct}%</span>
            <span>S/. {minSubtotal.toFixed(2)}</span>
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
