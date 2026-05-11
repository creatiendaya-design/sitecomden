import { describe, it, expect } from "vitest";
import { validateCartItemDesign, type CartItemForValidation } from "../customizer-checkout";

const baseSnapshot = {
  allowedFonts: ["Inter"],
  allowedColors: ["#000000"],
  allowCustomColors: false,
  maxLayersPerZone: 5,
  maxCharsPerLayer: 40,
  surcharge: 5,
  zones: [{ id: "frontal", name: "Frontal", bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 } }],
};

const validCartItem: CartItemForValidation = {
  productId: "p1",
  customDesign: {
    templateId: "t1",
    templateSnapshot: baseSnapshot,
    zones: [
      {
        zoneId: "frontal",
        layers: [{
          id: "l1", type: "TEXT" as const, text: "Hola", font: "Inter",
          size: 32, color: "#000000", letterSpacing: 0, rotation: 0,
          x: 50, y: 50, width: 30, height: 5, align: "center" as const,
        }],
      },
    ],
  },
  customDesignImages: [{ zoneId: "frontal", url: "https://x.public.blob.vercel-storage.com/img.png" }],
};

describe("validateCartItemDesign", () => {
  it("accepts a valid item", () => {
    const r = validateCartItemDesign(validCartItem, "t1");
    expect(r.success).toBe(true);
  });

  it("accepts an item without custom design (non-customized product)", () => {
    const r = validateCartItemDesign({ productId: "p1" }, null);
    expect(r.success).toBe(true);
  });

  it("rejects when product template id mismatch", () => {
    const r = validateCartItemDesign(validCartItem, "different-template");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/plantilla/i);
  });

  it("rejects URL outside Vercel Blob domain", () => {
    const item = { ...validCartItem, customDesignImages: [{ zoneId: "frontal", url: "https://evil.com/x.png" }] };
    const r = validateCartItemDesign(item, "t1");
    expect(r.success).toBe(false);
  });

  it("delegates body validation to validateCustomDesign (rejects bad font)", () => {
    const item = structuredClone(validCartItem);
    if (item.customDesign) item.customDesign.zones[0].layers[0].font = "FuentePirata";
    const r = validateCartItemDesign(item, "t1");
    expect(r.success).toBe(false);
  });
});
