// components/admin/products/CustomizationCard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { listCustomizableTemplates } from "@/actions/customizer";
import type {
  CustomizableTemplateData,
  MockupOverrides,
} from "@/lib/customizer/types";
import { MockupOverridesGrid } from "./MockupOverridesGrid";

interface ProductOptionLite {
  id: string;
  name: string;
  values: { id: string; value: string; swatch?: string | null }[];
}

interface CustomizationCardProps {
  productSlug?: string;
  templateId: string | null;
  overrides: MockupOverrides | null;
  options: ProductOptionLite[];
  onTemplateChange: (id: string | null) => void;
  onOverridesChange: (v: MockupOverrides | null) => void;
}

export function CustomizationCard({
  productSlug,
  templateId,
  overrides,
  options,
  onTemplateChange,
  onOverridesChange,
}: CustomizationCardProps) {
  const [templates, setTemplates] = useState<CustomizableTemplateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCustomizableTemplates().then((t) => {
      setTemplates(t.filter((x) => x.active));
      setLoading(false);
    });
  }, []);

  const selected = templates.find((t) => t.id === templateId);

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold">Personalización</h3>

      <div>
        <Label>Plantilla de personalización</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <select
            className="w-full border rounded px-2 py-1.5 mt-1"
            value={templateId ?? ""}
            onChange={(e) => onTemplateChange(e.target.value || null)}
          >
            <option value="">— Sin personalización —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {selected && (
        <>
          <div className="text-xs text-muted-foreground">
            ↳ {selected.zones.length} zona
            {selected.zones.length !== 1 ? "s" : ""}
            {selected.zones.length > 0 &&
              ` (${selected.zones.map((z) => z.name).join(", ")})`}
            {selected.surcharge
              ? ` · Sobrecargo S/ ${selected.surcharge.toFixed(2)}`
              : " · Sin sobrecargo"}
            {" "}
            <Link
              href={`/admin/personalizables/${selected.id}`}
              className="text-blue-600 hover:underline"
            >
              Editar plantilla →
            </Link>
          </div>

          <div className="border-t pt-3">
            <Label className="block mb-2">Mockups por color (opcional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Si dejas vacío, se usará el mockup de la plantilla.
            </p>
            <MockupOverridesGrid
              zones={selected.zones}
              options={options}
              value={overrides}
              onChange={onOverridesChange}
            />
          </div>

          {productSlug && (
            <Button type="button" variant="outline" asChild>
              <Link
                href={`/productos/${productSlug}/personalizar?preview=admin`}
                target="_blank"
              >
                Vista previa de la experiencia →
              </Link>
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
