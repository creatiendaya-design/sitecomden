"use client";

/**
 * General (non-COD) cart drawer. Slides in from the right when the header cart
 * button is clicked or a product is added to the cart in the STANDARD flow.
 * Hosts a "Completa tu compra" cross-sell widget driven by what's already in
 * the basket. The full /carrito page still exists ("Ver carrito").
 *
 * The COD landing flow keeps its own LandingCartDrawer — this one is only
 * mounted globally in the (shop) layout for the normal storefront.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingCart, ShoppingBag } from "lucide-react";
import { useCartStore, type CartItem } from "@/store/cart";
import { useCartDrawer } from "@/store/cart-drawer";
import {
  getCartRecommendations,
  type RecommendationCard,
} from "@/actions/recommendations";
import { toast } from "sonner";

function formatPrice(value: number): string {
  return `S/ ${value.toFixed(2)}`;
}

export default function GeneralCartDrawer() {
  const { isOpen, setOpen, close } = useCartDrawer();
  const items = useCartStore((s) => s.items);
  const getTotalPrice = useCartStore((s) => s.getTotalPrice);

  // On the full cart page the drawer would just mirror the page itself, so we
  // suppress it there (covers every trigger: header button, cross-sell adds…).
  const pathname = usePathname();
  const onCartPage = pathname === "/carrito";

  const [recs, setRecs] = useState<RecommendationCard[]>([]);
  const idsKey = items.map((i) => i.productId).join(",");

  useEffect(() => {
    if (onCartPage && isOpen) close();
  }, [onCartPage, isOpen, close]);

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (!isOpen || ids.length === 0) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- resets recommendations when drawer closes or cart is empty */
      setRecs([]);
      return;
    }
    let cancelled = false;
    getCartRecommendations(ids, 4)
      .then((r) => {
        if (!cancelled) setRecs(r.filter((x) => !ids.includes(x.id)));
      })
      .catch(() => {
        if (!cancelled) setRecs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, idsKey]);

  const subtotal = getTotalPrice();
  const count = items.reduce((n, i) => n + i.quantity, 0);

  if (onCartPage) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Tu carrito {count > 0 && `(${count})`}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Tu carrito está vacío.
            </p>
            <Button asChild variant="outline" onClick={close}>
              <Link href="/productos">Ver productos</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {items.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}

              {recs.length > 0 && (
                <CrossSell recs={recs} onNavigate={close} />
              )}
            </div>

            <SheetFooter className="border-t">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <Button asChild className="w-full" onClick={close}>
                <Link href="/checkout">Ir a pagar</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full"
                onClick={close}
              >
                <Link href="/carrito">Ver carrito</Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartLine({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="flex gap-3 rounded-lg border p-2">
      <Link
        href={`/productos/${item.slug}`}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-muted"
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={`/productos/${item.slug}`}
          className="line-clamp-2 text-sm font-medium hover:underline"
        >
          {item.name}
        </Link>
        {item.variantName && (
          <p className="text-xs text-muted-foreground">{item.variantName}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="flex h-6 w-6 items-center justify-center rounded border hover:bg-muted"
              aria-label="Quitar uno"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-6 text-center text-sm">{item.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              disabled={item.quantity >= item.maxStock}
              className="flex h-6 w-6 items-center justify-center rounded border hover:bg-muted disabled:opacity-40"
              aria-label="Agregar uno"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <span className="text-sm font-semibold">
            {formatPrice(item.price * item.quantity)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => removeItem(item.id)}
        className="self-start p-1 text-muted-foreground hover:text-destructive"
        aria-label={`Eliminar ${item.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function CrossSell({
  recs,
  onNavigate,
}: {
  recs: RecommendationCard[];
  onNavigate: () => void;
}) {
  const addItem = useCartStore((s) => s.addItem);

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
    if (ok) toast.success("Producto agregado");
    else toast.error("No hay más stock disponible");
  };

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="mb-3 text-sm font-semibold">Completa tu compra</h3>
      <div className="space-y-2">
        {recs.map((rec) => (
          <div key={rec.id} className="flex items-center gap-2 rounded-lg border p-2">
            <Link
              href={`/productos/${rec.slug}`}
              onClick={onNavigate}
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted"
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
                onClick={onNavigate}
                className="line-clamp-1 text-xs font-medium hover:underline"
              >
                {rec.name}
              </Link>
              <p className="text-xs font-semibold">{formatPrice(rec.price)}</p>
            </div>
            {rec.hasVariants ? (
              <Button asChild variant="outline" size="sm" onClick={onNavigate}>
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
