"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { CustomDesign, CustomDesignImage } from "@/lib/customizer/types";

interface Props {
  productName: string;
  design: CustomDesign;
  images: CustomDesignImage[];
}

export function CustomDesignConfirmation({ productName, design, images }: Props) {
  return (
    <div className="border rounded-lg p-4 bg-blue-50/50 mt-3">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-blue-600" />
        <h4 className="font-medium text-sm">Tu diseño personalizado de {productName}</h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {images.map((img) => {
          const zoneName =
            design.templateSnapshot.zones.find((z) => z.id === img.zoneId)?.name ?? img.zoneId;
          return (
            <div key={img.zoneId} className="border rounded bg-white p-2">
              <p className="text-xs font-medium mb-1">{zoneName}</p>
              <div className="relative aspect-square">
                <Image src={img.url} alt={zoneName} fill className="object-contain" />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">Tu diseño ya está en producción.</p>
    </div>
  );
}
