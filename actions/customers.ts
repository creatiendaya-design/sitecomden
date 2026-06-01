"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { protectRoute } from "@/lib/protect-route";
import { logAudit } from "@/lib/audit-log";
import { getCurrentUserId } from "@/lib/auth";

// ============================================
// TIPOS Y VALIDACIÓN
// ============================================

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
export type CustomerSortField =
  | "registeredAt"
  | "totalSpent"
  | "totalOrders"
  | "points"
  | "lastPurchaseAt";

const LOYALTY_TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM"] as const;
const SORT_FIELDS = [
  "registeredAt",
  "totalSpent",
  "totalOrders",
  "points",
  "lastPurchaseAt",
] as const;

const addressSchema = z
  .object({
    line1: z.string().trim().max(200).optional().or(z.literal("")),
    line2: z.string().trim().max(200).optional().or(z.literal("")),
    reference: z.string().trim().max(200).optional().or(z.literal("")),
    department: z.string().trim().max(120).optional().or(z.literal("")),
    province: z.string().trim().max(120).optional().or(z.literal("")),
    district: z.string().trim().max(120).optional().or(z.literal("")),
    postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  })
  .partial();

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  dni: z.string().trim().max(20).optional().or(z.literal("")),
  birthday: z.string().trim().optional().or(z.literal("")), // ISO date (yyyy-mm-dd)
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
  address: addressSchema.optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

function flattenZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join("; ");
}

// ============================================
// LISTADO (paginación + filtros server-side)
// ============================================

const PER_PAGE_DEFAULT = 20;

interface GetCustomersParams {
  q?: string;
  tier?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export async function getCustomers(params: GetCustomersParams = {}) {
  await protectRoute("customers:view");

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const perPage = Math.min(100, Math.max(1, params.perPage ?? PER_PAGE_DEFAULT));
  const skip = (page - 1) * perPage;

  const sortBy: CustomerSortField = SORT_FIELDS.includes(
    params.sortBy as CustomerSortField
  )
    ? (params.sortBy as CustomerSortField)
    : "registeredAt";
  const order: "asc" | "desc" = params.order === "asc" ? "asc" : "desc";

  const where: Prisma.CustomerWhereInput = { deletedAt: null };

  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { dni: { contains: q } },
      { phone: { contains: q } },
      { referralCode: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params.tier && LOYALTY_TIERS.includes(params.tier as LoyaltyTier)) {
    where.loyaltyTier = params.tier as LoyaltyTier;
  }

  // lastPurchaseAt es nullable; ordenar por él con nulls al final.
  let orderBy: Prisma.CustomerOrderByWithRelationInput;
  switch (sortBy) {
    case "lastPurchaseAt":
      orderBy = { lastPurchaseAt: { sort: order, nulls: "last" } };
      break;
    case "totalSpent":
      orderBy = { totalSpent: order };
      break;
    case "totalOrders":
      orderBy = { totalOrders: order };
      break;
    case "points":
      orderBy = { points: order };
      break;
    default:
      orderBy = { registeredAt: order };
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          dni: true,
          loyaltyTier: true,
          points: true,
          totalOrders: true,
          totalSpent: true,
          referralCount: true,
          tags: true,
          registeredAt: true,
          lastPurchaseAt: true,
          address: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const customers = rows.map((c) => ({
      ...c,
      totalSpent: Number(c.totalSpent),
    }));

    return {
      customers,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  } catch (error) {
    console.error("Error obteniendo clientes:", error);
    return { customers: [], total: 0, page: 1, perPage, totalPages: 1 };
  }
}

// ============================================
// STATS (totales + desglose por tier)
// ============================================

export async function getCustomerStats() {
  await protectRoute("customers:view");
  try {
    const [total, tierGroups] = await Promise.all([
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.customer.groupBy({
        by: ["loyaltyTier"],
        where: { deletedAt: null },
        _count: true,
      }),
    ]);

    const byTier: Record<LoyaltyTier, number> = {
      BRONZE: 0,
      SILVER: 0,
      GOLD: 0,
      PLATINUM: 0,
    };
    for (const g of tierGroups) {
      byTier[g.loyaltyTier as LoyaltyTier] = g._count;
    }

    return { total, byTier };
  } catch (error) {
    console.error("Error obteniendo stats de clientes:", error);
    return {
      total: 0,
      byTier: { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
    };
  }
}

// ============================================
// FICHA DE CLIENTE
// ============================================

export async function getCustomerById(id: string) {
  await protectRoute("customers:view");
  try {
    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            orderNumber: true,
            orderSeq: true,
            total: true,
            status: true,
            paymentStatus: true,
            fulfillmentStatus: true,
            createdAt: true,
          },
        },
        referrals: {
          select: {
            id: true,
            name: true,
            email: true,
            registeredAt: true,
          },
          orderBy: { registeredAt: "desc" },
          take: 25,
        },
        referredBy: {
          select: { id: true, name: true, email: true, referralCode: true },
        },
        pointsHistory: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
        _count: { select: { orders: true, referrals: true } },
      },
    });

    if (!customer) return null;

    // Serializar Decimals a number para el cliente.
    return {
      ...customer,
      totalSpent: Number(customer.totalSpent),
      orders: customer.orders.map((o) => ({
        ...o,
        total: Number(o.total),
      })),
    };
  } catch (error) {
    console.error("Error obteniendo cliente:", error);
    return null;
  }
}

