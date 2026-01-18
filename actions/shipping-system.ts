"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ============================================================
// SHIPPING ZONES (Zonas Geográficas)
// ============================================================

/**
 * Obtener todas las zonas
 * ✅ ACTUALIZADO: Ahora incluye rateCount
 */
export async function getShippingZones() {
  try {
    const zones = await prisma.shippingZone.findMany({
      include: {
        districts: {
          select: { id: true },
        },
        rateGroups: {
          // ✅ CAMBIO AQUÍ: Incluir rates para contar
          select: { 
            id: true,
            rates: {
              select: { id: true }
            }
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: zones.map((zone) => ({
        ...zone,
        districtCount: zone.districts.length,
        groupCount: zone.rateGroups.length,
        // ✅ CAMBIO AQUÍ: Agregar rateCount
        rateCount: zone.rateGroups.reduce(
          (total, group) => total + group.rates.length,
          0
        ),
      })),
    };
  } catch (error) {
    console.error("Error fetching zones:", error);
    return { success: false, error: "Error al cargar zonas", data: [] };
  }
}

/**
 * Obtener zona por ID
 */
export async function getShippingZoneById(id: string) {
  try {
    const zone = await prisma.shippingZone.findUnique({
      where: { id },
      include: {
        districts: true,
        rateGroups: {
          include: {
            rates: true,
          },
        },
      },
    });

    if (!zone) {
      return { success: false, error: "Zona no encontrada", data: null };
    }

    return { success: true, data: zone };
  } catch (error) {
    console.error("Error fetching zone:", error);
    return { success: false, error: "Error al cargar zona", data: null };
  }
}

/**
 * Crear zona
 */
export async function createShippingZone(data: {
  name: string;
  description?: string;
  active: boolean;
}) {
  try {
    const zone = await prisma.shippingZone.create({
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
      },
    });

    revalidatePath("/admin/envios/zonas");

    return {
      success: true,
      data: zone,
      message: "Zona creada exitosamente",
    };
  } catch (error) {
    console.error("Error creating zone:", error);
    return { success: false, error: "Error al crear zona", data: null };
  }
}

/**
 * Actualizar zona
 */
export async function updateShippingZone(
  id: string,
  data: {
    name?: string;
    description?: string;
    active?: boolean;
  }
) {
  try {
    const zone = await prisma.shippingZone.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/admin/envios/zonas");
    revalidatePath(`/admin/envios/zonas/${id}`);

    return {
      success: true,
      data: zone,
      message: "Zona actualizada exitosamente",
    };
  } catch (error) {
    console.error("Error updating zone:", error);
    return { success: false, error: "Error al actualizar zona", data: null };
  }
}

/**
 * Eliminar zona
 */
export async function deleteShippingZone(id: string) {
  try {
    // Verificar si tiene grupos
    const zone = await prisma.shippingZone.findUnique({
      where: { id },
      include: { rateGroups: true, districts: true },
    });

    if (!zone) {
      return { success: false, error: "Zona no encontrada" };
    }

    if (zone.rateGroups.length > 0) {
      return {
        success: false,
        error: `No se puede eliminar. La zona tiene ${zone.rateGroups.length} grupos de tarifas.`,
      };
    }

    await prisma.shippingZone.delete({ where: { id } });

    revalidatePath("/admin/envios/zonas");

    return { success: true, message: "Zona eliminada exitosamente" };
  } catch (error) {
    console.error("Error deleting zone:", error);
    return { success: false, error: "Error al eliminar zona" };
  }
}

/**
 * Toggle estado de zona
 */
export async function toggleShippingZoneStatus(id: string, active: boolean) {
  try {
    await prisma.shippingZone.update({
      where: { id },
      data: { active },
    });

    revalidatePath("/admin/envios/zonas");

    return {
      success: true,
      message: `Zona ${active ? "activada" : "desactivada"}`,
    };
  } catch (error) {
    console.error("Error toggling zone:", error);
    return { success: false, error: "Error al cambiar estado" };
  }
}

// ============================================================
// ZONE DISTRICTS (Asignación de Distritos)
// ============================================================

/**
 * Asignar distrito a zona
 */
export async function assignDistrictToZone(
  zoneId: string,
  districtCode: string
) {
  try {
    // Verificar si ya está asignado
    const existing = await prisma.shippingZoneDistrict.findFirst({
      where: { districtCode },
      include: { shippingZone: true },
    });

    if (existing) {
      return {
        success: false,
        error: `Este distrito ya está en "${existing.shippingZone.name}"`,
      };
    }

    await prisma.shippingZoneDistrict.create({
      data: { shippingZoneId: zoneId, districtCode },
    });

    revalidatePath(`/admin/envios/zonas/${zoneId}/distritos`);

    return { success: true, message: "Distrito asignado" };
  } catch (error) {
    console.error("Error assigning district:", error);
    return { success: false, error: "Error al asignar distrito" };
  }
}

/**
 * Quitar distrito de zona
 */
export async function removeDistrictFromZone(
  zoneId: string,
  districtCode: string
) {
  try {
    await prisma.shippingZoneDistrict.deleteMany({
      where: { shippingZoneId: zoneId, districtCode },
    });

    revalidatePath(`/admin/envios/zonas/${zoneId}/distritos`);

    return { success: true, message: "Distrito removido" };
  } catch (error) {
    console.error("Error removing district:", error);
    return { success: false, error: "Error al remover distrito" };
  }
}

/**
 * Obtener distritos de una zona
 */
export async function getZoneDistricts(zoneId: string) {
  try {
    const assignments = await prisma.shippingZoneDistrict.findMany({
      where: { shippingZoneId: zoneId },
    });

    const districtCodes = assignments.map((a) => a.districtCode);
    const districts = await prisma.district.findMany({
      where: { code: { in: districtCodes } },
      include: {
        province: {
          include: { department: true },
        },
      },
    });

    return {
      success: true,
      data: districts.map((d) => ({
        code: d.code,
        name: d.name,
        province: d.province.name,
        department: d.province.department.name,
      })),
    };
  } catch (error) {
    console.error("Error fetching zone districts:", error);
    return { success: false, error: "Error al cargar distritos", data: [] };
  }
}

/**
 * Buscar distritos disponibles
 */
export async function searchAvailableDistricts(
  query: string,
  limit: number = 20
) {
  try {
    const assignedCodes = await prisma.shippingZoneDistrict.findMany({
      select: { districtCode: true },
    });
    const assignedSet = new Set(assignedCodes.map((a) => a.districtCode));

    const districts = await prisma.district.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query } },
        ],
      },
      include: {
        province: { include: { department: true } },
      },
      take: limit,
    });

    const available = districts
      .filter((d) => !assignedSet.has(d.code))
      .map((d) => ({
        code: d.code,
        name: d.name,
        province: d.province.name,
        department: d.province.department.name,
        fullName: `${d.name} (${d.province.name} - ${d.province.department.name})`,
      }));

    return { success: true, data: available };
  } catch (error) {
    console.error("Error searching districts:", error);
    return { success: false, error: "Error al buscar", data: [] };
  }
}

