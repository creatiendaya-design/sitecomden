import { describe, it, expect } from "vitest";
import { buildNubefactItem, buildTotals } from "./sunat-igv";

describe("buildNubefactItem - GRAVADO with pricesIncludeIgv=true", () => {
  it("extracts IGV from a price that already includes it", () => {
    const item = buildNubefactItem({
      description: "Camiseta",
      sku: "TEE-001",
      quantity: 1,
      unitPrice: 118,
      igvType: "GRAVADO",
      pricesIncludeIgv: true,
    });

    expect(item.valor_unitario).toBe(100);
    expect(item.precio_unitario).toBe(118);
    expect(item.igv).toBe(18);
    expect(item.subtotal).toBe(100);
    expect(item.total).toBe(118);
    expect(item.tipo_de_igv).toBe(1);
  });

  it("scales correctly with quantity", () => {
    const item = buildNubefactItem({
      description: "Camiseta",
      sku: null,
      quantity: 3,
      unitPrice: 118,
      igvType: "GRAVADO",
      pricesIncludeIgv: true,
    });

    expect(item.subtotal).toBe(300);
    expect(item.igv).toBe(54);
    expect(item.total).toBe(354);
  });
});

describe("buildNubefactItem - GRAVADO with pricesIncludeIgv=false", () => {
  it("adds IGV on top of the price", () => {
    const item = buildNubefactItem({
      description: "Polo",
      sku: "POL-002",
      quantity: 2,
      unitPrice: 100,
      igvType: "GRAVADO",
      pricesIncludeIgv: false,
    });

    expect(item.valor_unitario).toBe(100);
    expect(item.precio_unitario).toBe(118);
    expect(item.igv).toBe(36);
    expect(item.subtotal).toBe(200);
    expect(item.total).toBe(236);
  });
});

describe("buildNubefactItem - EXONERADO / INAFECTO", () => {
  it("emits zero IGV for EXONERADO", () => {
    const item = buildNubefactItem({
      description: "Libro",
      sku: "BOOK-1",
      quantity: 1,
      unitPrice: 50,
      igvType: "EXONERADO",
      pricesIncludeIgv: false,
    });

    expect(item.igv).toBe(0);
    expect(item.subtotal).toBe(50);
    expect(item.total).toBe(50);
    expect(item.tipo_de_igv).toBe(2);
  });

  it("emits zero IGV for INAFECTO", () => {
    const item = buildNubefactItem({
      description: "Servicio",
      sku: null,
      quantity: 1,
      unitPrice: 75,
      igvType: "INAFECTO",
      pricesIncludeIgv: false,
    });

    expect(item.igv).toBe(0);
    expect(item.tipo_de_igv).toBe(3);
  });
});

describe("buildNubefactItem - defaults", () => {
  it("uses 'GEN' as código when sku is null", () => {
    const item = buildNubefactItem({
      description: "Generic",
      sku: null,
      quantity: 1,
      unitPrice: 10,
      igvType: "GRAVADO",
      pricesIncludeIgv: false,
    });
    expect(item.codigo).toBe("GEN");
  });

  it("uses 'NIU' as unidad_de_medida", () => {
    const item = buildNubefactItem({
      description: "x",
      sku: "x",
      quantity: 1,
      unitPrice: 10,
      igvType: "GRAVADO",
      pricesIncludeIgv: false,
    });
    expect(item.unidad_de_medida).toBe("NIU");
  });
});

describe("buildTotals", () => {
  it("aggregates totals across mixed IGV types", () => {
    const items = [
      buildNubefactItem({
        description: "Gravado",
        sku: null,
        quantity: 2,
        unitPrice: 100,
        igvType: "GRAVADO",
        pricesIncludeIgv: false,
      }),
      buildNubefactItem({
        description: "Exonerado",
        sku: null,
        quantity: 1,
        unitPrice: 50,
        igvType: "EXONERADO",
        pricesIncludeIgv: false,
      }),
      buildNubefactItem({
        description: "Inafecto",
        sku: null,
        quantity: 1,
        unitPrice: 25,
        igvType: "INAFECTO",
        pricesIncludeIgv: false,
      }),
    ];

    const totals = buildTotals(items);
    expect(totals.totalGravada).toBe(200);
    expect(totals.totalExonerada).toBe(50);
    expect(totals.totalInafecta).toBe(25);
    expect(totals.totalIgv).toBe(36);
    expect(totals.total).toBe(311);
  });

  it("returns zeros for an empty cart", () => {
    expect(buildTotals([])).toEqual({
      totalGravada: 0,
      totalInafecta: 0,
      totalExonerada: 0,
      totalIgv: 0,
      total: 0,
    });
  });
});
