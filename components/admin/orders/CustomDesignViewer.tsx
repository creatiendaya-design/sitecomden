// components/admin/orders/CustomDesignViewer.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { CustomDesign, CustomDesignImage } from "@/lib/customizer/types";

interface CustomDesignViewerProps {
  orderId: string;
  itemId: string;
  design: CustomDesign;
  images: CustomDesignImage[];
}

export function CustomDesignViewer({
  orderId,
  itemId,
  design,
  images,
}: CustomDesignViewerProps) {
  return (
    <div className="border rounded-lg p-4 mt-3 bg-blue-50/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Diseño personalizado</h4>
        <Link
          href={`/admin/personalizables/${design.templateId}`}
          className="text-xs text-blue-600 hover:underline"
        >
          Ver plantilla →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {images.map((img) => {
          const zoneName =
            design.templateSnapshot.zones.find((z) => z.id === img.zoneId)
              ?.name ?? img.zoneId;
          return (
            <div key={img.zoneId} className="border rounded bg-white p-2">
              <p className="text-xs font-medium mb-1">{zoneName}</p>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="block w-full" type="button">
                    <div className="relative aspect-square">
                      <Image
                        src={img.url}
                        alt={zoneName}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <div className="relative aspect-square">
                    <Image
                      src={img.url}
                      alt={zoneName}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <Button asChild>
                    <a
                      href={img.url}
                      download={`orden-${orderId}-item-${itemId}-${img.zoneId}.png`}
                    >
                      <Download className="size-4 mr-2" /> Descargar PNG
                    </a>
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </div>

      <details>
        <summary className="text-sm font-medium cursor-pointer">
          Detalles textuales del diseño
        </summary>
        <div className="text-xs space-y-2 mt-2 font-mono">
          {design.zones.map((zone) => {
            const zoneName =
              design.templateSnapshot.zones.find((z) => z.id === zone.zoneId)
                ?.name ?? zone.zoneId;
            return (
              <div key={zone.zoneId}>
                <p className="font-semibold">{zoneName}:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-2">
                  {zone.layers.map((layer) => (
                    <li key={layer.id}>
                      &quot;{layer.text}&quot; · {layer.font} {layer.size}px ·{" "}
                      {layer.color} · {layer.align}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
