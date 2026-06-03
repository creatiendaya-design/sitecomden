"use client";

import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import CartCounter from "./CartCounter";
import { useCartDrawer } from "@/store/cart-drawer";

/**
 * Header cart button. Opens the general cart drawer instead of navigating to
 * /carrito (the full page is still reachable from inside the drawer).
 */
export default function CartButton({ className }: { className?: string }) {
  const open = useCartDrawer((s) => s.open);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={open}
      aria-label="Carrito"
      className={cn(
        "relative h-10 w-10 rounded-full text-current hover:bg-white/10 hover:text-current",
        className,
      )}
    >
      <ShoppingCart className="h-5 w-5" />
      <CartCounter />
    </Button>
  );
}
