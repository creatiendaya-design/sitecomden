"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// =====================================================
// ZONAS DE ENVÍO
// =====================================================

/**
 * Obtiene una zona por ID con todas sus relaciones
 */
export async function getShippingZoneById(id: string) {
  try {
    const zone = await prisma.shippingZone.findUnique({
      where: { id },
      include: {
        districts: {
          select: {
            id: true,
            districtCode: true,
          },
        },
        rateGroups: {
          include: {
            rates: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!zone) {
      return { success: false, error: "Zona no encontrada" };
    }

    return { success: true, data: zone };
  } catch (error) {
    console.error("Error getting zone:", error);
    return { success: false, error: "Error al cargar zona" };
  }
}

/**
 * Crea una nueva zona de envío
 */
export async function createShippingZone(data: {
  name: string;
  description?: string | null;
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
      message: "Zona creada correctamente",
      data: zone,
    };
  } catch (error) {
    console.error("Error creating zone:", error);
    return { success: false, error: "Error al crear zona" };
  }
}

/**
 * Actualiza una zona de envío
 */
export async function updateShippingZone(
  id: string,
  data: {
    name: string;
    description?: string | null;
    active: boolean;
  }
) {
  try {
    const zone = await prisma.shippingZone.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
      },
    });

    revalidatePath("/admin/envios/zonas");
    revalidatePath(`/admin/envios/zonas/${id}`);

    return {
      success: true,
      message: "Zona actualizada correctamente",
      data: zone,
    };
  } catch (error) {
    console.error("Error updating zone:", error);
    return { success: false, error: "Error al actualizar zona" };
  }
}

/**
 * Elimina una zona de envío (y cascadea a distritos, grupos y tarifas)
 */
export async function deleteShippingZone(id: string) {
  try {
    await prisma.shippingZone.delete({
      where: { id },
    });

    revalidatePath("/admin/envios/zonas");

    return {
      success: true,
      message: "Zona eliminada correctamente",
    };
  } catch (error) {
    console.error("Error deleting zone:", error);
    return { success: false, error: "Error al eliminar zona" };
  }
}

// =====================================================
// DISTRITOS DE ZONA
// =====================================================

/**
 * Obtiene los distritos asignados a una zona con información completa
 */
export async function getZoneDistrictsWithDetails(zoneId: string) {
  try {
    const assignments = await prisma.shippingZoneDistrict.findMany({
      where: { shippingZoneId: zoneId },
      select: {
        id: true,
        districtCode: true,
      },
    });

    // Obtener información completa de cada distrito
    const districtCodes = assignments.map((a) => a.districtCode);
    
    const districts = await prisma.district.findMany({
      where: {
        code: { in: districtCodes },
      },
      include: {
        province: {
          include: {
            department: true,
          },
        },
      },
    });

    const detailedAssignments = assignments.map((assignment) => {
      const district = districts.find((d) => d.code === assignment.districtCode);
      return {
        id: assignment.id,
        districtCode: assignment.districtCode,
        districtName: district?.name || "Desconocido",
        provinceName: district?.province.name || "Desconocida",
        departmentName: district?.province.department.name || "Desconocido",
      };
    });

    return { success: true, data: detailedAssignments };
  } catch (error) {
    console.error("Error getting zone districts:", error);
    return { success: false, error: "Error al cargar distritos", data: [] };
  }
}

/**
 * Agrega un distrito a una zona
 */
export async function addDistrictToZone(zoneId: string, districtCode: string) {
  try {
    // Verificar si ya existe
    const existing = await prisma.shippingZoneDistrict.findUnique({
      where: { districtCode },
    });

    if (existing) {
      return {
        success: false,
        error: "Este distrito ya está asignado a una zona",
      };
    }

    await prisma.shippingZoneDistrict.create({
      data: {
        shippingZoneId: zoneId,
        districtCode: districtCode,
      },
    });

    revalidatePath(`/admin/envios/zonas/${zoneId}/distritos`);

    return {
      success: true,
      message: "Distrito agregado correctamente",
    };
  } catch (error) {
    console.error("Error adding district to zone:", error);
    return { success: false, error: "Error al agregar distrito" };
  }
}

/**
 * Quita un distrito de una zona
 */
export async function removeDistrictFromZone(assignmentId: string, zoneId: string) {
  try {
    await prisma.shippingZoneDistrict.delete({
      where: { id: assignmentId },
    });

    revalidatePath(`/admin/envios/zonas/${zoneId}/distritos`);

    return {
      success: true,
      message: "Distrito removido correctamente",
    };
  } catch (error) {
    console.error("Error removing district from zone:", error);
    return { success: false, error: "Error al remover distrito" };
  }
}

