"use client";

/**
 * Storefront "Comprados juntos" (frequently bought together) BODY. Renders the
 * hybrid recommendations resolved server-side. The heading + section wrapper +
 * style come from the `FREQUENTLY_BOUGHT_TOGETHER` theme section that hosts
 * this component, so it's editable in the customizer.
 *
 * Variant products can't be added in one click (they need an option choice),
 * so they link to their product page instead of exposing an add control.
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ShoppingCart, Settings2 } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";

/**
 * How products are added to the cart. `add_all_discount` is accepted for
 * backward compatibility but behaves like `add_all` — real combo discounts are
 * handled by the BUNDLE promotion engine (server-validated in createOrder).
 */
export type FbtAddMode = "individual" | "add_all" | "add_all_discount";

export interface FbtItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  mainImage: string | null;
  hasVariants: boolean;
  inStock: boolean;
  stock: number;
  isCurrent: boolean;
}

interface Props {
  items: FbtItem[];
  mode: FbtAddMode;
}

function formatPrice(value: number): string {
  return `S/ ${value.toFixed(2)}`;
}

export default function FrequentlyBoughtTogether({ items, mode }: Props) {
  if (items.length === 0) return null;
  const showCombo = mode === "add_all" || mode === "add_all_discount";

  // Bundle discounts are owned by the BUNDLE promotion engine (server-validated
  // in createOrder, shown via BundleSuggestion on the PDP) — NOT here, so we
  // always add at full price (discountPercent=0). To discount a combo, create a
  // Bundle promotion in /admin/promociones.
  return showCombo ? (
    <ComboView items={items} discountPercent={0} />
  ) : (
    <IndividualView items={items.filter((i) => !i.isCurrent)} />
  );
}

// ── Individual mode ─────────────────────────────────────────────────────────

function IndividualView({ items }: { items: FbtItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <IndividualCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function IndividualCard({ item }: { item: FbtItem }) {
  const addItem = useCartStore((s) => s.addItem);

  const handleAdd = () => {
    const ok = addItem(
      {
        id: item.id,
        productId: item.id,
        slug: item.slug,
        name: item.name,
        price: item.price,
        originalUnitPrice: item.price,
        image: item.mainImage ?? undefined,
        maxStock: item.stock,
      },
      1,
    );
    if (ok) toast.success("Producto agregado al carrito");
    else toast.error("No hay más stock disponible");
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <Link
        href={`/productos/${item.slug}`}
        className="relative aspect-square bg-muted"
      >
        {item.mainImage ? (
          <Image
            src={item.mainImage}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
          />
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link
          href={`/productos/${item.slug}`}
          className="line-clamp-2 text-sm font-medium hover:underline"
        >
          {item.name}
        </Link>
        <p className="text-sm font-semibold">{formatPrice(item.price)}</p>
        <div className="mt-auto">
          {item.hasVariants ? (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/productos/${item.slug}`}>Ver opciones</Link>
            </Button>
          ) : item.inStock ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAdd}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Agregar
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full" disabled>
              Agotado
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add-all / add-all + discount mode ───────────────────────────────────────

function ComboView({
  items,
  discountPercent,
}: {
  items: FbtItem[];
  discountPercent: number;
}) {
  const addItem = useCartStore((s) => s.addItem);

  // Only no-variant, in-stock items can be added in one click.
  const addable = useMemo(
    () => items.filter((i) => !i.hasVariants && i.inStock),
    [items],
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(addable.map((i) => i.id)),
  );

  const discountedPrice = (item: FbtItem) =>
    discountPercent > 0 && !item.isCurrent
      ? item.price * (1 - discountPercent / 100)
      : item.price;

  const chosen = addable.filter((i) => selected.has(i.id));
  const total = chosen.reduce((sum, i) => sum + discountedPrice(i), 0);
  const totalBefore = chosen.reduce((sum, i) => sum + i.price, 0);
  const savings = totalBefore - total;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAddAll = () => {
    let added = 0;
    for (const item of chosen) {
      const ok = addItem(
        {
          id: item.id,
          productId: item.id,
          slug: item.slug,
          name: item.name,
          price: discountedPrice(item),
          originalUnitPrice: item.price,
          image: item.mainImage ?? undefined,
          maxStock: item.stock,
        },
        1,
      );
      if (ok) added += 1;
    }
    if (added > 0) {
      toast.success(
        savings > 0
          ? `${added} productos agregados — ahorras ${formatPrice(savings)}`
          : `${added} productos agregados al carrito`,
      );
    } else {
      toast.error("No se pudo agregar el combo");
    }
  };

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* Visual combo strip */}
      <div className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            {index > 0 && (
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <Link
              href={`/productos/${item.slug}`}
              className="relative h-20 w-20 overflow-hidden rounded-md border bg-muted sm:h-24 sm:w-24"
            >
              {item.mainImage ? (
                <Image
                  src={item.mainImage}
                  alt={item.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : null}
            </Link>
          </div>
        ))}
      </div>

      {/* Checklist + total */}
      <div className="flex-1 space-y-3">
        <ul className="space-y-2">
          {items.map((item) => {
            const canAdd = !item.hasVariants && item.inStock;
            const isChosen = selected.has(item.id);
            const dPrice = discountedPrice(item);
            return (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                {canAdd ? (
                  <Checkbox
                    checked={isChosen}
                    onCheckedChange={() => toggle(item.id)}
                    aria-label={`Incluir ${item.name}`}
                  />
                ) : (
                  <Settings2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {item.isCurrent && (
                    <span className="mr-1 text-xs text-muted-foreground">
                      (este producto)
                    </span>
                  )}
                  {item.name}
                </span>
                {item.hasVariants ? (
                  <Link
                    href={`/productos/${item.slug}`}
                    className="shrink-0 text-xs text-primary hover:underline"
                  >
                    Ver opciones
                  </Link>
                ) : !item.inStock ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Agotado
                  </span>
                ) : (
                  <span className="shrink-0 font-medium">
                    {dPrice < item.price ? (
                      <>
                        <span className="mr-1 text-xs text-muted-foreground line-through">
                          {formatPrice(item.price)}
                        </span>
                        {formatPrice(dPrice)}
                      </>
                    ) : (
                      formatPrice(item.price)
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t pt-3">
          <div>
            <p className="text-sm text-muted-foreground">
              Total ({chosen.length}{" "}
              {chosen.length === 1 ? "producto" : "productos"})
            </p>
            <p className="text-lg font-bold">{formatPrice(total)}</p>
            {savings > 0 && (
              <p className="text-xs font-medium text-green-600">
                Ahorras {formatPrice(savings)}
              </p>
            )}
          </div>
          <Button onClick={handleAddAll} disabled={chosen.length === 0}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  );
}
