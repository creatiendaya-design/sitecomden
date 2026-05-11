"use client";

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { CartItem } from "@/store/cart";

interface Props {
  item: CartItem;
}

export function CustomDesignBadge({ item }: Props) {
  if (!item.customDesignId) return null;

  if (item.customDesignBroken) {
    return (
      <div className="text-xs flex items-center gap-1 text-red-600 mt-1">
        <AlertTriangle className="size-3" />
        El diseño expiró ·{" "}
        <Link
          href={`/productos/${item.slug}/personalizar`}
          className="underline"
        >
          Re-personalizar
        </Link>
      </div>
    );
  }

  return (
    <div className="text-xs flex items-center gap-1 text-blue-600 mt-1">
      <Sparkles className="size-3" />
      Personalizado ·{" "}
      <Link
        href={`/productos/${item.slug}/personalizar?cartItemId=${encodeURIComponent(item.id)}`}
        className="underline"
      >
        Editar diseño
      </Link>
    </div>
  );
}
