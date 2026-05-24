"use client";

import { useCartStore } from "@/store/cart";
import { useEffect, useState } from "react";

export default function CartCounter() {
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (totalItems === 0) {
    return null;
  }

  // NEXVO-style badge: prominent red counter pinned to the top-right of
  // the cart icon. Uses fixed red instead of theme tokens so it stays
  // visible against any header bg the admin picks (dark/light/custom).
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white/90 dark:ring-white/20">
      {totalItems > 9 ? "9+" : totalItems}
    </span>
  );
}
