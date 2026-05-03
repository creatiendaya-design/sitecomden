// components/admin/size-guides/SizeGuideForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createSizeGuide, updateSizeGuide } from "@/actions/size-guides";
import { SizeGuideTabsEditor } from "./SizeGuideTabsEditor";
import { SizeGuideTableEditor } from "./SizeGuideTableEditor";
import type {
  SizeGuideData,
  SizeGuideTab,
  SizeGuideTable,
  SizeUnit,
} from "@/lib/size-guides/types";

interface Props {
  initial: SizeGuideData | null;
}

export function SizeGuideForm({ initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState<SizeUnit>(initial?.unit ?? "cm");
  const [active, setActive] = useState(initial?.active ?? true);
  const [tabs, setTabs] = useState<SizeGuideTab[]>(initial?.tabs ?? []);
  const [table, setTable] = useState<SizeGuideTable>(
    initial?.table ?? { columns: [], rows: [] },
  );

  const onSubmit = () => {
    if (!name.trim()) {
      toast.error("Nombre requerido");
      return;
    }
    start(async () => {
      const payload = { name: name.trim(), unit, active, tabs, table };
      if (initial) {
        const r = await updateSizeGuide(initial.id, payload);
        if (r.success) {
          toast.success("Guía guardada");
          router.refresh();
        } else toast.error(r.error);
      } else {
        const r = await createSizeGuide(payload);
        if (r.success) {
          toast.success("Guía creada");
          router.push(`/admin/guia-tallas/${r.data.id}`);
        } else toast.error(r.error);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Configuración</h3>
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Unidad principal</Label>
            <div className="flex gap-2 mt-1">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={unit === "cm"}
                  onChange={() => setUnit("cm")}
                />
                cm
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={unit === "in"}
                  onChange={() => setUnit("in")}
                />
                in
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label>Activa</Label>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Pestañas</h3>
          <SizeGuideTabsEditor value={tabs} onChange={setTabs} />
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Encuentra tu talla — Tabla</h3>
          <SizeGuideTableEditor value={table} unit={unit} onChange={setTable} />
        </Card>

        <Button onClick={onSubmit} disabled={pending} className="w-full">
          {pending
            ? "Guardando…"
            : initial
              ? "Guardar cambios"
              : "Crear guía"}
        </Button>
      </div>
    </div>
  );
}
