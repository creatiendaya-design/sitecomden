// components/customizer/CustomizerLayout.tsx
"use client";

import { useEffect } from "react";
import { useBuilderStore } from "./store";
import { CustomizerTopBar } from "./CustomizerTopBar";
import { BottomBar } from "./BottomBar";
import { ZoneTabs } from "./ZoneTabs";
import type { CustomizableTemplateData, MockupOverrides } from "@/lib/customizer/types";

export interface BuilderProduct {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  images: string[];
  options: {
    id: string;
    name: string;
    values: { id: string; value: string; swatch?: string | null }[];
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
    load(template, initialVariantId);
    // TODO Phase 13: si cartItemId, cargar diseño desde el cart store
  }, [template, initialVariantId, load]);

  return (
    <div className="flex flex-col h-screen">
      <CustomizerTopBar productSlug={product.slug} productName={product.name} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r flex-shrink-0">
          <div className="p-4 text-sm text-muted-foreground">[Sidebar izq — Phase 9]</div>
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden">
          <ZoneTabs />
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-muted-foreground">[Canvas — Phase 8]</div>
          </div>
        </main>
        <aside className="w-80 border-l flex-shrink-0">
          <div className="p-4 text-sm text-muted-foreground">[Sidebar der — Phase 10]</div>
        </aside>
      </div>
      <BottomBar product={product} previewMode={previewMode} cartItemId={cartItemId} />
    </div>
  );
}
