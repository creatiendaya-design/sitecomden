"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Tag, X, Check } from "lucide-react";

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
    } catch (err) {
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

  return (
    <div className="space-y-2">
      <Label htmlFor="coupon" className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        ¿Tienes un cupón de descuento?
      </Label>
      <div className="flex gap-2">
        <Input
          id="coupon"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="CODIGO"
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
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Aplicar"
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}