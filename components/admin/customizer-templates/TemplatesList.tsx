// components/admin/customizer-templates/TemplatesList.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import type { CustomizableTemplateData } from "@/lib/customizer/types";

interface TemplatesListProps {
  templates: CustomizableTemplateData[];
}

export function TemplatesList({ templates }: TemplatesListProps) {
  if (templates.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        Aún no hay plantillas. Crea la primera con &quot;Nueva plantilla&quot;.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((tpl) => {
        const firstZone = tpl.zones[0];
        return (
          <Link
            key={tpl.id}
            href={`/admin/personalizables/${tpl.id}`}
            className="border rounded-lg overflow-hidden hover:shadow-md transition"
          >
            <div className="aspect-square bg-muted relative">
              {firstZone?.mockupImage ? (
                <Image src={firstZone.mockupImage} alt={tpl.name} fill className="object-contain" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Sin mockup
                </div>
              )}
              {!tpl.active && (
                <span className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  Inactiva
                </span>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold truncate">{tpl.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {tpl.zones.length} zona{tpl.zones.length !== 1 ? "s" : ""}
                {tpl.surcharge ? ` · S/ ${tpl.surcharge.toFixed(2)} sobrecargo` : ""}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
