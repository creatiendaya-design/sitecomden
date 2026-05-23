import { describe, it, expect } from "vitest";
import { solesToCents, centsToSoles, formatCardInfo } from "./culqi";

describe("solesToCents", () => {
  it("converts whole soles", () => {
    expect(solesToCents(10)).toBe(1000);
  });

  it("converts decimals with 2 places", () => {
    expect(solesToCents(199.9)).toBe(19990);
  });

  it("rounds half-cents to the nearest cent", () => {
    // Math.round breaks ties towards +Infinity: 0.5 → 1, -0.5 → 0.
    // The contract is: do not silently truncate fractional cents.
    expect(solesToCents(0.005)).toBe(1);
    expect(solesToCents(0.004)).toBe(0);
    expect(solesToCents(0.006)).toBe(1);
  });

  it("handles zero", () => {
    expect(solesToCents(0)).toBe(0);
  });

  it("survives floating-point imprecision (0.1 + 0.2)", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in JS.
    // Without rounding, *100 would give 30.000000000000004.
    expect(solesToCents(0.1 + 0.2)).toBe(30);
  });
});

describe("centsToSoles", () => {
  it("inverts solesToCents for whole values", () => {
    expect(centsToSoles(1000)).toBe(10);
  });

  it("returns decimal soles", () => {
    expect(centsToSoles(19990)).toBe(199.9);
  });

  it("round-trips with solesToCents", () => {
    for (const v of [0, 1, 10, 99.99, 199.9, 1234.56]) {
      expect(centsToSoles(solesToCents(v))).toBeCloseTo(v, 2);
    }
  });
});

describe("formatCardInfo", () => {
  it("extracts brand, last four and type", () => {
    const charge = {
      source: {
        last_four: "4242",
        iin: {
          card_brand: "Visa",
          card_type: "credit",
        },
      },
    } as Parameters<typeof formatCardInfo>[0];

    expect(formatCardInfo(charge)).toEqual({
      brand: "Visa",
      lastFour: "4242",
      type: "credit",
    });
  });

  it("falls back to 'Tarjeta' when brand is missing", () => {
    const charge = {
      source: {
        last_four: "0000",
        iin: { card_brand: "", card_type: "" },
      },
    } as Parameters<typeof formatCardInfo>[0];

    expect(formatCardInfo(charge).brand).toBe("Tarjeta");
  });

  it("falls back to 'credit' when type is missing", () => {
    const charge = {
      source: {
        last_four: "1234",
        iin: { card_brand: "Mastercard", card_type: "" },
      },
    } as Parameters<typeof formatCardInfo>[0];

    expect(formatCardInfo(charge).type).toBe("credit");
  });

  it("falls back when iin is entirely missing", () => {
    const charge = {
      source: {
        last_four: "9999",
        iin: undefined,
      },
    } as unknown as Parameters<typeof formatCardInfo>[0];

    const info = formatCardInfo(charge);
    expect(info.brand).toBe("Tarjeta");
    expect(info.type).toBe("credit");
    expect(info.lastFour).toBe("9999");
  });
});
