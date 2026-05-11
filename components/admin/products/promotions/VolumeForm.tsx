"use client";

import { useEffect, useState } from "react";
import { Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VolumeConfig, VolumeTier } from "@/lib/promotions/types";

interface VolumeFormProps {
  value: VolumeConfig;
  onChange: (next: VolumeConfig) => void;
}

interface BadgePreset {
  name: string;
  text: string;
  color: string;
  textColor: string;
}

const BADGE_PRESETS: BadgePreset[] = [
  { name: "Popular", text: "Most popular", color: "#F97316", textColor: "#FFFFFF" },
  { name: "Best value", text: "Best value", color: "#16A34A", textColor: "#FFFFFF" },
  { name: "Hot", text: "🔥 Oferta", color: "#DC2626", textColor: "#FFFFFF" },
  { name: "Premium", text: "Premium", color: "#1E293B", textColor: "#FACC15" },
];

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export default function VolumeForm({ value, onChange }: VolumeFormProps) {
  const updateTier = (index: number, patch: Partial<VolumeTier>) => {
    const next = value.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange({ ...value, tiers: next });
  };

  const removeTier = (index: number) => {
    if (value.tiers.length <= 1) return;
    onChange({ ...value, tiers: value.tiers.filter((_, i) => i !== index) });
  };

  const addTier = () => {
    const last = value.tiers[value.tiers.length - 1];
    const minQty = (last?.minQty ?? 1) + 1;
    onChange({
      ...value,
      tiers: [
        ...value.tiers,
        {
          minQty,
          discountType: last?.discountType ?? "PERCENT",
          discountValue:
            (last?.discountType ?? "PERCENT") === "PERCENT"
              ? Math.min((last?.discountValue ?? 0) + 10, 100)
              : (last?.discountValue ?? 0) + 10,
          label: `${minQty} Unidades`,
          badgeText: null,
          badgeColor: null,
          badgeTextColor: null,
          featured: false,
        },
      ],
    });
  };

  const setFeatured = (index: number) => {
    onChange({
      ...value,
      tiers: value.tiers.map((t, i) => ({ ...t, featured: i === index })),
    });
  };

  const applyPreset = (index: number, preset: BadgePreset) => {
    updateTier(index, {
      badgeText: preset.text,
      badgeColor: preset.color,
      badgeTextColor: preset.textColor,
    });
  };

  const clearBadge = (index: number) => {
    updateTier(index, {
      badgeText: null,
      badgeColor: null,
      badgeTextColor: null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tiers de cantidad</Label>
        <p className="text-xs text-muted-foreground">
          Define umbrales de cantidad y el descuento que aplica a cada uno.
          Solo aplica al comprar 2 o más unidades. Cada tier puede ser % o monto fijo (S/.).
        </p>
      </div>

      <div className="space-y-3">
        {value.tiers.map((tier, i) => {
          const hasBadge = !!tier.badgeText && tier.badgeText.trim().length > 0;
          const badgeBg = tier.badgeColor ?? "#F97316";
          const badgeFg = tier.badgeTextColor ?? "#FFFFFF";
          return (
            <div
              key={i}
              className="space-y-2 rounded-md border bg-muted/30 p-3"
            >
              {/* Top row: cantidad / tipo / valor / etiqueta / featured / borrar */}
              <div className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Cantidad</Label>
                  <Input
                    type="number"
                    min={2}
                    value={tier.minQty}
                    onChange={(e) =>
                      updateTier(i, { minQty: Math.max(2, parseInt(e.target.value) || 2) })
                    }
                    className="h-8"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select
                    value={tier.discountType}
                    onValueChange={(v) =>
                      updateTier(i, { discountType: v as VolumeTier["discountType"] })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">%</SelectItem>
                      <SelectItem value="FIXED">S/.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <Input
                    type="number"
                    min={0}
                    max={tier.discountType === "PERCENT" ? 100 : undefined}
                    step={tier.discountType === "PERCENT" ? 1 : 0.01}
                    value={tier.discountValue}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value) || 0;
                      const clamped =
                        tier.discountType === "PERCENT"
                          ? Math.min(100, Math.max(0, raw))
                          : Math.max(0, raw);
                      updateTier(i, { discountValue: clamped });
                    }}
                    className="h-8"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs text-muted-foreground">Etiqueta</Label>
                  <Input
                    value={tier.label ?? ""}
                    placeholder="2 Unidades"
                    onChange={(e) => updateTier(i, { label: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="col-span-1 flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={() => setFeatured(i)}
                    title={
                      tier.featured
                        ? "Tier auto-seleccionado al cargar la página"
                        : "Marcar como tier por defecto"
                    }
                    className={
                      tier.featured
                        ? "text-amber-500"
                        : "text-muted-foreground hover:text-amber-500"
                    }
                  >
                    <Star
                      className="h-5 w-5"
                      fill={tier.featured ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={value.tiers.length <= 1}
                    onClick={() => removeTier(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Badge config */}
              <div className="space-y-2 rounded-md border border-dashed bg-background p-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Badge
                  </Label>
                  {hasBadge && (
                    <span
                      className="rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide shadow-sm"
                      style={{ backgroundColor: badgeBg, color: badgeFg }}
                    >
                      {tier.badgeText}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-6">
                    <Label className="text-xs text-muted-foreground">
                      Texto (vacío = sin badge)
                    </Label>
                    <Input
                      value={tier.badgeText ?? ""}
                      placeholder="Most popular"
                      onChange={(e) =>
                        updateTier(i, { badgeText: e.target.value || null })
                      }
                      className="h-8"
                      maxLength={40}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs text-muted-foreground">Fondo</Label>
                    <ColorInput
                      value={badgeBg}
                      onChange={(hex) => updateTier(i, { badgeColor: hex })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs text-muted-foreground">Texto</Label>
                    <ColorInput
                      value={badgeFg}
                      onChange={(hex) => updateTier(i, { badgeTextColor: hex })}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    Presets:
                  </span>
                  {BADGE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(i, preset)}
                      className="rounded border px-2 py-0.5 text-[11px] font-medium transition hover:opacity-80"
                      style={{
                        backgroundColor: preset.color,
                        color: preset.textColor,
                      }}
                      title={`Aplicar preset «${preset.name}»`}
                    >
                      {preset.text}
                    </button>
                  ))}
                  {hasBadge && (
                    <button
                      type="button"
                      onClick={() => clearBadge(i)}
                      className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addTier}
        disabled={value.tiers.length >= 10}
      >
        <Plus className="mr-1 h-4 w-4" />
        Añadir tier
      </Button>

      <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
        <Switch
          checked={value.sameVariantOnly}
          onCheckedChange={(checked) => onChange({ ...value, sameVariantOnly: checked })}
        />
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">
            Solo misma variante (talla/color)
          </Label>
          <p className="text-xs text-muted-foreground">
            Si está activo, las N unidades deben ser exactamente la misma variante.
            Si está desactivado, el cliente puede mezclar tallas/colores.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ColorInputProps {
  value: string;
  onChange: (hex: string) => void;
}

function ColorInput({ value, onChange }: ColorInputProps) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const safe = HEX_REGEX.test(text) ? text : "#000000";

  return (
    <div className="flex h-8 items-center gap-1 rounded-md border bg-background px-1">
      <input
        type="color"
        value={safe}
        onChange={(e) => {
          const next = e.target.value.toUpperCase();
          setText(next);
          onChange(next);
        }}
        className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <input
        type="text"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (HEX_REGEX.test(raw)) {
            onChange(raw.toUpperCase());
          }
        }}
        onBlur={() => {
          // On blur, snap back to the last committed value if user left invalid hex.
          if (!HEX_REGEX.test(text)) setText(value);
        }}
        placeholder="#FFFFFF"
        className="w-20 border-0 bg-transparent text-xs font-mono outline-none"
        maxLength={7}
      />
    </div>
  );
}