// ============================================
// EDITAR CLIENTE
// ============================================

export async function updateCustomer(id: string, data: unknown) {
  await protectRoute("customers:edit");
  try {
    const userId = await getCurrentUserId();

    const parsed = updateCustomerSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const input = parsed.data;

    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, dni: true },
    });
    if (!existing) {
      return { success: false, error: "Cliente no encontrado" };
    }

    const dni = input.dni?.trim() || null;
    // dni es @unique — evitar choque con otro cliente.
    if (dni && dni !== existing.dni) {
      const clash = await prisma.customer.findFirst({
        where: { dni, id: { not: id } },
        select: { id: true },
      });
      if (clash) {
        return { success: false, error: "El DNI ya pertenece a otro cliente" };
      }
    }

    // Limpiar address: quitar strings vacíos; null si queda vacío.
    let address: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
    if (input.address) {
      const cleaned = Object.fromEntries(
        Object.entries(input.address).filter(
          ([, v]) => typeof v === "string" && v.trim() !== ""
        )
      );
      if (Object.keys(cleaned).length > 0) {
        address = cleaned as Prisma.InputJsonValue;
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: input.name,
        phone: input.phone?.trim() || null,
        dni,
        birthday: input.birthday ? new Date(input.birthday) : null,
        notes: input.notes?.trim() || null,
        tags: input.tags ?? [],
        address,
      },
    });

    await logAudit({
      action: "customer.updated",
      userId: userId ?? null,
      entityType: "Customer",
      entityId: id,
      after: {
        name: input.name,
        phone: input.phone ?? null,
        dni,
        tags: input.tags ?? [],
      },
    });

    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${id}`);

    return { success: true, customer: { ...updated, totalSpent: Number(updated.totalSpent) } };
  } catch (error) {
    console.error("Error actualizando cliente:", error);
    return { success: false, error: "Error al actualizar cliente" };
  }
}

// ============================================
// SOFT-DELETE
// ============================================

export async function deleteCustomer(id: string) {
  await protectRoute("customers:delete");
  try {
    const userId = await getCurrentUserId();

    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, email: true },
    });
    if (!existing) {
      return { success: false, error: "Cliente no encontrado" };
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      action: "customer.deleted",
      userId: userId ?? null,
      entityType: "Customer",
      entityId: id,
      before: { name: existing.name, email: existing.email },
    });

    revalidatePath("/admin/clientes");

    return { success: true };
  } catch (error) {
    console.error("Error eliminando cliente:", error);
    return { success: false, error: "Error al eliminar cliente" };
  }
}
