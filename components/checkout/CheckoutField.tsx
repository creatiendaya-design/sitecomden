"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { AlertCircle, CheckCircle2, ChevronDownIcon } from "lucide-react";
import { SelectContent, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Checkout-only form primitives.
 *
 * These intentionally do NOT reuse the shadcn `Input`/`Select` chrome used by
 * the admin panel. The buy flow keeps its own taller, mobile-first chrome:
 *   - taller touch target (h-12) for mobile,
 *   - 16px text (text-base) so iOS doesn't auto-zoom on focus,
 *   - focus ring + optional leading icon + valid/error states.
 *
 * Colors/border/radius of the resting + focus states are theme-editable via
 * the `--theme-checkout-input-*` custom properties (customizer → "Checkout").
 * The fallbacks below reproduce the historical fixed graphite (slate-200
 * border, slate-900 focus, white bg, rounded-xl) so anything rendered outside
 * a `.theme-<id>` scope still looks identical.
 *
 * Error red and success green stay semantic (universal validation signals).
 */

// Resting + hover + focus chrome, driven by `--theme-checkout-input-*` with
// graphite fallbacks. Hover/ring derive from the focus color via color-mix so
// a single token edit recolors the whole interaction. These MUST be complete
// literal strings (no template concatenation) — Tailwind only generates classes
// it can see verbatim in the source.
const DEFAULT_STATE =
  "border-[var(--theme-checkout-input-border,#e2e8f0)] hover:border-[color-mix(in_oklab,var(--theme-checkout-input-border-focus,#0f172a)_45%,var(--theme-checkout-input-border,#e2e8f0))] focus-visible:border-[var(--theme-checkout-input-border-focus,#0f172a)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--theme-checkout-input-border-focus,#0f172a)_20%,transparent)]";

/**
 * Pay-button chrome for the checkout CTA, driven by `--theme-checkout-button-*`
 * (customizer → "Checkout") with a fallback to the global brand `--cta`.
 * Applied ON TOP of the Button `cta` variant; tailwind-merge lets these win
 * over the variant's bg/text/radius (including the variant's `hover:bg-cta/90`,
 * which we override with an explicit darken so a custom color hovers correctly).
 * Literal string — no concatenation — so Tailwind emits the classes.
 */
export const checkoutPayButtonClass =
  "bg-[var(--theme-checkout-button-bg,var(--cta))] text-[var(--theme-checkout-button-text,var(--cta-foreground))] rounded-[var(--theme-checkout-button-radius,0.375rem)] hover:bg-[color-mix(in_oklab,var(--theme-checkout-button-bg,var(--cta))_90%,black)]";

type ControlState = {
  hasIcon?: boolean;
  error?: boolean;
  valid?: boolean;
};

/** Shared chrome so <input> and the Select trigger render identically. */
export function checkoutControlClass({ hasIcon, error, valid }: ControlState = {}) {
  return cn(
    "h-12 w-full rounded-[var(--theme-checkout-input-radius,0.75rem)] border bg-[var(--theme-checkout-input-bg,#fff)] text-base text-slate-900",
    "px-4 shadow-sm transition-[color,box-shadow,border-color] outline-none",
    "placeholder:text-slate-400",
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50",
    hasIcon && "pl-11",
    error
      ? "border-destructive focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/25"
      : valid
        ? "border-green-500/60 focus-visible:border-green-500 focus-visible:ring-2 focus-visible:ring-green-500/20"
        : DEFAULT_STATE
  );
}

interface CheckoutFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control slot + inline error/hint. Use for wrapping a <Select>. */
export function CheckoutField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: CheckoutFieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p
          id={htmlFor ? `${htmlFor}-hint` : undefined}
          className="mt-1.5 text-xs text-slate-500"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface CheckoutInputProps extends React.ComponentProps<"input"> {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** Show the green check + green border (only applies when there's no error). */
  valid?: boolean;
  /** Leading icon (e.g. <Mail />). Auto-sized to 20px. */
  icon?: React.ReactNode;
  /** Extra classes for the outer field wrapper (e.g. grid spans). */
  fieldClassName?: string;
}

export const CheckoutInput = React.forwardRef<HTMLInputElement, CheckoutInputProps>(
  function CheckoutInput(
    { id, label, required, error, hint, valid, icon, className, fieldClassName, ...props },
    ref
  ) {
    const showValid = !!valid && !error;
    const describedBy =
      [error && id ? `${id}-error` : null, !error && hint && id ? `${id}-hint` : null]
        .filter(Boolean)
        .join(" ") || undefined;
    return (
      <CheckoutField
        label={label}
        htmlFor={id}
        required={required}
        error={error}
        hint={hint}
        className={fieldClassName}
      >
        <div className="relative">
          {icon && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 [&_svg]:h-5 [&_svg]:w-5"
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            className={cn(
              checkoutControlClass({ hasIcon: !!icon, error: !!error, valid: showValid }),
              showValid && "pr-10",
              className
            )}
            {...props}
          />
          {showValid && (
            <CheckCircle2
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500"
            />
          )}
        </div>
      </CheckoutField>
    );
  }
);

interface CheckoutSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: boolean;
  /** Leading icon (e.g. <MapPin />). Auto-sized to 20px. */
  icon?: React.ReactNode;
  /** <SelectItem> children. */
  children: React.ReactNode;
}

/**
 * Select that matches CheckoutInput's chrome (height, radius, graphite focus
 * ring, optional leading icon). Reuses the shadcn dropdown panel (SelectContent)
 * so the open menu stays consistent; only the trigger is restyled.
 */
export function CheckoutSelect({
  id,
  value,
  onValueChange,
  disabled,
  placeholder,
  error,
  icon,
  children,
}: CheckoutSelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400 [&_svg]:h-5 [&_svg]:w-5"
          >
            {icon}
          </span>
        )}
        <SelectPrimitive.Trigger
          id={id}
          aria-invalid={!!error || undefined}
          className={cn(
            checkoutControlClass({ hasIcon: !!icon, error: !!error }),
            "flex items-center justify-between gap-2 data-[placeholder]:text-slate-400",
            "[&>span]:line-clamp-1 [&>span]:text-left [&_svg]:pointer-events-none [&_svg]:shrink-0"
          )}
        >
          <SelectValue placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDownIcon className="size-4 opacity-50" aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
      </div>
      <SelectContent>{children}</SelectContent>
    </SelectPrimitive.Root>
  );
}
