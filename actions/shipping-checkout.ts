"use server";

import { prisma } from "@/lib/db";

export interface ShippingRate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  baseCost: number;
  finalCost: number;
  isFree: boolean;
  estimatedDays: string | null;
  carrier: string | null;
  timeWindow: string | null;
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
}

export interface ShippingOptionsResult {
  success: boolean;
  data: ShippingRate[];
  error?: string;
  zone?: {
    id: string;
    name: string;
  };
}

/**
 * Obtiene las tarifas de envío disponibles para un distrito y subtotal en
 * el flujo de checkout regular del carrito. Excluye las tarifas marcadas
 * como `excludeFromRegularCheckout` (reservadas para flujos COD).
 */
export async function getShippingOptionsForCheckout(
  districtCode: string,
  subtotal: number,
): Promise<ShippingOptionsResult> {
  try {
    const zoneDistrict = await prisma.shippingZoneDistrict.findUnique({
      where: { districtCode },
      include: {
        shippingZone: {
          include: {
            rates: {
              where: { active: true, excludeFromRegularCheckout: false },
              orderBy: [{ category: "asc" }, { order: "asc" }],
            },
          },
        },
      },
    });

    if (!zoneDistrict || !zoneDistrict.shippingZone.active) {
      return {
        success: false,
        data: [],
        error: "No tenemos cobertura de envío en tu distrito aún",
      };
    }

    const zone = zoneDistrict.shippingZone;
    const available = zone.rates
      .map((rate) => buildAvailableRate(rate, subtotal))
      .filter((r): r is ShippingRate => r !== null);

    if (available.length === 0) {
      return {
        success: false,
        data: [],
        error: "No hay opciones de envío disponibles para tu pedido",
        zone: { id: zone.id, name: zone.name },
      };
    }

    return {
      success: true,
      data: available,
      zone: { id: zone.id, name: zone.name },
    };
  } catch (error) {
    console.error("Error getting shipping options:", error);
    return {
      success: false,
      data: [],
      error: "Error al cargar opciones de envío",
    };
  }
}

type RawShippingRate = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  baseCost: { toString(): string } | number;
  freeShippingMin: { toString(): string } | number | null;
  minOrderAmount: { toString(): string } | number | null;
  maxOrderAmount: { toString(): string } | number | null;
  estimatedDays: string | null;
  carrier: string | null;
  timeWindow: string | null;
};

function buildAvailableRate(
  rate: RawShippingRate,
  subtotal: number,
): ShippingRate | null {
  const minAmount = rate.minOrderAmount ? Number(rate.minOrderAmount) : 0;
  const maxAmount = rate.maxOrderAmount ? Number(rate.maxOrderAmount) : Infinity;
  if (subtotal < minAmount || subtotal > maxAmount) return null;

  const baseCost = Number(rate.baseCost);
  const freeShippingMin = rate.freeShippingMin ? Number(rate.freeShippingMin) : null;

  let finalCost = baseCost;
  let isFree = false;
  if (freeShippingMin && subtotal >= freeShippingMin) {
    finalCost = 0;
    isFree = true;
  }

  return {
    id: rate.id,
    name: rate.name,
    description: rate.description,
    category: rate.category,
    baseCost,
    finalCost,
    isFree,
    estimatedDays: rate.estimatedDays,
    carrier: rate.carrier,
    timeWindow: rate.timeWindow,
    minOrderAmount: rate.minOrderAmount ? Number(rate.minOrderAmount) : null,
    maxOrderAmount: rate.maxOrderAmount ? Number(rate.maxOrderAmount) : null,
  };
}

/**
 * Tarifas disponibles para el modal COD de un producto vinculado a una
 * plantilla. Si la plantilla tiene tarifas asignadas, solo esas aparecen
 * (intersección con la zona del distrito). Si no tiene ninguna, el modal
 * cae al conjunto regular (mismo filtro que el carrito normal: excluye
 * tarifas marcadas como `excludeFromRegularCheckout`).
 */