// ============================================================
// RATE GROUPS (Grupos de Tarifas)
// ============================================================

/**
 * Obtener grupos de una zona
 */
export async function getRateGroupsByZone(zoneId: string) {
  try {
    const groups = await prisma.shippingRateGroup.findMany({
      where: { zoneId },
      include: {
        rates: {
          select: { id: true },
        },
      },
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      data: groups.map((g) => ({
        ...g,
        rateCount: g.rates.length,
      })),
    };
  } catch (error) {
    console.error("Error fetching rate groups:", error);
    return { success: false, error: "Error al cargar grupos", data: [] };
  }
}

/**
 * Obtener grupo por ID
 */
export async function getRateGroupById(id: string) {
  try {
    const group = await prisma.shippingRateGroup.findUnique({
      where: { id },
      include: {
        zone: true,
        rates: { orderBy: { order: "asc" } },
      },
    });

    if (!group) {
      return { success: false, error: "Grupo no encontrado", data: null };
    }

    return { success: true, data: group };
  } catch (error) {
    console.error("Error fetching group:", error);
    return { success: false, error: "Error al cargar grupo", data: null };
  }
}

/**
 * Crear grupo de tarifas
 */
export async function createRateGroup(data: {
  zoneId: string;
  name: string;
  description?: string;
  order: number;
  active: boolean;
}) {
  try {
    const group = await prisma.shippingRateGroup.create({
      data: {
        zoneId: data.zoneId,
        name: data.name,
        description: data.description,
        order: data.order,
        active: data.active,
      },
    });

    revalidatePath(`/admin/envios/zonas/${data.zoneId}/grupos`);

    return {
      success: true,
      data: group,
      message: "Grupo creado exitosamente",
    };
  } catch (error) {
    console.error("Error creating group:", error);
    return { success: false, error: "Error al crear grupo", data: null };
  }
}

/**
 * Actualizar grupo
 */
export async function updateRateGroup(
  id: string,
  data: {
    name?: string;
    description?: string;
    order?: number;
    active?: boolean;
  }
) {
  try {
    const group = await prisma.shippingRateGroup.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/admin/envios/zonas/${group.zoneId}/grupos`);
    revalidatePath(`/admin/envios/grupos/${id}`);

    return {
      success: true,
      data: group,
      message: "Grupo actualizado",
    };
  } catch (error) {
    console.error("Error updating group:", error);
    return { success: false, error: "Error al actualizar", data: null };
  }
}

/**
 * Eliminar grupo
 */
export async function deleteRateGroup(id: string) {
  try {
    const group = await prisma.shippingRateGroup.findUnique({
      where: { id },
      include: { rates: true },
    });

    if (!group) {
      return { success: false, error: "Grupo no encontrado" };
    }

    if (group.rates.length > 0) {
      return {
        success: false,
        error: `No se puede eliminar. Tiene ${group.rates.length} tarifas.`,
      };
    }

    await prisma.shippingRateGroup.delete({ where: { id } });

    revalidatePath(`/admin/envios/zonas/${group.zoneId}/grupos`);

    return { success: true, message: "Grupo eliminado" };
  } catch (error) {
    console.error("Error deleting group:", error);
    return { success: false, error: "Error al eliminar" };
  }
}

// ============================================================
// SHIPPING RATES (Tarifas Individuales)
// ============================================================

/**
 * Obtener tarifas de un grupo
 */
export async function getRatesByGroup(groupId: string) {
  try {
    const rates = await prisma.shippingRate.findMany({
      where: { groupId },
      orderBy: { order: "asc" },
    });

    return { success: true, data: rates };
  } catch (error) {
    console.error("Error fetching rates:", error);
    return { success: false, error: "Error al cargar tarifas", data: [] };
  }
}

/**
 * Obtener tarifa por ID
 */
export async function getShippingRateById(id: string) {
  try {
    const rate = await prisma.shippingRate.findUnique({
      where: { id },
      include: {
        group: {
          include: { zone: true },
        },
      },
    });

    if (!rate) {
      return { success: false, error: "Tarifa no encontrada", data: null };
    }

    return { success: true, data: rate };
  } catch (error) {
    console.error("Error fetching rate:", error);
    return { success: false, error: "Error al cargar tarifa", data: null };
  }
}

/**
 * Crear tarifa
 */
export async function createShippingRate(data: {
  groupId: string;
  name: string;
  description?: string;
  baseCost: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  freeShippingMin?: number;
  estimatedDays?: string;
  carrier?: string;
  shippingType?: string;
  timeWindow?: string;
  order: number;
  active: boolean;
}) {
  try {
    const rate = await prisma.shippingRate.create({
      data: {
        groupId: data.groupId,
        name: data.name,
        description: data.description,
        baseCost: data.baseCost,
        minOrderAmount: data.minOrderAmount,
        maxOrderAmount: data.maxOrderAmount,
        freeShippingMin: data.freeShippingMin,
        estimatedDays: data.estimatedDays,
        carrier: data.carrier,
        shippingType: data.shippingType,
        timeWindow: data.timeWindow,
        order: data.order,
        active: data.active,
      },
    });

    revalidatePath(`/admin/envios/grupos/${data.groupId}/tarifas`);

    return {
      success: true,
      data: rate,
      message: "Tarifa creada exitosamente",
    };
  } catch (error) {
    console.error("Error creating rate:", error);
    return { success: false, error: "Error al crear tarifa", data: null };
  }
}

/**
 * Actualizar tarifa
 */
export async function updateShippingRate(
  id: string,
  data: {
    name?: string;
    description?: string;
    baseCost?: number;
    minOrderAmount?: number;
    maxOrderAmount?: number;
    freeShippingMin?: number;
    estimatedDays?: string;
    carrier?: string;
    shippingType?: string;
    timeWindow?: string;
    order?: number;
    active?: boolean;
  }
) {
  try {
    const rate = await prisma.shippingRate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/admin/envios/grupos/${rate.groupId}/tarifas`);
    revalidatePath(`/admin/envios/tarifas/${id}`);

    return {
      success: true,
      data: rate,
      message: "Tarifa actualizada",
    };
  } catch (error) {
    console.error("Error updating rate:", error);
    return { success: false, error: "Error al actualizar", data: null };
  }
}

/**
 * Eliminar tarifa
 */
export async function deleteShippingRate(id: string) {
  try {
    const rate = await prisma.shippingRate.findUnique({
      where: { id },
    });

    if (!rate) {
      return { success: false, error: "Tarifa no encontrada" };
    }

    await prisma.shippingRate.delete({ where: { id } });

    revalidatePath(`/admin/envios/grupos/${rate.groupId}/tarifas`);

    return { success: true, message: "Tarifa eliminada" };
  } catch (error) {
    console.error("Error deleting rate:", error);
    return { success: false, error: "Error al eliminar" };
  }
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Obtener estadísticas generales
 */
export async function getShippingStats() {
  try {
    const [totalZones, activeZones, totalGroups, totalRates, totalDistricts] =
      await Promise.all([
        prisma.shippingZone.count(),
        prisma.shippingZone.count({ where: { active: true } }),
        prisma.shippingRateGroup.count(),
        prisma.shippingRate.count(),
        prisma.shippingZoneDistrict.count(),
      ]);

    return {
      success: true,
      data: {
        totalZones,
        activeZones,
        totalGroups,
        totalRates,
        totalDistricts,
      },
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      success: false,
      error: "Error al cargar estadísticas",
      data: null,
    };
  }
}