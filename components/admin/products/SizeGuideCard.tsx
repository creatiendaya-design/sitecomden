// components/admin/products/SizeGuideCard.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { listActiveSizeGuides } from "@/actions/size-guides";

interface Option {
  id: string;
  name: string;
  unit: "cm" | "in";
}

interface Props {
  value: string | null;
  onChange: (next: string | null) => void;
}

export function SizeGuideCard({ value, onChange }: Props) {
  const [opts, setOpts] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listActiveSizeGuides().then((r) => {
      if (r.success) setOpts(r.data);
      setLoading(false);
    });
  }, []);

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold">Guía de tallas</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div>
          <Label>Asignar guía</Label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          >
            <option value="">Sin guía</option>
            {opts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.unit})
              </option>
            ))}
          </select>
        </div>
      )}
      <Link
        href="/admin/guia-tallas/nueva"
        target="_blank"
        className="text-xs text-blue-600 hover:underline"
      >
        + Crear nueva guía
      </Link>
    </Card>
  );
}
