// lib/customizer/__tests__/pricing.test.ts
import { describe, it, expect } from "vitest";
import { calculateCustomizedPrice, getPriceBreakdown } from "../pricing";

describe("pricing", () => {
  it("returns base price when no surcharge", () => {
    expect(calculateCustomizedPrice(39.9, null)).toBe(39.9);
  });

  it("adds surcharge when present", () => {
    expect(calculateCustomizedPrice(39.9, 5)).toBe(44.9);
  });

  it("treats surcharge=0 same as null", () => {
    expect(calculateCustomizedPrice(39.9, 0)).toBe(39.9);
  });

  it("handles decimal precision", () => {
    expect(calculateCustomizedPrice(39.99, 5.51)).toBeCloseTo(45.5, 2);
  });

  it("getPriceBreakdown returns base/surcharge/total", () => {
    expect(getPriceBreakdown(39.9, 5)).toEqual({ base: 39.9, surcharge: 5, total: 44.9 });
    expect(getPriceBreakdown(39.9, null)).toEqual({ base: 39.9, surcharge: 0, total: 39.9 });
  });
});
