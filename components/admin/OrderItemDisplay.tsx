"use client";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface OrderItemDisplayProps {
  item: {
    id: string;
    name: string;
    variantName?: string | null;
    price: number;
    quantity: number;
    image?: string | null;
    sku?: string | null;
    // Relaciones que pueden ser null si producto fue eliminado
    product?: {
      id: string;
      slug: string;
      name: string;
    } | null;
    variant?: {
      id: string;
      sku: string;
    } | null;
  };
  showLink?: boolean;
}

export default function OrderItemDisplay({ 
  item, 
  showLink = true 
}: OrderItemDisplayProps) {
  const productExists = !!item.product;
  const total = item.price * item.quantity;

  return (
    <div className="flex gap-4 rounded-lg border p-4">
      {/* Imagen */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            {/* Nombre del producto */}
            {productExists && showLink && item.product ? (
              <Link
                href={`/productos/${item.product.slug}`}
                target="_blank"
                className="font-semibold hover:underline inline-flex items-center gap-1"
              >
                {item.name}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold">{item.name}</p>
                {!productExists && (
                  <Badge variant="secondary" className="text-xs">
                    Producto eliminado
                  </Badge>
                )}
              </div>
            )}

            {/* Variante */}
            {item.variantName && (
              <p className="text-sm text-muted-foreground">
                {item.variantName}
              </p>
            )}

            {/* SKU */}
            {item.sku && (
              <p className="text-xs text-muted-foreground">
                SKU: {item.sku}
              </p>
            )}
          </div>

          {/* Precio unitario y cantidad */}
          <div className="text-right">
            <p className="font-semibold">
              {formatPrice(item.price)}
            </p>
            <p className="text-sm text-muted-foreground">
              Cantidad: {item.quantity}
            </p>
          </div>
        </div>

        {/* Total del item */}
        <div className="flex justify-between border-t pt-2">
          <span className="text-sm text-muted-foreground">Subtotal:</span>
          <span className="font-semibold">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}