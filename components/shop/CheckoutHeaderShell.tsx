"use client";

import { useEffect, useRef, useState } from "react";

interface CheckoutHeaderShellProps {
  children: React.ReactNode;
}

/**
 * Wrapper cliente del header de checkout.
 *
 * En móvil aplica el patrón "hide on scroll down / show on scroll up":
 * - Al bajar (scroll hacia abajo) el header se desliza hacia arriba y desaparece.
 * - Al subir (scroll hacia arriba) el header vuelve a bajar y reaparece.
 *
 * En desktop (md+) el header permanece siempre visible y pegado arriba.
 */
export default function CheckoutHeaderShell({
  children,
}: CheckoutHeaderShellProps) {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    // Umbral mínimo para evitar parpadeos con micro-scrolls.
    const DELTA = 8;
    // No ocultar mientras se está cerca del tope de la página.
    const TOP_OFFSET = 80;

    const update = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;

      if (Math.abs(diff) > DELTA) {
        if (diff > 0 && currentY > TOP_OFFSET) {
          // Scroll hacia abajo → ocultar.
          setHidden(true);
        } else if (diff < 0) {
          // Scroll hacia arriba → mostrar.
          setHidden(false);
        }
        lastScrollY.current = currentY;
      }

      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-background/95 shadow-sm backdrop-blur transition-transform duration-300 ease-in-out supports-[backdrop-filter]:bg-background/60 md:translate-y-0 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {children}
    </header>
  );
}
