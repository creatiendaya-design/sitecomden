// components/admin/customizer-templates/TemplateForm.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { ZoneEditor } from "./ZoneEditor";
import { FontsCatalogPicker } from "./FontsCatalogPicker";
import { ColorsPaletteEditor } from "./ColorsPaletteEditor";
import {
  saveCustomizableTemplate,
  updateCustomizableTemplate,
} from "@/actions/customizer";
import type {
  CustomizableTemplateData,
  PrintZone,
} from "@/lib/customizer/types";
import { DEFAULT_FONTS } from "@/lib/customizer/default-fonts";
import { DEFAULT_COLORS } from "@/lib/customizer/default-colors";

interface TemplateFormProps {
  initial: CustomizableTemplateData | null;
}

const newZone = (): PrintZone => ({
  id: crypto.randomUUID(),
  name: "Nueva zona",
  mockupImage: "",
  bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 },
  printResolutionDPI: 300,
});

export function TemplateForm({ initial }: TemplateFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [data, setData] = useState<Omit<CustomizableTemplateData, "id">>({
    name: initial?.name ?? "",
    description: initial?.description ?? null,
    active: initial?.active ?? true,
    surcharge: initial?.surcharge ?? null,
    zones: initial?.zones ?? [],
    allowedFonts: initial?.allowedFonts ?? DEFAULT_FONTS.map((f) => f.key),
    allowedColors: initial?.allowedColors ?? DEFAULT_COLORS.map((c) => c.hex),
    allowCustomColors: initial?.allowCustomColors ?? true,
    maxLayersPerZone: initial?.maxLayersPerZone ?? 8,
    maxCharsPerLayer: initial?.maxCharsPerLayer ?? 40,
  });

  const updateZone = (i: number, patch: Partial<PrintZone>) => {
    const zones = data.zones.slice();
    zones[i] = { ...zones[i], ...patch };
    setData({ ...data, zones });
  };

  const handleMockupUpload = async (i: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.url) updateZone(i, { mockupImage: json.url });
    else toast.error(json.error ?? "Error al subir mockup");
  };

  const onSubmit = () => {
    start(async () => {
      const result = initial
        ? await updateCustomizableTemplate(initial.id, data)
        : await saveCustomizableTemplate(data);
      if (result.success) {
        toast.success(initial ? "Plantilla actualizada" : "Plantilla creada");
        if (!initial) router.push(`/admin/personalizables/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Información básica</h3>
          <div>
            <Label>Nombre</Label>
            <Input
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={data.description ?? ""}
              onChange={(e) =>
                setData({ ...data, description: e.target.value || null })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={data.active}
              onCheckedChange={(v) => setData({ ...data, active: v })}
            />
            <Label>Activa</Label>
          </div>
          <div>
            <Label>Sobrecargo (S/) — vacío = sin cobro extra</Label>
            <Input
              type="number"
              step="0.01"
              value={data.surcharge ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  surcharge: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Máx. capas por zona</Label>
              <Input
                type="number"
                value={data.maxLayersPerZone}
                onChange={(e) =>
                  setData({ ...data, maxLayersPerZone: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Máx. caracteres</Label>
              <Input
                type="number"
                value={data.maxCharsPerLayer}
                onChange={(e) =>
                  setData({ ...data, maxCharsPerLayer: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={data.allowCustomColors}
              onCheckedChange={(v) => setData({ ...data, allowCustomColors: v })}
            />
            <Label>Permitir color personalizado al cliente</Label>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Fuentes permitidas</h3>
          <FontsCatalogPicker
            selected={data.allowedFonts}
            onChange={(v) => setData({ ...data, allowedFonts: v })}
          />
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Colores permitidos</h3>
          <ColorsPaletteEditor
            selected={data.allowedColors}
            onChange={(v) => setData({ ...data, allowedColors: v })}
          />
        </Card>

        <Card className="p-4 text-sm text-muted-foreground">
          La guía de tallas ahora se asigna desde el producto.{" "}
          <Link
            href="/admin/guia-tallas"
            className="text-blue-600 hover:underline"
          >
            Ir a guías de tallas →
          </Link>
        </Card>

        <Button onClick={onSubmit} disabled={pending} className="w-full">
          {pending
            ? "Guardando…"
            : initial
            ? "Guardar cambios"
            : "Crear plantilla"}
        </Button>
      </div>

      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Zonas de impresión ({data.zones.length})
            </h3>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                setData({ ...data, zones: [...data.zones, newZone()] })
              }
            >
              <Plus className="size-4 mr-1" /> Zona
            </Button>
          </div>
          {data.zones.map((zone, i) => (
            <Card key={zone.id} className="p-3 space-y-2 bg-muted/30">
              <div className="flex gap-2 items-center">
                <Input
                  value={zone.name}
                  onChange={(e) => updateZone(i, { name: e.target.value })}
                  placeholder="Nombre zona"
                />
                <Input
                  type="number"
                  value={zone.printResolutionDPI}
                  onChange={(e) =>
                    updateZone(i, { printResolutionDPI: Number(e.target.value) })
                  }
                  className="w-24"
                />
                <Label className="text-xs">DPI</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setData({
                      ...data,
                      zones: data.zones.filter((_, j) => j !== i),
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {!zone.mockupImage ? (
                <label className="block border-2 border-dashed rounded p-6 text-center cursor-pointer hover:bg-muted">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleMockupUpload(i, e.target.files[0])
                    }
                  />
                  Subir mockup
                </label>
              ) : (
                <ZoneEditor
                  zone={zone}
                  onChange={(z) => updateZone(i, z)}
                />
              )}
            </Card>
          ))}
        </Card>
      </div>
    </div>
  );
}
