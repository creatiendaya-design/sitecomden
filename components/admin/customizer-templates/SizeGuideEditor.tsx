// components/admin/customizer-templates/SizeGuideEditor.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

// Legacy type — kept inline because the shared SizeGuide type was moved to
// lib/size-guides/types.ts. This component is no longer used (replaced by the
// per-product size guide picker) and will be deleted in Phase 8.
interface SizeGuide {
  unit: "cm" | "in";
  columns: { key: string; label: string }[];
  rows: { size: string; values: Record<string, number> }[];
  notes?: string;
}

interface SizeGuideEditorProps {
  value: SizeGuide | null;
  onChange: (next: SizeGuide | null) => void;
}

export function SizeGuideEditor({ value, onChange }: SizeGuideEditorProps) {
  if (!value) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange({
            unit: "cm",
            columns: [
              { key: "chest", label: "Pecho" },
              { key: "length", label: "Largo" },
            ],
            rows: [{ size: "S", values: { chest: 0, length: 0 } }],
          })
        }
      >
        + Añadir tabla de medidas
      </Button>
    );
  }

  const updateColumn = (i: number, patch: Partial<SizeGuide["columns"][0]>) => {
    const cols = value.columns.slice();
    cols[i] = { ...cols[i], ...patch };
    onChange({ ...value, columns: cols });
  };

  const updateRow = (i: number, patch: Partial<SizeGuide["rows"][0]>) => {
    const rows = value.rows.slice();
    rows[i] = { ...rows[i], ...patch };
    onChange({ ...value, rows });
  };

  const updateRowValue = (rowIdx: number, key: string, val: number) => {
    const rows = value.rows.slice();
    rows[rowIdx] = {
      ...rows[rowIdx],
      values: { ...rows[rowIdx].values, [key]: val },
    };
    onChange({ ...value, rows });
  };

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-3">
        <Label>Unidad:</Label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={value.unit}
          onChange={(e) => onChange({ ...value, unit: e.target.value as "cm" | "in" })}
        >
          <option value="cm">cm</option>
          <option value="in">in</option>
        </select>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <Trash2 className="size-4 mr-1" /> Quitar tabla
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Columnas</Label>
        {value.columns.map((c, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={c.key}
              onChange={(e) => updateColumn(i, { key: e.target.value })}
              placeholder="key"
              className="w-32 font-mono"
            />
            <Input
              value={c.label}
              onChange={(e) => updateColumn(i, { label: e.target.value })}
              placeholder="Label"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                onChange({
                  ...value,
                  columns: value.columns.filter((_, j) => j !== i),
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({ ...value, columns: [...value.columns, { key: "", label: "" }] })
          }
        >
          + Columna
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Filas</Label>
        {value.rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={row.size}
              onChange={(e) => updateRow(i, { size: e.target.value })}
              placeholder="S/M/L"
              className="w-20"
            />
            {value.columns.map((c) => (
              <Input
                key={c.key}
                type="number"
                value={row.values[c.key] ?? 0}
                onChange={(e) => updateRowValue(i, c.key, Number(e.target.value))}
                className="w-24"
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                onChange({
                  ...value,
                  rows: value.rows.filter((_, j) => j !== i),
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({ ...value, rows: [...value.rows, { size: "", values: {} }] })
          }
        >
          + Fila
        </Button>
      </div>
    </div>
  );
}
