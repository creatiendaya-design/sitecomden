// components/shop/size-guide/SizeGuideTable.tsx
"use client";

import { useState } from "react";
import { renderCell } from "./format-cell";
import type {
  SizeGuideTable as TableData,
  SizeUnit,
} from "@/lib/size-guides/types";

interface Props {
  table: TableData;
  primaryUnit: SizeUnit;
}

export function SizeGuideTable({ table, primaryUnit }: Props) {
  const [displayUnit, setDisplayUnit] = useState<SizeUnit>(primaryUnit);

  if (table.columns.length === 0 || table.rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setDisplayUnit("in")}
          className={
            displayUnit === "in"
              ? "font-semibold border-b-2 border-foreground pb-0.5"
              : "text-muted-foreground"
          }
        >
          Pulgadas
        </button>
        <button
          type="button"
          onClick={() => setDisplayUnit("cm")}
          className={
            displayUnit === "cm"
              ? "font-semibold border-b-2 border-foreground pb-0.5"
              : "text-muted-foreground"
          }
        >
          Centímetros
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4 uppercase text-xs">Etiqueta de talla</th>
              {table.columns.map((c) => (
                <th key={c.key} className="py-2 pr-4 uppercase text-xs">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{row.size}</td>
                {table.columns.map((col) => (
                  <td key={col.key} className="py-2 pr-4">
                    {renderCell(row, col, displayUnit, primaryUnit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
