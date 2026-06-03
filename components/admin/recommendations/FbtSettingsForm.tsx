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
import Link from "next/link";
import { Save, Tag } from "lucide-react";
import { toast } from "sonner";
import { saveFbtConfig } from "@/actions/fbt-settings";
import type { FbtConfig, FbtAddMode } from "@/lib/recommendations/fbt-settings";

// Discounts are handled by the BUNDLE promotion engine (server-validated), not
// by this section. Only the two no-discount add modes are offered here.
const MODE_LABELS: Record<"individual" | "add_all", string> = {
  individual: "Sugerir (botón por producto)",
  add_all: "Agregar todos",
};

export default function FbtSettingsForm({ initial }: { initial: FbtConfig }) {
  // Legacy configs may still hold "add_all_discount"; normalize to "add_all"
  // (the section never applied a real discount — bundles do that now).
  const [config, setConfig] = useState<FbtConfig>({
    ...initial,
    mode: initial.mode === "add_all_discount" ? "add_all" : initial.mode,
  });
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
            {(Object.keys(MODE_LABELS) as Array<"individual" | "add_all">).map(
              (m) => (
                <SelectItem key={m} value={m}>
                  {MODE_LABELS[m]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fbt-limit">Productos a mostrar</Label>
        <Input
          id="fbt-limit"
          type="number"
          min={1}
          max={8}
          value={config.limit}
          onChange={(e) => patch({ limit: Number(e.target.value) })}
          className="w-32"
        />
      </div>

      <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        <Tag className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">¿Quieres descuento en combos?</p>
          <p className="mt-1 text-blue-700">
            Crea una promoción tipo <strong>Bundle</strong> en{" "}
            <Link
              href="/admin/promociones"
              className="underline underline-offset-2"
            >
              Promociones
            </Link>
            . El descuento se valida en el checkout y se muestra automáticamente
            en la ficha del producto.
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Guardando…" : "Guardar configuración"}
      </Button>
    </div>
  );
}
