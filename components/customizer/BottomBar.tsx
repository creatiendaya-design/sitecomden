// components/customizer/BottomBar.tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "./store";
import { getPriceBreakdown } from "@/lib/customizer/pricing";
import { useCartStore } from "@/store/cart";
import { getStageRef } from "./canvas-ref";
import { captureZonePng, uploadAllZones } from "@/lib/customizer/canvas-export";
import type { BuilderProduct } from "./CustomizerLayout";

interface Props {
  product: BuilderProduct;
  previewMode: boolean;
  cartItemId: string | null;
}

export function BottomBar({ product, previewMode, cartItemId }: Props) {
  const template = useBuilderStore((s) => s.template);
  const variantId = useBuilderStore((s) => s.variantId);
  const uploading = useBuilderStore((s) => s.uploading);
  const hasContent = useBuilderStore((s) => s.hasContent());

  const router = useRouter();

  const variant = product.variants.find((v) => v.id === variantId);
  const basePrice = variant?.price ?? product.basePrice;
  const breakdown = getPriceBreakdown(basePrice, template?.surcharge ?? null);

  const handleAddToCart = async () => {
    const builder = useBuilderStore.getState();
    const { template, zones, activeZoneId } = builder;
    if (!template) return;
    if (!builder.hasContent()) {
      toast.warning("Añade al menos un texto en alguna zona");
      return;
    }

    builder.setUploading(true);
    try {
      const customDesignId = cartItemId
        ? cartItemId.split("::")[1] ?? crypto.randomUUID()
        : crypto.randomUUID();

      // Capture PNG for each zone with at least one layer
      const captures: { zoneId: string; blob: Blob }[] = [];
      for (const zone of template.zones) {
        const layers = zones[zone.id] ?? [];
        if (layers.length === 0) continue;
        // Switch active zone so the canvas renders this zone's layers
        useBuilderStore.getState().setActiveZone(zone.id);
        // Wait one frame for re-render
        await new Promise((r) => setTimeout(r, 50));
        const stage = getStageRef();
        if (!stage) throw new Error("Stage no disponible");
        captures.push(await captureZonePng(stage, zone.id, zone.printResolutionDPI));
      }

      // Restore active zone
      if (activeZoneId) useBuilderStore.getState().setActiveZone(activeZoneId);

      // Upload all PNGs
      const images = await uploadAllZones(captures, customDesignId);

      // Build CustomDesign payload
      const snapshot = builder.buildSnapshot();
      const designZones = builder.buildDesignZones();
      if (!snapshot) throw new Error("Snapshot no disponible");

      const liveVariantId = useBuilderStore.getState().variantId;
      const liveVariant = product.variants.find((v) => v.id === liveVariantId);
      const variantPrice = liveVariant?.price ?? product.basePrice;

      const customDesign = {
        templateId: template.id,
        templateSnapshot: snapshot,
        zones: designZones,
      };

      if (cartItemId) {
        useCartStore.getState().replaceCustomItem(cartItemId, customDesign, images);
        toast.success("Cambios guardados");
        router.push("/carrito");
      } else {
        const idForCart = `${liveVariantId || product.id}::${customDesignId}`;
        useCartStore.getState().addItem({
          id: idForCart,
          productId: product.id,
          variantId: liveVariantId ?? undefined,
          name: `${product.name} (personalizado)`,
          slug: product.slug,
          price: variantPrice + (template.surcharge ?? 0),
          maxStock: liveVariant?.stock ?? 99,
          image: images[0]?.url ?? product.images[0],
          customDesignId,
          customDesign,
          customDesignImages: images,
        });
        toast.success("¡Añadido al carrito!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir el diseño");
    } finally {
      builder.setUploading(false);
    }
  };

  if (previewMode) {
    return (
      <footer className="border-t px-4 py-3 bg-yellow-50 text-center text-sm">
        Modo vista previa (admin) — no se puede añadir al carrito
      </footer>
    );
  }

  return (
    <footer className="border-t px-4 py-3 bg-white flex items-center justify-between">
      <div className="text-sm">
        <span className="text-muted-foreground">S/ {breakdown.base.toFixed(2)}</span>
        {breakdown.surcharge > 0 && (
          <span className="text-muted-foreground ml-1">
            + S/ {breakdown.surcharge.toFixed(2)} personalización
          </span>
        )}
      </div>
      <Button
        size="lg"
        className="bg-red-600 hover:bg-red-700 text-white"
        disabled={!hasContent || uploading}
        onClick={handleAddToCart}
      >
        {uploading
          ? "Subiendo tu diseño…"
          : cartItemId
          ? "Guardar cambios"
          : `Añadir al carrito · S/ ${breakdown.total.toFixed(2)}`}
      </Button>
    </footer>
  );
}
