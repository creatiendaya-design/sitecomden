// components/admin/size-guides/SizeGuideTableEditor.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import type {
  SizeGuideTable,
  SizeGuideRow,
  SizeUnit,
} from "@/lib/size-guides/types";

interface Props {
  value: SizeGuideTable;
  unit: SizeUnit;
  onChange: (next: SizeGuideTable) => void;
}

export function SizeGuideTableEditor({ value, unit, onChange }: Props) {
  const [showOverrides, setShowOverrides] = useState(false);
  const otherUnit: SizeUnit = unit === "cm" ? "in" : "cm";

  const addColumn = () =>
    onChange({
      ...value,
      columns: [...value.columns, { key: "", label: "" }],
    });

  const updateColumn = (i: number, patch: Partial<{ key: string; label: string }>) => {
    const cols = value.columns.slice();
    cols[i] = { ...cols[i], ...patch };
    onChange({ ...value, columns: cols });
  };

  const removeColumn = (i: number) =>
    onChange({ ...value, columns: value.columns.filter((_, j) => j !== i) });

  const addRow = () => {
    const blank: Record<string, number> = {};
    for (const c of value.columns) blank[c.key] = 0;
    onChange({
      ...value,
      rows: [...value.rows, { size: "", values: blank }],
    });
  };

  const updateRow = (i: number, patch: Partial<SizeGuideRow>) => {
    const rows = value.rows.slice();
    rows[i] = { ...rows[i], ...patch };
    onChange({ ...value, rows });
  };

  const updateRowValue = (i: number, key: string, num: number) => {
    const rows = value.rows.slice();
    rows[i] = {
      ...rows[i],
      values: { ...rows[i].values, [key]: num },
    };
    onChange({ ...value, rows });
  };

  const updateRowOverride = (i: number, key: string, str: string) => {
    const rows = value.rows.slice();
    const overrides = { ...(rows[i].overrides ?? {}) };
    if (str.trim() === "") delete overrides[key];
    else overrides[key] = str;
    rows[i] = { ...rows[i], overrides };
    onChange({ ...value, rows });
  };

  const removeRow = (i: number) =>
    onChange({ ...value, rows: value.rows.filter((_, j) => j !== i) });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Columnas (Largo, Ancho…)</Label>
        {value.columns.map((c, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={c.key}
              onChange={(e) => updateColumn(i, { key: e.target.value })}
              placeholder="key (largo)"
              className="w-32 font-mono"
            />
            <Input
              value={c.label}
              onChange={(e) => updateColumn(i, { label: e.target.value })}
              placeholder="Label (Largo)"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeColumn(i)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addColumn}>
          <Plus className="mr-1 size-4" /> Columna
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Filas — valores en {unit}</Label>
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
                onChange={(e) =>
                  updateRowValue(i, c.key, Number(e.target.value))
                }
                className="w-24"
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(i)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-1 size-4" /> Fila
        </Button>
      </div>

      <div className="border-t pt-3">
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setShowOverrides((v) => !v)}
        >
          {showOverrides ? "Ocultar" : "Editar"} overrides en {otherUnit}
        </button>

        {showOverrides && (
          <div className="space-y-2 mt-2">
            <p className="text-xs text-muted-foreground">
              Si un override está vacío, la celda se calcula automáticamente
              ({unit} → {otherUnit}). Útil para mostrar valores tipo &quot;16 ½&quot;.
            </p>
            {value.rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="w-20 text-sm">{row.size || "—"}</span>
                {value.columns.map((c) => (
                  <Input
                    key={c.key}
                    type="text"
                    value={row.overrides?.[c.key] ?? ""}
                    onChange={(e) =>
                      updateRowOverride(i, c.key, e.target.value)
                    }
                    placeholder={`auto (${otherUnit})`}
                    className="w-24"
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
