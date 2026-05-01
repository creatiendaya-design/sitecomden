// lib/customizer/pricing.ts

export function calculateCustomizedPrice(basePrice: number, surcharge: number | null): number {
  if (!surcharge || surcharge <= 0) return basePrice;
  return Math.round((basePrice + surcharge) * 100) / 100;
}

export interface PriceBreakdown {
  base: number;
  surcharge: number;
  total: number;
}

export function getPriceBreakdown(basePrice: number, surcharge: number | null): PriceBreakdown {
  const sc = surcharge && surcharge > 0 ? surcharge : 0;
  return {
    base: basePrice,
    surcharge: sc,
    total: Math.round((basePrice + sc) * 100) / 100,
  };
}
