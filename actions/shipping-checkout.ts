"use server";

import { prisma } from "@/lib/db";

// Tipos de retorno
export interface ShippingRate {
  id: string;
  name: string;
  description: string | null;
  baseCost: number;
  finalCost: number; // Después de aplicar envío gratis
  isFree: boolean;
  estimatedDays: string | null;
  carrier: string | null;
  timeWindow: string | null;
  groupId: string;
  groupName: string;
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
}

export interface ShippingGroup {
  id: string;
  name: string;
  description: string | null;
  rates: ShippingRate[];
}

export interface ShippingOptionsResult {
  success: boolean;
  data: ShippingGroup[];
  error?: string;
  zone?: {
    id: string;
    name: string;
  };
}

/**
 * Obtiene las opciones de envío disponibles para un distrito y subtotal
 * @param districtCode - Código UBIGEO del distrito (ej: "150131" para Miraflores)
 * @param subtotal - Subtotal del carrito en soles
 */
export async function getShippingOptionsForCheckout(
  districtCode: string,
  subtotal: number
): Promise<ShippingOptionsResult> {
  try {
    // 1. Buscar la zona que contiene este distrito
    const zoneDistrict = await prisma.shippingZoneDistrict.findUnique({
      where: { districtCode },
      include: {
        shippingZone: {  // ← CORREGIDO: era "zone", ahora "shippingZone"
          include: {
            rateGroups: {
              where: { active: true },
              include: {
                rates: {
                  where: { active: true },
                  orderBy: { order: "asc" },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    // Si no hay zona para este distrito
    if (!zoneDistrict || !zoneDistrict.shippingZone.active) {
      return {
        success: false,
        data: [],
        error: "No tenemos cobertura de envío en tu distrito aún",
      };
    }

    const zone = zoneDistrict.shippingZone;

    // 2. Procesar grupos y tarifas
    const groups: ShippingGroup[] = [];

    for (const group of zone.rateGroups) {
      const availableRates: ShippingRate[] = [];

      for (const rate of group.rates) {
        // Verificar si la tarifa aplica según el subtotal
        const minAmount = rate.minOrderAmount
          ? Number(rate.minOrderAmount)
          : 0;
        const maxAmount = rate.maxOrderAmount
          ? Number(rate.maxOrderAmount)
          : Infinity;

        // Si el subtotal está fuera del rango, skip
        if (subtotal < minAmount || subtotal > maxAmount) {
          continue;
        }

        // Calcular costo final (considerar envío gratis)
        const baseCost = Number(rate.baseCost);
        const freeShippingMin = rate.freeShippingMin
          ? Number(rate.freeShippingMin)
          : null;

        let finalCost = baseCost;
        let isFree = false;

        if (freeShippingMin && subtotal >= freeShippingMin) {
          finalCost = 0;
          isFree = true;
        }

        availableRates.push({
          id: rate.id,
          name: rate.name,
          description: rate.description,
          baseCost: baseCost,
          finalCost: finalCost,
          isFree: isFree,
          estimatedDays: rate.estimatedDays,
          carrier: rate.carrier,
          timeWindow: rate.timeWindow,
          groupId: group.id,
          groupName: group.name,
          minOrderAmount: rate.minOrderAmount
            ? Number(rate.minOrderAmount)
            : null,
          maxOrderAmount: rate.maxOrderAmount
            ? Number(rate.maxOrderAmount)
            : null,
        });
      }

      // Solo agregar grupo si tiene tarifas disponibles
      if (availableRates.length > 0) {
        groups.push({
          id: group.id,
          name: group.name,
          description: group.description,
          rates: availableRates,
        });
      }
    }

    // Si no hay opciones disponibles
    if (groups.length === 0) {
      return {
        success: false,
        data: [],
        error: "No hay opciones de envío disponibles para tu pedido",
        zone: {
          id: zone.id,
          name: zone.name,
        },
      };
    }

    return {
      success: true,
      data: groups,
      zone: {
        id: zone.id,
        name: zone.name,
      },
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

/**
 * Verifica si un distrito tiene cobertura de envío
 * @param districtCode - Código UBIGEO del distrito
 */
export async function checkShippingCoverage(districtCode: string) {
  try {
    const coverage = await prisma.shippingZoneDistrict.findUnique({
      where: { districtCode },
      include: {
        shippingZone: {  // ← CORREGIDO: era "zone", ahora "shippingZone"
          select: {
            id: true,
            name: true,
            active: true,
          },
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
    return {
      success: false,
      hasShipping: false,
      zone: null,
    };
  }
}

/**
 * Obtiene los detalles de una tarifa específica
 * @param rateId - ID de la tarifa
 */
export async function getShippingRateDetails(rateId: string) {
  try {
    const rate = await prisma.shippingRate.findUnique({
      where: { id: rateId },
      include: {
        group: {
          include: {
            zone: true,  // ← Este sí es correcto (ShippingRateGroup → zone)
          },
        },
      },
    });

    if (!rate) {
      return {
        success: false,
        data: null,
        error: "Tarifa no encontrada",
      };
    }

    return {
      success: true,
      data: {
        id: rate.id,
        name: rate.name,
        description: rate.description,
        baseCost: Number(rate.baseCost),
        estimatedDays: rate.estimatedDays,
        carrier: rate.carrier,
        timeWindow: rate.timeWindow,
        group: {
          id: rate.group.id,
          name: rate.group.name,
        },
        zone: {
          id: rate.group.zone.id,
          name: rate.group.zone.name,
        },
      },
    };
  } catch (error) {
    console.error("Error getting rate details:", error);
    return {
      success: false,
      data: null,
      error: "Error al cargar detalles de tarifa",
    };
  }
}

/**
 * Calcula el costo final de envío para una tarifa y subtotal
 * @param rateId - ID de la tarifa
 * @param subtotal - Subtotal del carrito
 */
export async function calculateShippingCost(
  rateId: string,
  subtotal: number
) {
  try {
    const rate = await prisma.shippingRate.findUnique({
      where: { id: rateId },
    });

    if (!rate) {
      return {
        success: false,
        cost: 0,
        error: "Tarifa no encontrada",
      };
    }

    const baseCost = Number(rate.baseCost);
    const freeShippingMin = rate.freeShippingMin
      ? Number(rate.freeShippingMin)
      : null;

    let finalCost = baseCost;
    let isFree = false;

    if (freeShippingMin && subtotal >= freeShippingMin) {
      finalCost = 0;
      isFree = true;
    }

    return {
      success: true,
      cost: finalCost,
      baseCost: baseCost,
      isFree: isFree,
      freeShippingMin: freeShippingMin,
    };
  } catch (error) {
    console.error("Error calculating shipping cost:", error);
    return {
      success: false,
      cost: 0,
      error: "Error al calcular costo de envío",
    };
  }
}