// =====================================================
// GRUPOS DE TARIFAS
// =====================================================

/**
 * Obtiene un grupo de tarifas por ID
 */
export async function getShippingRateGroupById(id: string) {
  try {
    const group = await prisma.shippingRateGroup.findUnique({
      where: { id },
      include: {
        zone: true,
        rates: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!group) {
      return { success: false, error: "Grupo no encontrado" };
    }

    return { success: true, data: group };
  } catch (error) {
    console.error("Error getting group:", error);
    return { success: false, error: "Error al cargar grupo" };
  }
}

/**
 * Actualiza un grupo de tarifas
 */
export async function updateShippingRateGroup(
  id: string,
  data: {
    name: string;
    description?: string | null;
    order: number;
    active: boolean;
  }
) {
  try {
    const group = await prisma.shippingRateGroup.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        order: data.order,
        active: data.active,
      },
    });

    const zoneId = group.zoneId;
    revalidatePath("/admin/envios/grupos");
    revalidatePath(`/admin/envios/zonas/${zoneId}`);

    return {
      success: true,
      message: "Grupo actualizado correctamente",
      data: group,
    };
  } catch (error) {
    console.error("Error updating group:", error);
    return { success: false, error: "Error al actualizar grupo" };
  }
}

/**
 * Elimina un grupo de tarifas (y cascadea a sus tarifas)
 */
export async function deleteShippingRateGroup(id: string) {
  try {
    const group = await prisma.shippingRateGroup.findUnique({
      where: { id },
      select: { zoneId: true },
    });

    await prisma.shippingRateGroup.delete({
      where: { id },
    });

    if (group) {
      revalidatePath(`/admin/envios/zonas/${group.zoneId}`);
    }
    revalidatePath("/admin/envios/grupos");

    return {
      success: true,
      message: "Grupo eliminado correctamente",
    };
  } catch (error) {
    console.error("Error deleting group:", error);
    return { success: false, error: "Error al eliminar grupo" };
  }
}

// =====================================================
// TARIFAS DE ENVÍO
// =====================================================

/**
 * Obtiene una tarifa por ID
 */
export async function getShippingRateById(id: string) {
  try {
    const rate = await prisma.shippingRate.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            zone: true,
          },
        },
      },
    });

    if (!rate) {
      return { success: false, error: "Tarifa no encontrada" };
    }

    return { success: true, data: rate };
  } catch (error) {
    console.error("Error getting rate:", error);
    return { success: false, error: "Error al cargar tarifa" };
  }
}

/**
 * Actualiza una tarifa de envío
 */
export async function updateShippingRate(
  id: string,
  data: {
    name: string;
    description?: string | null;
    baseCost: number;
    minOrderAmount?: number | null;
    maxOrderAmount?: number | null;
    freeShippingMin?: number | null;
    estimatedDays?: string | null;
    carrier?: string | null;
    shippingType?: string | null;
    timeWindow?: string | null;
    order: number;
    active: boolean;
  }
) {
  try {
    const rate = await prisma.shippingRate.update({
      where: { id },
      data: {
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

    const group = await prisma.shippingRateGroup.findUnique({
      where: { id: rate.groupId },
      select: { zoneId: true },
    });

    if (group) {
      revalidatePath(`/admin/envios/zonas/${group.zoneId}`);
      revalidatePath(`/admin/envios/grupos/${rate.groupId}`);
    }
    revalidatePath("/admin/envios/tarifas");

    return {
      success: true,
      message: "Tarifa actualizada correctamente",
      data: rate,
    };
  } catch (error) {
    console.error("Error updating rate:", error);
    return { success: false, error: "Error al actualizar tarifa" };
  }
}

/**
 * Elimina una tarifa de envío
 */
export async function deleteShippingRate(id: string) {
  try {
    const rate = await prisma.shippingRate.findUnique({
      where: { id },
      include: {
        group: {
          select: {
            id: true,
            zoneId: true,
          },
        },
      },
    });

    await prisma.shippingRate.delete({
      where: { id },
    });

    if (rate) {
      revalidatePath(`/admin/envios/zonas/${rate.group.zoneId}`);
      revalidatePath(`/admin/envios/grupos/${rate.group.id}`);
    }
    revalidatePath("/admin/envios/tarifas");

    return {
      success: true,
      message: "Tarifa eliminada correctamente",
    };
  } catch (error) {
    console.error("Error deleting rate:", error);
    return { success: false, error: "Error al eliminar tarifa" };
  }
}