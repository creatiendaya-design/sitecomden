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
 * the admin panel. The storefront checkout uses a fixed graphite (#0f172a)
 * accent — deliberately independent of the per-store theme so the buy flow
 * always reads as the same trustworthy, neutral surface:
 *   - taller touch target (h-12) for mobile,
 *   - 16px text (text-base) so iOS doesn't auto-zoom on focus,
 *   - graphite focus ring + optional leading icon + valid/error states.
 *
 * Error red and success green stay semantic (universal validation signals).
 * The accent is centralized in ACCENT_* below — change it in one place to
 * retheme every checkout field.
 */

// Fixed checkout accent = graphite (slate-900 ≈ #0f172a). To retheme every
// checkout field, change the literal classes in DEFAULT_STATE below. They MUST
// be written as complete literal strings (no template concatenation) — Tailwind
// only generates classes it can see verbatim in the source.
const DEFAULT_STATE =
  "border-slate-200 hover:border-slate-400 focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20";

type ControlState = {
  hasIcon?: boolean;
  error?: boolean;
  valid?: boolean;
};

/** Shared chrome so <input> and the Select trigger render identically. */
export function checkoutControlClass({ hasIcon, error, valid }: ControlState = {}) {
  return cn(
    "h-12 w-full rounded-xl border bg-white text-base text-slate-900",
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
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
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
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 [&_svg]:h-5 [&_svg]:w-5">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error || undefined}
            className={cn(
              checkoutControlClass({ hasIcon: !!icon, error: !!error, valid: showValid }),
              showValid && "pr-10",
              className
            )}
            {...props}
          />
          {showValid && (
            <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
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
          <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400 [&_svg]:h-5 [&_svg]:w-5">
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
            <ChevronDownIcon className="size-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
      </div>
      <SelectContent>{children}</SelectContent>
    </SelectPrimitive.Root>
  );
}
