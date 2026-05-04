// components/admin/size-guides/SizeGuideTableEditor.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

  const handleRemoveColumn = (i: number) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("¿Eliminar esta columna? Los valores asociados se perderán.")
    ) {
      return;
    }
    removeColumn(i);
  };

  const handleRemoveRow = (i: number) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("¿Eliminar esta fila?")
    ) {
      return;
    }
    removeRow(i);
  };

  // Empty state — no columns yet.
  if (value.columns.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border border-dashed rounded-md py-10 px-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            Añade una columna para empezar
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addColumn}>
            <Plus className="mr-1 size-4" /> Columna
          </Button>
        </div>
      </div>
    );
  }

  const cellInputClass =
    "w-full border-0 bg-transparent px-1 py-0.5 text-sm focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring rounded-sm";

  return (
    <div className="space-y-3">
      <div className="border rounded-md overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {/* Static "Etiqueta de talla" header */}
              <th className="border-b border-r p-2 text-left align-top w-32 bg-slate-100">
                <div className="text-sm font-medium">Etiqueta de talla</div>
                <div className="font-mono text-xs text-muted-foreground">
                  size
                </div>
              </th>

              {/* Editable column headers */}
              {value.columns.map((c, i) => (
                <th
                  key={i}
                  className="group border-b border-r p-2 text-left align-top relative min-w-[120px]"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveColumn(i)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    aria-label="Eliminar columna"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <input
                    value={c.label}
                    onChange={(e) =>
                      updateColumn(i, { label: e.target.value })
                    }
                    placeholder="Etiqueta"
                    className={`${cellInputClass} font-medium pr-5`}
                  />
                  <input
                    value={c.key}
                    onChange={(e) =>
                      updateColumn(i, { key: e.target.value })
                    }
                    placeholder="key"
                    className={`${cellInputClass} font-mono text-xs text-muted-foreground`}
                  />
                </th>
              ))}

              {/* Override column headers (when toggle ON) */}
              {showOverrides &&
                value.columns.map((c, i) => (
                  <th
                    key={`ovh-${i}`}
                    className="border-b border-r p-2 text-left align-top min-w-[110px] bg-muted/30"
                  >
                    <div className="text-sm font-medium text-muted-foreground truncate">
                      {(c.label || c.key || "—") + ` (${otherUnit})`}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground/70">
                      override
                    </div>
                  </th>
                ))}

              {/* Add column action */}
              <th className="border-b p-0 w-10 bg-slate-50">
                <button
                  type="button"
                  onClick={addColumn}
                  className="w-full h-full flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors py-2"
                  aria-label="Añadir columna"
                >
                  <Plus className="size-4" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {value.rows.map((row, i) => (
              <tr key={i} className="group/row hover:bg-muted/20">
                {/* Size label cell */}
                <td className="border-b border-r p-2 align-middle">
                  <input
                    value={row.size}
                    onChange={(e) => updateRow(i, { size: e.target.value })}
                    placeholder="S / M / L"
                    className={cellInputClass}
                  />
                </td>

                {/* Numeric value cells */}
                {value.columns.map((c) => (
                  <td
                    key={c.key}
                    className="border-b border-r p-2 align-middle"
                  >
                    <input
                      type="number"
                      value={row.values[c.key] ?? 0}
                      onChange={(e) =>
                        updateRowValue(i, c.key, Number(e.target.value))
                      }
                      className={cellInputClass}
                    />
                  </td>
                ))}

                {/* Override cells (when toggle ON) */}
                {showOverrides &&
                  value.columns.map((c) => (
                    <td
                      key={`ov-${c.key}`}
                      className="border-b border-r p-2 align-middle bg-muted/30"
                    >
                      <input
                        type="text"
                        value={row.overrides?.[c.key] ?? ""}
                        onChange={(e) =>
                          updateRowOverride(i, c.key, e.target.value)
                        }
                        placeholder={`auto (${otherUnit})`}
                        className={cellInputClass}
                      />
                    </td>
                  ))}

                {/* Row delete action */}
                <td className="border-b p-2 align-middle text-center w-10">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(i)}
                    className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    aria-label="Eliminar fila"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {/* Ghost "+ Añadir fila" row */}
            <tr>
              <td
                colSpan={
                  1 +
                  value.columns.length +
                  (showOverrides ? value.columns.length : 0) +
                  1
                }
                className="p-0"
              >
                <button
                  type="button"
                  onClick={addRow}
                  className="w-full text-left text-muted-foreground hover:bg-muted/50 hover:text-foreground cursor-pointer text-sm py-2 px-3 transition-colors flex items-center gap-1"
                >
                  <Plus className="size-3.5" /> Añadir fila
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showOverrides}
            onChange={(e) => setShowOverrides(e.target.checked)}
          />
          Mostrar overrides en {otherUnit}
        </label>

        {showOverrides && (
          <p className="text-xs text-muted-foreground mt-1">
            Si un override está vacío, la celda se calcula automáticamente
            ({unit} → {otherUnit}). Útil para mostrar valores como &quot;16 ½&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
