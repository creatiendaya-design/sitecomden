// lib/customizer/__tests__/default-fonts.test.ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_FONTS,
  POPULAR_FONT_KEYS,
  getFontByKey,
  getFontsByCategory,
} from "../default-fonts";
import { FONT_CATEGORIES } from "../types";

describe("default-fonts", () => {
  it("contains exactly 60 fonts", () => {
    expect(DEFAULT_FONTS).toHaveLength(60);
  });

  it("has unique keys", () => {
    const keys = DEFAULT_FONTS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has 16 sans-serif, 12 serif, 16 display, 10 handwriting, 6 monospace", () => {
    expect(getFontsByCategory("sans-serif")).toHaveLength(16);
    expect(getFontsByCategory("serif")).toHaveLength(12);
    expect(getFontsByCategory("display")).toHaveLength(16);
    expect(getFontsByCategory("handwriting")).toHaveLength(10);
    expect(getFontsByCategory("monospace")).toHaveLength(6);
  });

  it("every category in FONT_CATEGORIES is used", () => {
    for (const cat of FONT_CATEGORIES) {
      expect(getFontsByCategory(cat).length).toBeGreaterThan(0);
    }
  });

  it("POPULAR_FONT_KEYS has 8 entries, all valid", () => {
    expect(POPULAR_FONT_KEYS).toHaveLength(8);
    for (const key of POPULAR_FONT_KEYS) {
      expect(getFontByKey(key)).toBeDefined();
    }
  });

  it("getFontByKey returns undefined for unknown", () => {
    expect(getFontByKey("FuenteInventada")).toBeUndefined();
  });
});
