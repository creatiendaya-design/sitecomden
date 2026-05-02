"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { PrintZone, MockupOverrides } from "@/lib/customizer/types";

interface ProductOptionLite {
  id: string;
  name: string;
  values: { id: string; value: string; swatch?: string | null }[];
}

interface MockupOverridesGridProps {
  zones: PrintZone[];
  options: ProductOptionLite[];
  value: MockupOverrides | null;
  onChange: (next: MockupOverrides | null) => void;
}

export function MockupOverridesGrid({
  zones,
  options,
  value,
  onChange,
}: MockupOverridesGridProps) {
  const [uploading, setUploading] = useState<string | null>(null);

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este producto no tiene opciones (color/talla). Añade opciones primero.
      </p>
    );
  }

  const axis = value?.axisOptionId
    ? options.find((o) => o.id === value.axisOptionId)
    : null;

  const setAxis = (axisOptionId: string) => {
    onChange({ axisOptionId, mockups: value?.mockups ?? {} });
  };

  const handleUpload = async (zoneId: string, valueId: string, file: File) => {
    if (!value) return;
    setUploading(`${zoneId}-${valueId}`);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(null);
    if (!json.url) {
      toast.error(json.error ?? "Error al subir");
      return;
    }
    const next: MockupOverrides = {
      axisOptionId: value.axisOptionId,
      mockups: {
        ...(value.mockups ?? {}),
        [zoneId]: {
          ...(value.mockups[zoneId] ?? {}),
          [valueId]: json.url,
        },
      },
    };
    onChange(next);
  };

  const removeMockup = (zoneId: string, valueId: string) => {
    if (!value) return;
    const zoneMap = { ...(value.mockups[zoneId] ?? {}) };
    delete zoneMap[valueId];
    onChange({
      ...value,
      mockups: { ...value.mockups, [zoneId]: zoneMap },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Opción que cambia el mockup</Label>
        <select
          className="w-full border rounded px-2 py-1.5 mt-1"
          value={value?.axisOptionId ?? ""}
          onChange={(e) =>
            e.target.value ? setAxis(e.target.value) : onChange(null)
          }
        >
          <option value="">— Sin overrides (usar mockup de plantilla) —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {axis && zones.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">{axis.name}</th>
                {zones.map((z) => (
                  <th key={z.id} className="text-left p-2">
                    {z.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {axis.values.map((val) => (
                <tr key={val.id} className="border-t">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {val.swatch && (
                        <span
                          className="size-4 rounded-full border"
                          style={{ backgroundColor: val.swatch }}
                        />
                      )}
                      {val.value}
                    </div>
                  </td>
                  {zones.map((z) => {
                    const url = value?.mockups[z.id]?.[val.id];
                    const key = `${z.id}-${val.id}`;
                    return (
                      <td key={z.id} className="p-2">
                        {url ? (
                          <div className="relative size-16">
                            <Image
                              src={url}
                              alt=""
                              fill
                              className="object-cover rounded"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 size-6"
                              onClick={() => removeMockup(z.id, val.id)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="block size-16 border-2 border-dashed rounded cursor-pointer hover:bg-muted text-center text-xs flex items-center justify-center">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                e.target.files?.[0] &&
                                handleUpload(z.id, val.id, e.target.files[0])
                              }
                            />
                            {uploading === key ? "..." : "+ Subir"}
                          </label>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
