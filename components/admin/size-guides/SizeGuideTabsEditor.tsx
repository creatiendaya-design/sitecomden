// components/admin/size-guides/SizeGuideTabsEditor.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import Image from "next/image";
import { SizeGuideMarkersEditor } from "./SizeGuideMarkersEditor";
import type { SizeGuideTab } from "@/lib/size-guides/types";

interface Props {
  value: SizeGuideTab[];
  onChange: (next: SizeGuideTab[]) => void;
}

export function SizeGuideTabsEditor({ value, onChange }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const addTab = () => {
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        title: "Nueva pestaña",
        imageUrl: null,
        intro: null,
        markers: [],
      },
    ]);
    setOpenIdx(value.length);
  };

  const updateTab = (i: number, patch: Partial<SizeGuideTab>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const removeTab = (i: number) => {
    if (!confirm("¿Eliminar esta pestaña?")) return;
    onChange(value.filter((_, j) => j !== i));
    if (openIdx === i) setOpenIdx(null);
  };

  const handleUpload = async (i: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.url) updateTab(i, { imageUrl: json.url });
    else toast.error(json.error ?? "Error al subir imagen");
  };

  return (
    <div className="space-y-3">
      {value.map((tab, i) => {
        const open = openIdx === i;
        return (
          <Card key={tab.id} className="p-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                className="text-muted-foreground"
              >
                {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              <Input
                value={tab.title}
                onChange={(e) => updateTab(i, { title: e.target.value })}
                placeholder="Título de pestaña"
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeTab(i)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {open && (
              <div className="space-y-3 mt-3">
                <div>
                  <Label>Imagen</Label>
                  {tab.imageUrl ? (
                    <div className="relative size-40 rounded border bg-white">
                      <Image
                        src={tab.imageUrl}
                        alt={tab.title}
                        fill
                        className="object-contain"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 bg-white/80"
                        onClick={() => updateTab(i, { imageUrl: null })}
                      >
                        Quitar
                      </Button>
                    </div>
                  ) : (
                    <label className="block border-2 border-dashed rounded p-4 text-center cursor-pointer hover:bg-muted text-sm">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files?.[0] && handleUpload(i, e.target.files[0])
                        }
                      />
                      Subir imagen
                    </label>
                  )}
                </div>

                <div>
                  <Label>Intro (opcional)</Label>
                  <Textarea
                    value={tab.intro ?? ""}
                    onChange={(e) =>
                      updateTab(i, { intro: e.target.value || null })
                    }
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Marcadores (A, B, C…)</Label>
                  <SizeGuideMarkersEditor
                    value={tab.markers}
                    onChange={(m) => updateTab(i, { markers: m })}
                  />
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addTab}>
        <Plus className="mr-1 size-4" /> Añadir pestaña
      </Button>
    </div>
  );
}
