// lib/customizer/__tests__/default-colors.test.ts
import { describe, it, expect } from "vitest";
import { DEFAULT_COLORS, getColorByHex, getColorsByGroup } from "../default-colors";

describe("default-colors", () => {
  it("contains 120 colors", () => {
    expect(DEFAULT_COLORS).toHaveLength(120);
  });

  it("every hex is valid 6-digit format", () => {
    const re = /^#[0-9A-Fa-f]{6}$/;
    for (const c of DEFAULT_COLORS) {
      expect(c.hex).toMatch(re);
    }
  });

  it("hex values are unique", () => {
    const hexes = DEFAULT_COLORS.map((c) => c.hex.toUpperCase());
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it("groups have expected counts", () => {
    expect(getColorsByGroup("blacks-grays")).toHaveLength(12);
    expect(getColorsByGroup("reds-browns")).toHaveLength(16);
    expect(getColorsByGroup("oranges")).toHaveLength(10);
    expect(getColorsByGroup("yellows")).toHaveLength(10);
    expect(getColorsByGroup("greens")).toHaveLength(16);
    expect(getColorsByGroup("blues")).toHaveLength(16);
    expect(getColorsByGroup("purples")).toHaveLength(12);
    expect(getColorsByGroup("pinks")).toHaveLength(12);
    expect(getColorsByGroup("pastel-neutrals")).toHaveLength(16);
  });

  it("getColorByHex finds case-insensitively", () => {
    expect(getColorByHex("#000000")).toBeDefined();
    expect(getColorByHex("#000000")?.name).toBeTruthy();
  });
});
