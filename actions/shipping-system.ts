"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ============================================================
// SHIPPING ZONES
// ============================================================

export async function getShippingZones() {
  try {
    const zones = await prisma.shippingZone.findMany({
      include: {
        districts: { select: { id: true } },
        rates: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: zones.map((zone) => ({
        ...zone,
        districtCount: zone.districts.length,
        rateCount: zone.rates.length,
      })),
    };
  } catch (error) {
    console.error("Error fetching zones:", error);
    return { success: false, error: "Error al cargar zonas", data: [] };
  }
}

export async function getShippingZoneById(id: string | undefined) {
  if (!id?.trim()) {
    return { success: false, error: "Zone ID required", data: null };
  }

  try {
    const zone = await prisma.shippingZone.findUnique({
      where: { id },
      include: {
        districts: true,
        rates: { orderBy: [{ category: "asc" }, { order: "asc" }] },
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
    revalidatePath("/admin/envios");

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

export async function updateShippingZone(
  id: string | undefined,
  data: { name?: string; description?: string; active?: boolean },
) {
  if (!id?.trim()) {
    return { success: false, error: "Zone ID required", data: null };
  }

  try {
    const zone = await prisma.shippingZone.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });

    revalidatePath("/admin/envios/zonas");
    revalidatePath(`/admin/envios/zonas/${id}`);
    revalidatePath("/admin/envios");

    return { success: true, data: zone, message: "Zona actualizada exitosamente" };
  } catch (error) {
    console.error("Error updating zone:", error);
    return { success: false, error: "Error al actualizar zona", data: null };
  }
}

export async function deleteShippingZone(id: string | undefined) {
  if (!id?.trim()) {
    return { success: false, error: "Zone ID required" };
  }

  try {
    const zone = await prisma.shippingZone.findUnique({
      where: { id },
      include: { rates: true, districts: true },
    });

    if (!zone) {
      return { success: false, error: "Zona no encontrada" };
    }

    if (zone.rates.length > 0) {
      return {
        success: false,
        error: `No se puede eliminar. La zona tiene ${zone.rates.length} tarifas configuradas.`,
      };
    }

    await prisma.shippingZone.delete({ where: { id } });

    revalidatePath("/admin/envios/zonas");
    revalidatePath("/admin/envios");

    return { success: true, message: "Zona eliminada exitosamente" };
  } catch (error) {
    console.error("Error deleting zone:", error);
    return { success: false, error: "Error al eliminar zona" };
  }
}

export async function toggleShippingZoneStatus(
  id: string | undefined,
  active: boolean,
) {
  if (!id?.trim()) {
    return { success: false, error: "Zone ID required" };
  }

  try {
    await prisma.shippingZone.update({ where: { id }, data: { active } });
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
// ZONE DISTRICTS
// ============================================================

export async function bulkAssignDistrictsToZone(
  zoneId: string | undefined,
  districtCodes: string[],
) {
  if (!zoneId?.trim()) {
    return {
      success: false,
      error: "Zone ID required",
      data: { added: 0, skipped: 0, conflicts: [] as { code: string; zone: string }[] },
    };
  }

  const codes = (districtCodes || []).map((c) => c?.trim()).filter(Boolean) as string[];
  if (codes.length === 0) {
    return {
      success: false,
      error: "No districts provided",
      data: { added: 0, skipped: 0, conflicts: [] as { code: string; zone: string }[] },
    };
  }

  try {
    const existing = await prisma.shippingZoneDistrict.findMany({
      where: { districtCode: { in: codes } },
      include: { shippingZone: { select: { name: true, id: true } } },
    });

    const conflicts: { code: string; zone: string }[] = [];
    const alreadyHere = new Set<string>();
    for (const a of existing) {
      if (a.shippingZoneId === zoneId) {
        alreadyHere.add(a.districtCode);
      } else {
        conflicts.push({ code: a.districtCode, zone: a.shippingZone.name });
      }
    }

    const blocked = new Set([...alreadyHere, ...conflicts.map((c) => c.code)]);
    const toCreate = codes.filter((c) => !blocked.has(c));

    if (toCreate.length > 0) {
      await prisma.shippingZoneDistrict.createMany({
        data: toCreate.map((code) => ({ shippingZoneId: zoneId, districtCode: code })),
        skipDuplicates: true,
      });
    }

    revalidatePath(`/admin/envios/zonas/${zoneId}`);
    revalidatePath(`/admin/envios/zonas/${zoneId}/distritos`);

    return {
      success: true,
      data: { added: toCreate.length, skipped: alreadyHere.size, conflicts },
    };
  } catch (error) {
    console.error("Error bulk-assigning districts:", error);
    return {
      success: false,
      error: "Error al asignar distritos en lote",
      data: { added: 0, skipped: 0, conflicts: [] as { code: string; zone: string }[] },
    };
  }
}

export async function searchDistrictsForZone(
  zoneId: string | undefined,
  query: string,
  limit = 30,
) {
  if (!zoneId?.trim()) {
    return { success: false, error: "Zone ID required", data: [] };
  }

  const q = (query || "").trim();
  if (q.length < 2) return { success: true, data: [] };

  try {
    const districts = await prisma.district.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q } },
        ],
      },
      include: { province: { include: { department: true } } },
      take: limit,
      orderBy: { name: "asc" },
    });

    const codes = districts.map((d) => d.code);
    const assignments = await prisma.shippingZoneDistrict.findMany({
      where: { districtCode: { in: codes } },
      include: { shippingZone: { select: { id: true, name: true } } },
    });
    const assignmentMap = new Map(assignments.map((a) => [a.districtCode, a]));

    return {
      success: true,
      data: districts.map((d) => {
        const assignment = assignmentMap.get(d.code);
        return {
          code: d.code,
          name: d.name,
          province: d.province.name,
          department: d.province.department.name,
          assignedZoneId: assignment?.shippingZoneId || null,
          assignedZoneName: assignment?.shippingZone.name || null,
          assignedHere: assignment?.shippingZoneId === zoneId,
        };
      }),
    };
  } catch (error) {
    console.error("Error searching districts:", error);
    return { success: false, error: "Error al buscar distritos", data: [] };
  }
}

export async function getProvinceDistrictsForZone(
  zoneId: string | undefined,
  provinceId: string | undefined,
) {
  if (!zoneId?.trim() || !provinceId?.trim()) {
    return { success: false, error: "Zone ID and province ID required", data: [] };
  }

  try {
    const districts = await prisma.district.findMany({
      where: { provinceId },
      orderBy: { name: "asc" },
    });

    const codes = districts.map((d) => d.code);
    const assignments = await prisma.shippingZoneDistrict.findMany({
      where: { districtCode: { in: codes } },
      include: { shippingZone: { select: { id: true, name: true } } },
    });
    const assignmentMap = new Map(assignments.map((a) => [a.districtCode, a]));

    return {
      success: true,
      data: districts.map((d) => {
        const a = assignmentMap.get(d.code);
        return {
          code: d.code,
          name: d.name,
          assignedZoneId: a?.shippingZoneId || null,
          assignedZoneName: a?.shippingZone.name || null,
          assignedHere: a?.shippingZoneId === zoneId,
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching province districts:", error);
    return { success: false, error: "Error al cargar distritos", data: [] };
  }
}

// ============================================================
// SHIPPING RATES
// ============================================================

interface RateInput {
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
  active: boolean;
  excludeFromRegularCheckout?: boolean;
}

export async function createShippingRate(input: { zoneId: string; rate: RateInput }) {
  const { zoneId, rate } = input;

  if (!zoneId?.trim()) {
    return { success: false, error: "Zone ID required", data: null };
  }
  if (!rate.name?.trim()) {
    return { success: false, error: "El nombre es obligatorio", data: null };
  }
  if (!Number.isFinite(rate.baseCost) || rate.baseCost < 0) {
    return { success: false, error: "El costo debe ser un número válido", data: null };
  }

  try {
    const lastOrder = await prisma.shippingRate.findFirst({
      where: { zoneId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const created = await prisma.shippingRate.create({
      data: {
        zoneId,
        name: rate.name.trim(),
        description: rate.description?.trim() || null,
        category: rate.category?.trim() || null,
        baseCost: rate.baseCost,
        minOrderAmount: rate.minOrderAmount ?? null,
        maxOrderAmount: rate.maxOrderAmount ?? null,
        freeShippingMin: rate.freeShippingMin ?? null,
        estimatedDays: rate.estimatedDays?.trim() || null,
        carrier: rate.carrier?.trim() || null,
        shippingType: rate.shippingType?.trim() || null,
        timeWindow: rate.timeWindow?.trim() || null,
        order: (lastOrder?.order ?? -1) + 1,
        active: rate.active,
        excludeFromRegularCheckout: rate.excludeFromRegularCheckout ?? false,
      },
    });

    revalidatePath(`/admin/envios/zonas/${zoneId}`);
    revalidatePath("/admin/envios/tarifas");
    revalidatePath("/admin/envios");

    return { success: true, data: created, message: "Tarifa creada" };
  } catch (error) {
    console.error("Error creating rate:", error);
    return { success: false, error: "Error al crear tarifa", data: null };
  }
}

export async function getRatesByZone(zoneId: string | undefined) {
  if (!zoneId?.trim()) {
    return { success: false, error: "Zone ID required", data: [] };
  }

  try {
    const rates = await prisma.shippingRate.findMany({
      where: { zoneId },
      orderBy: [{ category: "asc" }, { order: "asc" }],
    });
    return { success: true, data: rates };
  } catch (error) {
    console.error("Error fetching rates:", error);
    return { success: false, error: "Error al cargar tarifas", data: [] };
  }
}

export async function getShippingRateById(id: string | undefined) {
  if (!id?.trim()) {
    return { success: false, error: "Rate ID required", data: null };
  }

  try {
    const rate = await prisma.shippingRate.findUnique({
      where: { id },
      include: { zone: true },
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

export async function updateShippingRate(
  id: string | undefined,
  data: Partial<RateInput>,
) {
  if (!id?.trim()) {
    return { success: false, error: "Rate ID required", data: null };
  }

  try {
    const rate = await prisma.shippingRate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/admin/envios/zonas/${rate.zoneId}`);
    revalidatePath("/admin/envios/tarifas");
    revalidatePath("/admin/envios");

    return { success: true, data: rate, message: "Tarifa actualizada" };
  } catch (error) {
    console.error("Error updating rate:", error);
    return { success: false, error: "Error al actualizar", data: null };
  }
}

export async function deleteShippingRate(id: string | undefined) {
  if (!id?.trim()) {
    return { success: false, error: "Rate ID required" };
  }

  try {
    const rate = await prisma.shippingRate.findUnique({ where: { id } });
    if (!rate) {
      return { success: false, error: "Tarifa no encontrada" };
    }

    await prisma.shippingRate.delete({ where: { id } });

    revalidatePath(`/admin/envios/zonas/${rate.zoneId}`);
    revalidatePath("/admin/envios/tarifas");
    revalidatePath("/admin/envios");

    return { success: true, message: "Tarifa eliminada" };
  } catch (error) {
    console.error("Error deleting rate:", error);
    return { success: false, error: "Error al eliminar" };
  }
}

/**
 * Vista global de todas las tarifas con su zona.
 */
export async function getAllShippingRates() {
  try {
    const rates = await prisma.shippingRate.findMany({
      include: { zone: true },
      orderBy: [{ zone: { name: "asc" } }, { category: "asc" }, { order: "asc" }],
    });

    return {
      success: true,
      data: rates.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        baseCost: Number(r.baseCost),
        minOrderAmount: r.minOrderAmount ? Number(r.minOrderAmount) : null,
        maxOrderAmount: r.maxOrderAmount ? Number(r.maxOrderAmount) : null,
        freeShippingMin: r.freeShippingMin ? Number(r.freeShippingMin) : null,
        estimatedDays: r.estimatedDays,
        carrier: r.carrier,
        shippingType: r.shippingType,
        timeWindow: r.timeWindow,
        active: r.active,
        excludeFromRegularCheckout: r.excludeFromRegularCheckout,
        zoneId: r.zone.id,
        zoneName: r.zone.name,
        zoneActive: r.zone.active,
      })),
    };
  } catch (error) {
    console.error("Error fetching all rates:", error);
    return { success: false, error: "Error al cargar tarifas", data: [] };
  }
}

// ============================================================
// STATS
// ============================================================

export async function getShippingStats() {
  try {
    const [totalZones, activeZones, totalRates, activeRates, totalDistricts] =
      await Promise.all([
        prisma.shippingZone.count(),
        prisma.shippingZone.count({ where: { active: true } }),
        prisma.shippingRate.count(),
        prisma.shippingRate.count({ where: { active: true } }),
        prisma.shippingZoneDistrict.count(),
      ]);

    return {
      success: true,
      data: {
        totalZones,
        activeZones,
        totalRates,
        activeRates,
        totalDistricts,
      },
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { success: false, error: "Error al cargar estadísticas", data: null };
  }
}
