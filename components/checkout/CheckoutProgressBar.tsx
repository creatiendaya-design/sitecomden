"use client";

import { usePathname } from "next/navigation";
import { Check, ClipboardList, CreditCard, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Tus datos", icon: ClipboardList, pattern: /^\/checkout/ },
  { label: "Pago", icon: CreditCard, pattern: /\/pago-/ },
  { label: "Confirmado", icon: PackageCheck, pattern: /\/confirmacion/ },
];

export default function CheckoutProgressBar() {
  const pathname = usePathname();

  const activeIndex = (() => {
    const idx = STEPS.findIndex((s) => s.pattern.test(pathname));
    return idx === -1 ? 0 : idx;
  })();

  return (
    <div className="checkout-progress border-t bg-muted/30">
      <div className="container mx-auto flex items-center justify-center px-4 py-2.5">
        <ol className="flex items-center gap-0">
          {STEPS.map((step, i) => {
            const completed = i < activeIndex;
            const active = i === activeIndex;
            const Icon = step.icon;

            return (
              <li key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1 min-w-[72px]">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                      completed && "bg-green-500 text-white",
                      active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                      !completed && !active && "bg-border text-muted-foreground"
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    {completed ? (
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-none",
                      active && "text-primary",
                      completed && "text-green-600",
                      !completed && !active && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mb-4 mx-1 h-px w-10 sm:w-16 shrink-0 transition-colors",
                      i < activeIndex ? "bg-green-500" : "bg-border"
                    )}
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
