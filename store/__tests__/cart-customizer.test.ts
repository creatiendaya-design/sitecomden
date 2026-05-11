// store/__tests__/cart-customizer.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "../cart";
import type { CustomDesign } from "@/lib/customizer/types";

const baseSnapshot = {
  allowedFonts: ["Inter"],
  allowedColors: ["#000000"],
  allowCustomColors: true,
  maxLayersPerZone: 5,
  maxCharsPerLayer: 40,
  surcharge: 5,
  zones: [
    {
      id: "frontal",
      name: "Frontal",
      bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 },
    },
  ],
};

const fakeDesign: CustomDesign = {
  templateId: "t1",
  templateSnapshot: baseSnapshot,
  zones: [{ zoneId: "frontal", layers: [] }],
};

describe("cart store with customDesign", () => {
  beforeEach(() => useCartStore.getState().clearCart());

  it("does not merge custom item with non-custom item of same product", () => {
    useCartStore.getState().addItem({
      id: "p1",
      productId: "p1",
      name: "Polo",
      slug: "polo",
      price: 39.9,
      maxStock: 10,
    });
    useCartStore.getState().addItem({
      id: "p1::cd1",
      productId: "p1",
      name: "Polo (personalizado)",
      slug: "polo",
      price: 44.9,
      maxStock: 10,
      customDesignId: "cd1",
      customDesign: fakeDesign,
      customDesignImages: [],
    });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("does not merge two custom items with different customDesignId", () => {
    useCartStore.getState().addItem({
      id: "p1::cd1",
      productId: "p1",
      name: "P",
      slug: "p",
      price: 44.9,
      maxStock: 10,
      customDesignId: "cd1",
      customDesign: fakeDesign,
      customDesignImages: [],
    });
    useCartStore.getState().addItem({
      id: "p1::cd2",
      productId: "p1",
      name: "P",
      slug: "p",
      price: 44.9,
      maxStock: 10,
      customDesignId: "cd2",
      customDesign: fakeDesign,
      customDesignImages: [],
    });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("replaceCustomItem updates design without duplicating", () => {
    useCartStore.getState().addItem({
      id: "p1::cd1",
      productId: "p1",
      name: "P",
      slug: "p",
      price: 44.9,
      maxStock: 10,
      customDesignId: "cd1",
      customDesign: fakeDesign,
      customDesignImages: [],
    });
    useCartStore.getState().updateQuantity("p1::cd1", 3);
    const newDesign = {
      ...fakeDesign,
      zones: [{ zoneId: "frontal", layers: [] }],
    };
    useCartStore
      .getState()
      .replaceCustomItem("p1::cd1", newDesign, [
        { zoneId: "frontal", url: "https://x.public.blob.vercel-storage.com/y.png" },
      ]);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    expect(useCartStore.getState().items[0].customDesignImages?.[0].url).toContain("y.png");
  });
});