export async function getShippingOptionsForCodForm(
  districtCode: string,
  subtotal: number,
  codFormTemplateId: string | null,
): Promise<ShippingOptionsResult> {
  try {
    const zoneDistrict = await prisma.shippingZoneDistrict.findUnique({
      where: { districtCode },
      include: { shippingZone: { select: { id: true, name: true, active: true } } },
    });

    if (!zoneDistrict || !zoneDistrict.shippingZone.active) {
      return {
        success: false,
        data: [],
        error: "No tenemos cobertura de envío en tu distrito aún",
      };
    }

    const zone = zoneDistrict.shippingZone;

    let assignedIds: string[] = [];
    if (codFormTemplateId) {
      const template = await prisma.codFormTemplate.findUnique({
        where: { id: codFormTemplateId },
        select: { shippingRates: { select: { id: true } } },
      });
      assignedIds = template?.shippingRates.map((r) => r.id) ?? [];
    }

    const useTemplateProfile = assignedIds.length > 0;
    const rates = await prisma.shippingRate.findMany({
      where: {
        zoneId: zone.id,
        active: true,
        ...(useTemplateProfile
          ? { id: { in: assignedIds } }
          : { excludeFromRegularCheckout: false }),
      },
      orderBy: [{ category: "asc" }, { order: "asc" }],
    });

    const available = rates
      .map((r) => buildAvailableRate(r, subtotal))
      .filter((r): r is ShippingRate => r !== null);

    if (available.length === 0) {
      return {
        success: false,
        data: [],
        error: "No hay opciones de envío disponibles para tu pedido",
        zone: { id: zone.id, name: zone.name },
      };
    }

    return {
      success: true,
      data: available,
      zone: { id: zone.id, name: zone.name },
    };
  } catch (error) {
    console.error("Error getting COD shipping options:", error);
    return {
      success: false,
      data: [],
      error: "Error al cargar opciones de envío",
    };
  }
}

export async function checkShippingCoverage(districtCode: string) {
  try {
    const coverage = await prisma.shippingZoneDistrict.findUnique({
      where: { districtCode },
      include: {
        shippingZone: {
          select: { id: true, name: true, active: true },
        },
      },
    });

    return {
      success: true,
      hasShipping: !!coverage && coverage.shippingZone.active,
      zone: coverage?.shippingZone || null,
    };
  } catch (error) {
    console.error("Error checking coverage:", error);
    return { success: false, hasShipping: false, zone: null };
  }
}

export async function getShippingRateDetails(rateId: string) {
  try {
    const rate = await prisma.shippingRate.findUnique({
      where: { id: rateId },
      include: { zone: true },
    });

    if (!rate) {
      return { success: false, data: null, error: "Tarifa no encontrada" };
    }

    return {
      success: true,
      data: {
        id: rate.id,
        name: rate.name,
        description: rate.description,
        category: rate.category,
        baseCost: Number(rate.baseCost),
        estimatedDays: rate.estimatedDays,
        carrier: rate.carrier,
        timeWindow: rate.timeWindow,
        zone: { id: rate.zone.id, name: rate.zone.name },
      },
    };
  } catch (error) {
    console.error("Error getting rate details:", error);
    return { success: false, data: null, error: "Error al cargar detalles de tarifa" };
  }
}

export async function calculateShippingCost(rateId: string, subtotal: number) {
  try {
    const rate = await prisma.shippingRate.findUnique({ where: { id: rateId } });

    if (!rate) {
      return { success: false, cost: 0, error: "Tarifa no encontrada" };
    }

    const baseCost = Number(rate.baseCost);
    const freeShippingMin = rate.freeShippingMin ? Number(rate.freeShippingMin) : null;

    let finalCost = baseCost;
    let isFree = false;

    if (freeShippingMin && subtotal >= freeShippingMin) {
      finalCost = 0;
      isFree = true;
    }

    return {
      success: true,
      cost: finalCost,
      baseCost,
      isFree,
      freeShippingMin,
    };
  } catch (error) {
    console.error("Error calculating shipping cost:", error);
    return { success: false, cost: 0, error: "Error al calcular costo de envío" };
  }
}
