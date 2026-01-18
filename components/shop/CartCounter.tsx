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

  return (
    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
      {totalItems > 9 ? "9+" : totalItems}
    </span>
  );
}