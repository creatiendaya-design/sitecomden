// components/shop/StartCustomizingButton.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { t } from "@/lib/customizer/i18n";

interface StartCustomizingButtonProps {
  productSlug: string;
  variantId: string | null;
  surcharge: number | null;
  basePrice: number;
}

export function StartCustomizingButton({
  productSlug,
  variantId,
  surcharge,
  basePrice,
}: StartCustomizingButtonProps) {
  const href = variantId
    ? `/productos/${productSlug}/personalizar?variantId=${variantId}`
    : `/productos/${productSlug}/personalizar`;

  return (
    <div className="space-y-2">
      <Button
        asChild
        size="lg"
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        <Link href={href}>
          <Sparkles className="size-4 mr-2" />
          {t.startCustomizing}
        </Link>
      </Button>
      {surcharge && surcharge > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          S/ {basePrice.toFixed(2)} + S/ {surcharge.toFixed(2)}{" "}
          {t.surchargeLabel}
        </p>
      )}
      <p className="text-xs text-center text-muted-foreground italic">
        {t.startCustomizingHint}
      </p>
    </div>
  );
}
