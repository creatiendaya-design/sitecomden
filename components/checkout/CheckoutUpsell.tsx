"use client";

/**
 * Upsell strip shown in the checkout order summary, below the product list.
 * Adds products to the cart store BEFORE the order is created, so the summary
 * (subtotal / IGV / total) recalculates live. Variant products link to their
 * page instead of adding directly (an option must be chosen).
 */

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";
import type { RecommendationCard } from "@/actions/recommendations";

export default function CheckoutUpsell({
  recs,
}: {
  recs: RecommendationCard[];
}) {
  const addItem = useCartStore((s) => s.addItem);

  if (recs.length === 0) return null;

  const handleAdd = (rec: RecommendationCard) => {
    const ok = addItem(
      {
        id: rec.id,
        productId: rec.id,
        slug: rec.slug,
        name: rec.name,
        price: rec.price,
        originalUnitPrice: rec.price,
        image: rec.mainImage ?? undefined,
        maxStock: rec.stock,
      },
      1,
    );
    if (ok) toast.success("Agregado a tu pedido");
    else toast.error("No hay más stock disponible");
  };

  return (
    <div className="mt-2">
      <p className="mb-2 px-1 text-sm font-semibold">Agrega algo más</p>
      <div className="space-y-2">
        {recs.map((rec) => (
          <div
            key={rec.id}
            className="flex items-center gap-2 rounded-lg border p-2"
          >
            <Link
              href={`/productos/${rec.slug}`}
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100"
            >
              {rec.mainImage ? (
                <Image
                  src={rec.mainImage}
                  alt={rec.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : null}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/productos/${rec.slug}`}
                className="line-clamp-1 text-xs font-medium hover:underline"
              >
                {rec.name}
              </Link>
              <p className="text-xs font-semibold">{formatPrice(rec.price)}</p>
            </div>
            {rec.hasVariants ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/productos/${rec.slug}`}>Ver</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAdd(rec)}
                disabled={!rec.inStock}
                aria-label={`Agregar ${rec.name}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
