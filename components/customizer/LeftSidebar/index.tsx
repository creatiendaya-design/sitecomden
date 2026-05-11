// components/customizer/LeftSidebar/index.tsx
"use client";

import { useState } from "react";
import {
  Package,
  Layers as LayersIcon,
  Type,
  Image as ImageIcon,
  Star,
  Sparkles,
  Crown,
  Droplet,
} from "lucide-react";
import { ProductTab } from "./ProductTab";
import { LayersTab } from "./LayersTab";
import type { BuilderProduct } from "../CustomizerLayout";

type TabKey =
  | "producto"
  | "capas"
  | "texto"
  | "imagen"
  | "clipart"
  | "ia"
  | "premium"
  | "relleno";

interface Props {
  product: BuilderProduct;
}

export function LeftSidebar({ product }: Props) {
  const [active, setActive] = useState<TabKey>("producto");

  const tabs: Array<{
    key: TabKey;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    disabled?: boolean;
  }> = [
    { key: "producto", icon: Package, label: "Producto" },
    { key: "capas", icon: LayersIcon, label: "Capas" },
    { key: "texto", icon: Type, label: "Texto", disabled: true },
    { key: "imagen", icon: ImageIcon, label: "Imagen", disabled: true },
    { key: "clipart", icon: Star, label: "Clipart", disabled: true },
    { key: "ia", icon: Sparkles, label: "IA", disabled: true },
    { key: "premium", icon: Crown, label: "Premium", disabled: true },
    { key: "relleno", icon: Droplet, label: "Relleno", disabled: true },
  ];

  return (
    <div className="flex h-full">
      <nav className="w-16 border-r bg-gray-50 flex flex-col items-center py-2 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setActive(tab.key)}
              disabled={tab.disabled}
              title={tab.disabled ? "Próximamente" : tab.label}
              className={`w-12 h-14 flex flex-col items-center justify-center rounded text-xs gap-0.5 ${
                active === tab.key && !tab.disabled
                  ? "bg-white shadow-sm border"
                  : tab.disabled
                  ? "opacity-30"
                  : "hover:bg-white"
              }`}
            >
              <Icon className="size-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex-1 overflow-y-auto p-4">
        {active === "producto" && <ProductTab product={product} />}
        {active === "capas" && <LayersTab />}
      </div>
    </div>
  );
}
