"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Indicador de progreso minimal (breadcrumb de texto). No son pasos/páginas
// separadas: el checkout es de una sola página; esta barra solo refleja en qué
// momento del flujo está el cliente (formulario → pasarela → gracias).
const STEPS = [
  { label: "Datos", pattern: /^\/checkout/ },
  { label: "Pago", pattern: /\/pago-/ },
  { label: "Confirmado", pattern: /\/confirmacion/ },
];

export default function CheckoutProgressBar() {
  const pathname = usePathname();

  const activeIndex = (() => {
    const idx = STEPS.findIndex((s) => s.pattern.test(pathname));
    return idx === -1 ? 0 : idx;
  })();

  return (
    <div className="border-t bg-muted/30">
      <nav
        aria-label="Progreso del checkout"
        className="container mx-auto flex items-center justify-center px-4 py-2"
      >
        <ol className="flex items-center gap-1.5 text-xs sm:text-sm">
          {STEPS.map((step, i) => {
            const completed = i < activeIndex;
            const active = i === activeIndex;

            return (
              <li key={step.label} className="flex items-center gap-1.5">
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "font-medium transition-colors",
                    active && "text-primary",
                    completed && "text-green-600",
                    !active && !completed && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
