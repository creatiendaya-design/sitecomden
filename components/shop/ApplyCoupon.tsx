"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Tag, X, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApplyCouponProps {
  subtotal: number;
  onCouponApplied: (coupon: {
    code: string;
    type: string;
    value: number;
    discount: number;
    description: string | null;
  }) => void;
  onCouponRemoved: () => void;
  currentCoupon: {
    code: string;
    discount: number;
  } | null;
}

export default function ApplyCoupon({
  subtotal,
  onCouponApplied,
  onCouponRemoved,
  currentCoupon,
}: ApplyCouponProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Plegado por defecto: la mayoría de compradores no trae cupón, y el campo
  // abierto invita a irse a buscar uno en otra pestaña.
  const [open, setOpen] = useState(false);
  // Unique per instance — the checkout renders this twice (mobile sheet +
  // desktop summary), so a hardcoded id would collide and make the label focus
  // the wrong (hidden) input.
  const couponId = useId();
  const panelId = `${couponId}-panel`;
  const inputRef = useRef<HTMLInputElement>(null);

  // Abrir sin poner el cursor dentro obligaría a un segundo toque.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleApply = async () => {
    if (!code.trim()) {
      setError("Ingresa un código de cupón");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          subtotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Cupón no válido");
        return;
      }

      onCouponApplied(data.coupon);
      setCode("");
      setError(null);
    } catch {
      setError("Error al validar cupón");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    onCouponRemoved();
    setCode("");
    setError(null);
  };

  if (currentCoupon) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">
                Cupón aplicado: {currentCoupon.code}
              </p>
              <p className="text-sm text-green-700">
                Descuento: -S/ {currentCoupon.discount.toFixed(2)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-green-700 hover:text-green-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const toggle = () => {
    setOpen((prev) => {
      // Al cerrar se descarta el error: si no, reaparece intacto la próxima
      // vez que se abra el panel, ya sin relación con lo que el cliente hace.
      if (prev) setError(null);
      return !prev;
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 rounded-md text-left text-sm font-medium transition-colors hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
        ¿Tienes un cupón de descuento?
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={panelId} className="space-y-2">
          <Label htmlFor={couponId} className="sr-only">
            Código de cupón
          </Label>
          <div className="flex gap-2">
            <Input
              id={couponId}
              ref={inputRef}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="CÓDIGO"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApply();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleApply}
              disabled={loading || !code.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}