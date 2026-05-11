// lib/size-guides/types.ts

export type SizeUnit = "cm" | "in";

export interface SizeGuideMarker {
  key: string;
  label: string;
  description: string;
}

export interface SizeGuideTab {
  id: string;
  title: string;
  imageUrl: string | null;
  intro: string | null;
  markers: SizeGuideMarker[];
}

export interface SizeGuideColumn {
  key: string;
  label: string;
}

export interface SizeGuideRow {
  size: string;
  values: Record<string, number>;
  overrides?: Record<string, string>;
}

export interface SizeGuideTable {
  columns: SizeGuideColumn[];
  rows: SizeGuideRow[];
}

export interface SizeGuideData {
  id: string;
  name: string;
  unit: SizeUnit;
  tabs: SizeGuideTab[];
  table: SizeGuideTable;
  active: boolean;
}

export interface SizeGuideListItem {
  id: string;
  name: string;
  unit: SizeUnit;
  active: boolean;
  productCount: number;
  updatedAt: Date;
}
