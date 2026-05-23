import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatNumber,
  formatDate,
  formatPercent,
} from "./format";
import { isSupportedLocale, isSupportedCurrency } from "./types";

// Intl output varies between runtimes (Node 18 vs 22, CLDR version) on
// non-breaking-space vs regular-space and on rounding. We assert on the
// numeric/currency content rather than exact whitespace where it matters.

describe("formatPrice", () => {
  it("formats PEN in es-PE by default", () => {
    const out = formatPrice(199.9);
    expect(out).toContain("199");
    expect(out).toMatch(/S\/|PEN/);
  });

  it("respects an explicit currency override", () => {
    const out = formatPrice(199.9, { currency: "USD", locale: "en-US" });
    expect(out).toMatch(/\$199\.90/);
  });

  it("supports EUR with the es-ES locale", () => {
    const out = formatPrice(199.9, { currency: "EUR", locale: "es-ES" });
    expect(out).toContain("199");
    expect(out).toMatch(/€|EUR/);
  });

  it("returns 'Gratis' for zero when freeWhenZero is enabled", () => {
    expect(formatPrice(0, { freeWhenZero: true })).toBe("Gratis");
  });

  it("returns 'Free' for zero when freeWhenZero is enabled in English", () => {
    expect(formatPrice(0, { freeWhenZero: true, locale: "en-US" })).toBe(
      "Free",
    );
  });

  it("formats zero normally when freeWhenZero is off", () => {
    expect(formatPrice(0)).not.toBe("Gratis");
    expect(formatPrice(0)).toMatch(/0/);
  });

  it("omits currency symbol when noCurrency is true", () => {
    const out = formatPrice(1234.56, { noCurrency: true });
    expect(out).not.toMatch(/S\/|PEN|\$|€/);
    expect(out).toMatch(/1[.,]234[.,]56/);
  });

  it("honors fraction digit overrides", () => {
    const out = formatPrice(99.999, {
      currency: "USD",
      locale: "en-US",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    expect(out).toBe("$100");
  });
});

describe("formatNumber", () => {
  it("formats with the default locale", () => {
    expect(formatNumber(1234.5)).toMatch(/1[.,]234[.,]5/);
  });

  it("uses comma as decimal in en-US", () => {
    expect(formatNumber(1234.5, { locale: "en-US" })).toBe("1,234.5");
  });
});

describe("formatDate", () => {
  it("formats a Date in es-PE (medium style by default)", () => {
    const out = formatDate(new Date("2026-05-23T12:00:00Z"));
    // medium style in es-PE typically renders e.g. "23 may 2026"
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/may|23/);
  });

  it("accepts ISO strings", () => {
    const out = formatDate("2026-01-15T00:00:00Z", { locale: "en-US" });
    expect(out).toMatch(/2026/);
  });

  it("accepts numeric timestamps", () => {
    const ts = new Date("2026-06-01T00:00:00Z").getTime();
    const out = formatDate(ts);
    expect(out).toMatch(/2026/);
  });
});

describe("formatPercent", () => {
  // Intl percent spacing varies by Node/CLDR — assert on the numeric
  // content + symbol, not exact whitespace.
  it("formats 0.15 as 15%", () => {
    const out = formatPercent(0.15);
    expect(out).toMatch(/15\s?%/);
  });

  it("rounds to the configured fractionDigits", () => {
    const out = formatPercent(0.1234, { fractionDigits: 1 });
    // es-PE may render with either '.' or ',' as decimal separator
    expect(out).toMatch(/12[.,]3\s?%/);
  });
});

describe("isSupportedLocale", () => {
  it("accepts known locales", () => {
    expect(isSupportedLocale("es-PE")).toBe(true);
    expect(isSupportedLocale("en-US")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isSupportedLocale("fr-FR")).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(isSupportedLocale(42)).toBe(false);
  });
});

describe("isSupportedCurrency", () => {
  it("accepts known currencies", () => {
    expect(isSupportedCurrency("PEN")).toBe(true);
    expect(isSupportedCurrency("USD")).toBe(true);
    expect(isSupportedCurrency("EUR")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isSupportedCurrency("GBP")).toBe(false);
    expect(isSupportedCurrency("")).toBe(false);
    expect(isSupportedCurrency(null)).toBe(false);
  });
});
