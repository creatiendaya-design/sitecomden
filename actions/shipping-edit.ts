"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// =====================================================
// ZONAS
// =====================================================

export async function getShippingZoneById(id: string) {
  try {
    const zone = await prisma.shippingZone.findUnique({
      where: { id },
      include: {
        districts: { select: { id: true, districtCode: true } },
        rates: { orderBy: [{ category: "asc" }, { order: "asc" }] },
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
    revalidatePath("/admin/envios");

    return { success: true, message: "Zona creada correctamente", data: zone };
  } catch (error) {
    console.error("Error creating zone:", error);
    return { success: false, error: "Error al crear zona" };
  }
}

export async function updateShippingZone(
  id: string,
  data: {
    name: string;
    description?: string | null;
    active: boolean;
  },
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
    revalidatePath("/admin/envios");

    return { success: true, message: "Zona actualizada correctamente", data: zone };
  } catch (error) {
    console.error("Error updating zone:", error);
    return { success: false, error: "Error al actualizar zona" };
  }
}

export async function deleteShippingZone(id: string) {
  try {
    await prisma.shippingZone.delete({ where: { id } });

    revalidatePath("/admin/envios/zonas");
    revalidatePath("/admin/envios");

    return { success: true, message: "Zona eliminada correctamente" };
  } catch (error) {
    console.error("Error deleting zone:", error);
    return { success: false, error: "Error al eliminar zona" };
  }
}

// =====================================================
// DISTRITOS DE ZONA
// =====================================================

export async function getZoneDistrictsWithDetails(zoneId: string) {
  try {
    const assignments = await prisma.shippingZoneDistrict.findMany({
      where: { shippingZoneId: zoneId },
      select: { id: true, districtCode: true },
    });

    const districtCodes = assignments.map((a) => a.districtCode);

    const districts = await prisma.district.findMany({
      where: { code: { in: districtCodes } },
      include: { province: { include: { department: true } } },
    });

    const detailed = assignments.map((assignment) => {
      const district = districts.find((d) => d.code === assignment.districtCode);
      return {
        id: assignment.id,
        districtCode: assignment.districtCode,
        districtName: district?.name || "Desconocido",
        provinceName: district?.province.name || "Desconocida",
        departmentName: district?.province.department.name || "Desconocido",
      };
    });

    return { success: true, data: detailed };
  } catch (error) {
    console.error("Error getting zone districts:", error);
    return { success: false, error: "Error al cargar distritos", data: [] };
  }
}

export async function addDistrictToZone(zoneId: string, districtCode: string) {
  try {
    const existing = await prisma.shippingZoneDistrict.findUnique({
      where: { districtCode },
    });

    if (existing) {
      return { success: false, error: "Este distrito ya está asignado a una zona" };
    }

    await prisma.shippingZoneDistrict.create({
      data: { shippingZoneId: zoneId, districtCode },
    });

    revalidatePath(`/admin/envios/zonas/${zoneId}/distritos`);
    revalidatePath(`/admin/envios/zonas/${zoneId}`);

    return { success: true, message: "Distrito agregado correctamente" };
  } catch (error) {
    console.error("Error adding district to zone:", error);
    return { success: false, error: "Error al agregar distrito" };
  }
}

export async function removeDistrictFromZone(assignmentId: string, zoneId: string) {
  try {
    await prisma.shippingZoneDistrict.delete({ where: { id: assignmentId } });

    revalidatePath(`/admin/envios/zonas/${zoneId}/distritos`);
    revalidatePath(`/admin/envios/zonas/${zoneId}`);

    return { success: true, message: "Distrito removido correctamente" };
  } catch (error) {
    console.error("Error removing district from zone:", error);
    return { success: false, error: "Error al remover distrito" };
  }
}

// =====================================================
// TARIFAS
// =====================================================

export async function getShippingRateById(id: string) {
  try {
    const rate = await prisma.shippingRate.findUnique({
      where: { id },
      include: { zone: true },
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

export async function updateShippingRate(
  id: string,
  data: {
    name: string;
    description?: string | null;
    category?: string | null;
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
    excludeFromRegularCheckout?: boolean;
  },
) {
  try {
    const rate = await prisma.shippingRate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
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
        excludeFromRegularCheckout: data.excludeFromRegularCheckout ?? false,
      },
    });

    revalidatePath(`/admin/envios/zonas/${rate.zoneId}`);
    revalidatePath("/admin/envios/tarifas");
    revalidatePath("/admin/envios");

    return { success: true, message: "Tarifa actualizada correctamente", data: rate };
  } catch (error) {
    console.error("Error updating rate:", error);
    return { success: false, error: "Error al actualizar tarifa" };
  }
}

export async function deleteShippingRate(id: string) {
  try {
    const rate = await prisma.shippingRate.findUnique({ where: { id } });

    await prisma.shippingRate.delete({ where: { id } });

    if (rate) {
      revalidatePath(`/admin/envios/zonas/${rate.zoneId}`);
    }
    revalidatePath("/admin/envios/tarifas");
    revalidatePath("/admin/envios");

    return { success: true, message: "Tarifa eliminada correctamente" };
  } catch (error) {
    console.error("Error deleting rate:", error);
    return { success: false, error: "Error al eliminar tarifa" };
  }
}
