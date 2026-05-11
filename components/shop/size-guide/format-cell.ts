// components/shop/size-guide/format-cell.ts
import type {
  SizeGuideRow,
  SizeGuideColumn,
  SizeUnit,
} from "@/lib/size-guides/types";

export function renderCell(
  row: SizeGuideRow,
  col: SizeGuideColumn,
  displayUnit: SizeUnit,
  primaryUnit: SizeUnit,
): string {
  const primary = row.values[col.key];
  if (primary === undefined || primary === null) return "";
  if (displayUnit === primaryUnit) return String(primary);

  const override = row.overrides?.[col.key];
  if (override) return override;

  const factor = displayUnit === "in" ? 1 / 2.54 : 2.54;
  const converted = primary * factor;
  return converted.toFixed(1).replace(/\.0$/, "");
}
