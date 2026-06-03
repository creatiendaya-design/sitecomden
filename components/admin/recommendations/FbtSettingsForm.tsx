"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { saveFbtConfig } from "@/actions/fbt-settings";
import type { FbtConfig, FbtAddMode } from "@/lib/recommendations/fbt-settings";

const MODE_LABELS: Record<FbtAddMode, string> = {
  individual: "Sugerir (botón por producto)",
  add_all: "Agregar todos (sin descuento)",
  add_all_discount: "Agregar todos + descuento (próximamente)",
};

export default function FbtSettingsForm({ initial }: { initial: FbtConfig }) {
  const [config, setConfig] = useState<FbtConfig>(initial);
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<FbtConfig>) => setConfig((c) => ({ ...c, ...p }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveFbtConfig(config);
      if (res.success) toast.success("Configuración guardada");
      else toast.error(res.error ?? "No se pudo guardar");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Mostrar sección</Label>
          <p className="text-sm text-muted-foreground">
            Activa la sección &quot;Comprados juntos&quot; en las fichas de
            producto.
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(v) => patch({ enabled: v })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fbt-title">Título de la sección</Label>
        <Input
          id="fbt-title"
          value={config.title}
          onChange={(e) => patch({ title: e.target.value })}
          maxLength={80}
          placeholder="Comprados juntos"
        />
      </div>

      <div className="space-y-2">
        <Label>Cómo se agregan los productos</Label>
        <Select
          value={config.mode}
          onValueChange={(v) => patch({ mode: v as FbtAddMode })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MODE_LABELS) as FbtAddMode[]).map((m) => (
              <SelectItem key={m} value={m}>
                {MODE_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fbt-limit">Productos a mostrar</Label>
          <Input
            id="fbt-limit"
            type="number"
            min={1}
            max={8}
            value={config.limit}
            onChange={(e) => patch({ limit: Number(e.target.value) })}
          />
        </div>

        {config.mode === "add_all_discount" && (
          <div className="space-y-2">
            <Label htmlFor="fbt-discount">Descuento del combo (%)</Label>
            <Input
              id="fbt-discount"
              type="number"
              min={0}
              max={90}
              value={config.discountPercent}
              onChange={(e) =>
                patch({ discountPercent: Number(e.target.value) })
              }
            />
          </div>
        )}
      </div>

      {config.mode === "add_all_discount" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Aún no aplica descuento.</strong> Por ahora este modo agrega
          el combo a precio normal (igual que &quot;Agregar todos&quot;). El
          descuento real se activará al integrarlo con el motor de promociones
          (Fase E); no se aplica todavía para no cobrar un total distinto al
          mostrado.
        </p>
      )}

      <Button onClick={handleSave} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Guardando…" : "Guardar configuración"}
      </Button>
    </div>
  );
}
