"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  promotionTypeLabels,
  type PromotionData,
} from "@/lib/promotions/types";
import {
  createPromotion,
  updatePromotion,
} from "@/actions/promotions";
import { getDefaultConfig } from "@/lib/promotions/defaults";
import type { ProductPromotionType } from "@prisma/client";
import VolumeForm from "./VolumeForm";
import SubscriptionForm from "./SubscriptionForm";
import FreeGiftForm from "./FreeGiftForm";
import BundleForm from "./BundleForm";
import ProductPicker from "./ProductPicker";
import CategoryPicker from "./CategoryPicker";

export type DrawerMode =
  | { kind: "create"; type: ProductPromotionType }
  | { kind: "edit"; promotion: PromotionData };

interface PromotionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DrawerMode | null;
  /** Product ID from the editor that opened this drawer. Pre-selected as
   *  target and locked (cannot be removed) when set. Omit when opened from
   *  the global /admin/promociones route. */
  scopedProductId?: string;
  scopedProductName?: string;
  onSaved: (promotion: PromotionData) => void;
}

export default function PromotionsDrawer({
  open,
  onOpenChange,
  mode,
  scopedProductId,
  scopedProductName,
  onSaved,
}: PromotionsDrawerProps) {
  const [name, setName] = useState("");
  const [config, setConfig] = useState<unknown>(null);
  const [active, setActive] = useState(true);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    setError(null);
    if (mode.kind === "create") {
      setName(`${promotionTypeLabels[mode.type]}${scopedProductName ? ` — ${scopedProductName}` : ""}`);
      setConfig(getDefaultConfig(mode.type));
      setActive(true);
      setProductIds(scopedProductId ? [scopedProductId] : []);
      setCategoryIds([]);
    } else {
      setName(mode.promotion.name);
      setConfig(mode.promotion.config);
      setActive(mode.promotion.active);
      setProductIds(mode.promotion.productIds);
      setCategoryIds(mode.promotion.categoryIds);
    }
  }, [mode, scopedProductId, scopedProductName]);

  if (!mode) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl" />
      </Sheet>
    );
  }

  const type = mode.kind === "create" ? mode.type : mode.promotion.type;
  const excludeProductIds = scopedProductId ? [scopedProductId] : [];

  const handleSave = async () => {
    if (!config) return;
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (productIds.length === 0 && categoryIds.length === 0) {
      setError("Selecciona al menos un producto o categoría como target");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        type,
        name: name.trim(),
        config,
        active,
        priority: mode.kind === "edit" ? mode.promotion.priority : 0,
        startsAt: null,
        expiresAt: null,
        productIds,
        categoryIds,
      } as const;

      const result =
        mode.kind === "create"
          ? await createPromotion(payload as Parameters<typeof createPromotion>[0])
          : await updatePromotion(
              mode.promotion.id,
              payload as Parameters<typeof updatePromotion>[1]
            );

      onSaved(result.promotion);
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al guardar la promoción";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const renderForm = () => {
    if (!config) return null;
    switch (type) {
      case "VOLUME":
        return (
          <VolumeForm
            value={config as Parameters<typeof VolumeForm>[0]["value"]}
            onChange={setConfig}
          />
        );
      case "SUBSCRIPTION":
        return (
          <SubscriptionForm
            value={config as Parameters<typeof SubscriptionForm>[0]["value"]}
            onChange={setConfig}
          />
        );
      case "FREE_GIFT":
        return (
          <FreeGiftForm
            excludeProductIds={excludeProductIds}
            value={config as Parameters<typeof FreeGiftForm>[0]["value"]}
            onChange={setConfig}
          />
        );
      case "BUNDLE":
        return (
          <BundleForm
            excludeProductIds={excludeProductIds}
            value={config as Parameters<typeof BundleForm>[0]["value"]}
            onChange={setConfig}
          />
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>
            {mode.kind === "create" ? "Nueva promoción" : "Editar promoción"}
          </SheetTitle>
          <SheetDescription>{promotionTypeLabels[type]}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div>
            <Label className="text-sm font-medium">Nombre interno</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Solo lo ves tú en el admin. Sirve para identificar la promoción en la lista global.
            </p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Black Friday — 2x1 Polos"
              className="h-9"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <div>
              <Label className="text-sm font-medium">Promoción activa</Label>
              <p className="text-xs text-muted-foreground">
                Si está desactivada, no se mostrará al cliente.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Configuración</h3>
            {renderForm()}
          </section>

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">¿A qué productos aplica?</h3>
            <p className="text-xs text-muted-foreground">
              La promoción se activará en cualquier producto seleccionado directamente,
              o que pertenezca a alguna de las categorías elegidas.
            </p>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <Label className="text-xs font-medium uppercase text-muted-foreground">
                  Productos
                  {scopedProductId && (
                    <span className="ml-1 normal-case text-muted-foreground/70">
                      (este producto está fijo)
                    </span>
                  )}
                </Label>
                <div className="mt-2">
                  <ProductPicker
                    selectedIds={productIds}
                    onChange={(ids) => {
                      if (scopedProductId && !ids.includes(scopedProductId)) {
                        setProductIds([scopedProductId, ...ids]);
                      } else {
                        setProductIds(ids);
                      }
                    }}
                    multi
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium uppercase text-muted-foreground">
                  Categorías
                </Label>
                <div className="mt-2">
                  <CategoryPicker
                    selectedIds={categoryIds}
                    onChange={setCategoryIds}
                  />
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-muted/20 px-6 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode.kind === "create" ? "Crear" : "Guardar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
