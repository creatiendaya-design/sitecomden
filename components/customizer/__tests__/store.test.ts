// components/customizer/__tests__/store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useBuilderStore } from "../store";
import type { CustomizableTemplateData, TextLayer } from "@/lib/customizer/types";

const tpl: CustomizableTemplateData = {
  id: "t1",
  name: "T",
  description: null,
  active: true,
  surcharge: 5,
  zones: [
    {
      id: "frontal",
      name: "Frontal",
      mockupImage: "x",
      bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 },
      printResolutionDPI: 300,
    },
    {
      id: "trasera",
      name: "Trasera",
      mockupImage: "y",
      bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 },
      printResolutionDPI: 300,
    },
  ],
  allowedFonts: ["Inter"],
  allowedColors: ["#000000"],
  allowCustomColors: true,
  maxLayersPerZone: 5,
  maxCharsPerLayer: 40,
};

const baseLayer = (id: string, text = "Hola"): TextLayer => ({
  id,
  type: "TEXT",
  text,
  font: "Inter",
  size: 32,
  color: "#000000",
  letterSpacing: 0,
  rotation: 0,
  x: 50,
  y: 50,
  width: 30,
  height: 5,
  align: "center",
});

describe("builder store", () => {
  beforeEach(() => useBuilderStore.getState().reset());

  it("initializes with first zone active and empty layers", () => {
    useBuilderStore.getState().load(tpl, "v1");
    expect(useBuilderStore.getState().activeZoneId).toBe("frontal");
    expect(useBuilderStore.getState().getLayersForActiveZone()).toEqual([]);
  });

  it("addLayer adds a layer to active zone and selects it", () => {
    useBuilderStore.getState().load(tpl, "v1");
    useBuilderStore.getState().addLayer(baseLayer("L1"));
    expect(useBuilderStore.getState().getLayersForActiveZone()).toHaveLength(1);
    expect(useBuilderStore.getState().selectedLayerId).toBe("L1");
  });

  it("undo reverts the last action", () => {
    useBuilderStore.getState().load(tpl, "v1");
    useBuilderStore.getState().addLayer(baseLayer("L1"));
    useBuilderStore.getState().undo();
    expect(useBuilderStore.getState().getLayersForActiveZone()).toHaveLength(0);
  });

  it("redo re-applies undone action", () => {
    useBuilderStore.getState().load(tpl, "v1");
    useBuilderStore.getState().addLayer(baseLayer("L1"));
    useBuilderStore.getState().undo();
    useBuilderStore.getState().redo();
    expect(useBuilderStore.getState().getLayersForActiveZone()).toHaveLength(1);
  });

  it("setActiveZone switches and persists layers per zone", () => {
    useBuilderStore.getState().load(tpl, "v1");
    useBuilderStore.getState().addLayer(baseLayer("L1"));
    useBuilderStore.getState().setActiveZone("trasera");
    expect(useBuilderStore.getState().getLayersForActiveZone()).toEqual([]);
    useBuilderStore.getState().setActiveZone("frontal");
    expect(useBuilderStore.getState().getLayersForActiveZone()).toHaveLength(1);
  });

  it("hasContent is true when any zone has at least 1 layer", () => {
    useBuilderStore.getState().load(tpl, "v1");
    expect(useBuilderStore.getState().hasContent()).toBe(false);
    useBuilderStore.getState().addLayer(baseLayer("L1"));
    expect(useBuilderStore.getState().hasContent()).toBe(true);
  });
});
