// lib/customizer/__tests__/validate.test.ts
import { describe, it, expect } from "vitest";
import { validateCustomDesign, customDesignSchema } from "../validate";
import type { CustomDesign, CustomDesignSnapshot } from "../types";

const baseSnapshot: CustomDesignSnapshot = {
  allowedFonts: ["Inter", "Roboto"],
  allowedColors: ["#000000", "#FFFFFF"],
  allowCustomColors: false,
  maxLayersPerZone: 3,
  maxCharsPerLayer: 20,
  surcharge: 5,
  zones: [
    { id: "frontal", name: "Frontal", bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 } },
  ],
};

const validDesign: CustomDesign = {
  templateId: "tpl_1",
  templateSnapshot: baseSnapshot,
  zones: [
    {
      zoneId: "frontal",
      layers: [
        {
          id: "l1", type: "TEXT", text: "Hola",
          font: "Inter", size: 32, color: "#000000",
          letterSpacing: 0, rotation: 0,
          x: 50, y: 50, width: 30, height: 5,
          align: "center",
        },
      ],
    },
  ],
};

describe("validateCustomDesign", () => {
  it("accepts a valid design", () => {
    expect(validateCustomDesign(validDesign).success).toBe(true);
  });

  it("rejects a design with no layers in any zone", () => {
    const d = { ...validDesign, zones: [{ zoneId: "frontal", layers: [] }] };
    const r = validateCustomDesign(d);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/al menos una/i);
  });

  it("rejects font outside allowedFonts", () => {
    const d = structuredClone(validDesign);
    d.zones[0].layers[0].font = "FuentePirata";
    expect(validateCustomDesign(d).success).toBe(false);
  });

  it("rejects color outside allowedColors when allowCustomColors=false", () => {
    const d = structuredClone(validDesign);
    d.zones[0].layers[0].color = "#FF00FF";
    expect(validateCustomDesign(d).success).toBe(false);
  });

  it("accepts custom hex color when allowCustomColors=true", () => {
    const d = structuredClone(validDesign);
    d.templateSnapshot.allowCustomColors = true;
    d.zones[0].layers[0].color = "#FF00FF";
    expect(validateCustomDesign(d).success).toBe(true);
  });

  it("rejects text longer than maxCharsPerLayer", () => {
    const d = structuredClone(validDesign);
    d.zones[0].layers[0].text = "x".repeat(21);
    expect(validateCustomDesign(d).success).toBe(false);
  });

  it("rejects more layers than maxLayersPerZone", () => {
    const d = structuredClone(validDesign);
    d.zones[0].layers = Array.from({ length: 4 }, (_, i) => ({
      ...validDesign.zones[0].layers[0], id: `l${i}`,
    }));
    expect(validateCustomDesign(d).success).toBe(false);
  });

  it("rejects unknown zoneId", () => {
    const d = structuredClone(validDesign);
    d.zones[0].zoneId = "lateral";
    expect(validateCustomDesign(d).success).toBe(false);
  });

  it("rejects font size out of range", () => {
    const d = structuredClone(validDesign);
    d.zones[0].layers[0].size = 7;
    expect(validateCustomDesign(d).success).toBe(false);
  });
});
