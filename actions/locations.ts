"use server";

import { prisma } from "@/lib/db";

/**
 * Obtener todos los departamentos de Perú
 */
export async function getDepartments() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      data: departments,
    };
  } catch (error) {
    console.error("Error fetching departments:", error);
    return {
      success: false,
      error: "Error al cargar departamentos",
      data: [],
    };
  }
}

/**
 * Obtener provincias de un departamento
 */
export async function getProvincesByDepartment(departmentId: string) {
  try {
    const provinces = await prisma.province.findMany({
      where: {
        departmentId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      data: provinces,
    };
  } catch (error) {
    console.error("Error fetching provinces:", error);
    return {
      success: false,
      error: "Error al cargar provincias",
      data: [],
    };
  }
}

/**
 * Obtener distritos de una provincia
 */
export async function getDistrictsByProvince(provinceId: string) {
  try {
    const districts = await prisma.district.findMany({
      where: {
        provinceId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      data: districts,
    };
  } catch (error) {
    console.error("Error fetching districts:", error);
    return {
      success: false,
      error: "Error al cargar distritos",
      data: [],
    };
  }
}

/**
 * Obtener información completa de una ubicación por código de distrito
 */
export async function getLocationByDistrictCode(districtCode: string) {
  try {
    const district = await prisma.district.findUnique({
      where: {
        code: districtCode,
      },
      include: {
        province: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!district) {
      return {
        success: false,
        error: "Distrito no encontrado",
        data: null,
      };
    }

    return {
      success: true,
      data: {
        district: district.name,
        province: district.province.name,
        department: district.province.department.name,
        districtCode: district.code,
        provinceCode: district.province.code,
        departmentCode: district.province.department.code,
      },
    };
  } catch (error) {
    console.error("Error fetching location:", error);
    return {
      success: false,
      error: "Error al obtener ubicación",
      data: null,
    };
  }
}

/**
 * Calcular costo de envío según distrito
 */
export async function calculateShippingCost(districtCode: string, subtotal: number) {
  try {
    // Buscar zona de envío del distrito
    const zoneDistrict = await prisma.shippingZoneDistrict.findFirst({
      where: {
        districtCode,
      },
      include: {
        shippingZone: {
          include: {
            rateGroups: {
              where: { active: true },
              include: {
                rates: {
                  where: { active: true },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!zoneDistrict || !zoneDistrict.shippingZone) {
      // Si no está en ninguna zona, retornar costo por defecto
      return {
        success: true,
        data: {
          cost: 20, // Costo por defecto para zonas no configuradas
          zoneName: "Envío nacional",
          estimatedDays: "5-7 días",
          isFreeShipping: false,
        },
      };
    }

    const zone = zoneDistrict.shippingZone;

    // Buscar el rate apropiado según el subtotal
    let selectedRate = null;

    for (const group of zone.rateGroups) {
      for (const rate of group.rates) {
        // Verificar si el subtotal está dentro del rango del rate
        const minOrder = rate.minOrderAmount ? Number(rate.minOrderAmount) : 0;
        const maxOrder = rate.maxOrderAmount ? Number(rate.maxOrderAmount) : Infinity;

        if (subtotal >= minOrder && subtotal <= maxOrder) {
          selectedRate = rate;
          break;
        }
      }
      if (selectedRate) break;
    }

    // Si no se encontró un rate específico, usar el primer rate disponible
    if (!selectedRate && zone.rateGroups.length > 0 && zone.rateGroups[0].rates.length > 0) {
      selectedRate = zone.rateGroups[0].rates[0];
    }

    if (!selectedRate) {
      // No hay rates configurados
      return {
        success: true,
        data: {
          cost: 20,
          zoneName: zone.name,
          estimatedDays: "3-5 días",
          isFreeShipping: false,
        },
      };
    }

    // Verificar si aplica envío gratis
    const freeShippingMin = selectedRate.freeShippingMin ? Number(selectedRate.freeShippingMin) : null;
    const isFreeShipping = freeShippingMin !== null && subtotal >= freeShippingMin;

    return {
      success: true,
      data: {
        cost: isFreeShipping ? 0 : Number(selectedRate.baseCost),
        zoneName: zone.name,
        rateName: selectedRate.name,
        estimatedDays: selectedRate.estimatedDays || "3-5 días",
        carrier: selectedRate.carrier || null,
        isFreeShipping,
        freeShippingMin,
      },
    };
  } catch (error) {
    console.error("Error calculating shipping cost:", error);
    return {
      success: false,
      error: "Error al calcular costo de envío",
      data: {
        cost: 20,
        zoneName: "Envío nacional",
        estimatedDays: "5-7 días",
        isFreeShipping: false,
      },
    };
  }
}

/**
 * Verificar si un distrito tiene cobertura de envío
 */
export async function checkShippingCoverage(districtCode: string) {
  try {
    const coverage = await prisma.shippingZoneDistrict.findFirst({
      where: {
        districtCode,
      },
      include: {
        shippingZone: {
          where: {
            active: true,
          },
        },
      },
    });

    return {
      success: true,
      hasCoverage: !!coverage,
      zoneName: coverage?.shippingZone?.name || null,
    };
  } catch (error) {
    console.error("Error checking shipping coverage:", error);
    return {
      success: false,
      hasCoverage: false,
      zoneName: null,
    };
  }
}