// lib/customizer/types.ts

export type ElementType = "TEXT"; // extensible: | "IMAGE" | "CLIPART"

export interface BoundsPct {
  xPct: number;       // 0-100
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface PrintZone {
  id: string;
  name: string;
  mockupImage: string;
  bounds: BoundsPct;
  printResolutionDPI: number;
}

export interface SizeGuideRow {
  size: string;
  values: Record<string, number>;
}

export interface SizeGuide {
  unit: "cm" | "in";
  columns: { key: string; label: string }[];
  rows: SizeGuideRow[];
  notes?: string;
}

export interface CustomizableTemplateData {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  surcharge: number | null;
  zones: PrintZone[];
  allowedFonts: string[];
  allowedColors: string[];
  allowCustomColors: boolean;
  sizeGuide: SizeGuide | null;
  maxLayersPerZone: number;
  maxCharsPerLayer: number;
}

export interface TextLayer {
  id: string;
  type: "TEXT";
  text: string;
  font: string;
  size: number;
  color: string;
  letterSpacing: number;
  rotation: number;
  x: number;       // pct of mockup
  y: number;
  width: number;
  height: number;
  align: "left" | "center" | "right";
}

export interface CustomDesignZone {
  zoneId: string;
  layers: TextLayer[];
}

export interface CustomDesignSnapshot {
  allowedFonts: string[];
  allowedColors: string[];
  allowCustomColors: boolean;
  maxLayersPerZone: number;
  maxCharsPerLayer: number;
  surcharge: number | null;
  zones: Array<{
    id: string;
    name: string;
    bounds: { xPct: number; yPct: number; widthPct: number; heightPct: number };
  }>;
}

export interface CustomDesign {
  templateId: string;
  templateSnapshot: CustomDesignSnapshot;
  zones: CustomDesignZone[];
}

export interface CustomDesignImage {
  zoneId: string;
  url: string;
}

export interface MockupOverrides {
  axisOptionId: string;
  mockups: {
    [zoneId: string]: {
      [productOptionValueId: string]: string;
    };
  };
}

export const FONT_CATEGORIES = [
  "sans-serif",
  "serif",
  "display",
  "handwriting",
  "monospace",
] as const;

export type FontCategory = (typeof FONT_CATEGORIES)[number];

export interface FontDef {
  key: string;
  family: string;
  category: FontCategory;
  popular?: boolean;
}

export interface ColorDef {
  hex: string;
  name: string;
  group: string;
}
