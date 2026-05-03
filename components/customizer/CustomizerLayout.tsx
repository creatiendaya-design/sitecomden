// components/customizer/CustomizerLayout.tsx
"use client";

import { useEffect, useState } from "react";
import { useBuilderStore } from "./store";
import { useCartStore } from "@/store/cart";
import { CustomizerTopBar } from "./CustomizerTopBar";
import { BottomBar } from "./BottomBar";
import { ZoneTabs } from "./ZoneTabs";
import { CustomizerCanvas } from "./CustomizerCanvas";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { MobileFAB } from "./MobileFAB";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProductTab } from "./LeftSidebar/ProductTab";
import { LayersTab } from "./LeftSidebar/LayersTab";
import type { CustomizableTemplateData, MockupOverrides } from "@/lib/customizer/types";
import type { SizeGuideData } from "@/lib/size-guides/types";

export interface BuilderProduct {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  images: string[];
  options: {
    id: string;
    name: string;
    displayStyle: "DROPDOWN" | "BUTTONS" | "SWATCHES";
    values: {
      id: string;
      value: string;
      swatchType: "NONE" | "COLOR" | "IMAGE";
      colorHex: string | null;
      swatchImage: string | null;
    }[];
  }[];
  variants: {
    id: string;
    sku: string | null;
    stock: number;
    price: number;
    options: Record<string, string>;
  }[];
  reviewsCount: number;
  reviewsAvg: number;
  mockupOverrides: MockupOverrides | null;
  sizeGuide: SizeGuideData | null;
}

interface Props {
  product: BuilderProduct;
  template: CustomizableTemplateData;
  initialVariantId: string | null;
  cartItemId: string | null;
  previewMode: boolean;
}

export function CustomizerLayout({
  product,
  template,
  initialVariantId,
  cartItemId,
  previewMode,
}: Props) {
  const load = useBuilderStore((s) => s.load);

  useEffect(() => {
    let initial: { zones: { zoneId: string; layers: import("@/lib/customizer/types").TextLayer[] }[]; cartItemId?: string } | undefined;
    let variantToLoad = initialVariantId;

    if (cartItemId) {
      const cartItem = useCartStore.getState().items.find((i) => i.id === cartItemId);
      if (cartItem?.customDesign) {
        initial = {
          zones: cartItem.customDesign.zones,
          cartItemId,
        };
        if (cartItem.variantId) variantToLoad = cartItem.variantId;
      }
    }

    load(template, variantToLoad, initial);
  }, [template, initialVariantId, cartItemId, load]);

  const [isMobile, setIsMobile] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"none" | "producto" | "capas">("none");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <CustomizerTopBar productSlug={product.slug} productName={product.name} />
      {isMobile ? (
        <>
          <ZoneTabs />
          <main className="flex-1 overflow-hidden">
            <CustomizerCanvas product={product} />
          </main>
          <MobileBottomSheet />
          <MobileFAB
            onShowProduct={() => setMobilePanel("producto")}
            onShowLayers={() => setMobilePanel("capas")}
          />
          <Dialog open={mobilePanel !== "none"} onOpenChange={(o) => !o && setMobilePanel("none")}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              {mobilePanel === "producto" && <ProductTab product={product} />}
              {mobilePanel === "capas" && <LayersTab />}
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-80 border-r flex-shrink-0">
            <LeftSidebar product={product} />
          </aside>
          <main className="flex-1 flex flex-col overflow-hidden">
            <ZoneTabs />
            <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-auto">
              <CustomizerCanvas product={product} />
            </div>
          </main>
          <aside className="w-80 border-l flex-shrink-0">
            <RightSidebar />
          </aside>
        </div>
      )}
      <BottomBar product={product} previewMode={previewMode} cartItemId={cartItemId} />
    </div>
  );
}
