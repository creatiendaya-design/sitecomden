"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ============================================
// TIPOS Y UTILIDADES
// ============================================

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export type PointTransactionType =
  | "PURCHASE"
  | "REFERRAL_BONUS"
  | "WELCOME_BONUS"
  | "BIRTHDAY_BONUS"
  | "ADMIN_ADJUSTMENT"
  | "REWARD_REDEMPTION"
  | "EXPIRED";

// Generar código de referido único
function generateReferralCode(name: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .substring(0, 4)
    .padEnd(4, "X");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}

// Calcular nivel VIP según puntos
function calculateLoyaltyTier(points: number, settings: any): LoyaltyTier {
  if (points >= settings.platinumThreshold) return "PLATINUM";
  if (points >= settings.goldThreshold) return "GOLD";
  if (points >= settings.silverThreshold) return "SILVER";
  return "BRONZE";
}

// ============================================
// CUSTOMER - Registro y Gestión
// ============================================

export async function registerCustomer(data: {
  email: string;
  name: string;
  phone?: string;
  dni?: string;
  referralCode?: string; // Código de quien lo refirió
}) {
  try {
    // Verificar si ya existe
    const existing = await prisma.customer.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return { success: false, error: "Email ya registrado" };
    }

    // Obtener configuración
    const settings = await getLoyaltySettings();

    // Generar código único de referido
    let referralCode = generateReferralCode(data.name);
    let attempts = 0;
    
    while (attempts < 10) {
      const exists = await prisma.customer.findUnique({
        where: { referralCode },
      });
      if (!exists) break;
      referralCode = generateReferralCode(data.name + attempts);
      attempts++;
    }

    // Buscar quien lo refirió (si aplica)
    let referredById: string | null = null;
    if (data.referralCode) {
      const referrer = await prisma.customer.findUnique({
        where: { referralCode: data.referralCode },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    // Crear cliente
    const customer = await prisma.customer.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        dni: data.dni,
        referralCode,
        referredById,
        points: 0,
        totalPointsEarned: 0,
        loyaltyTier: "BRONZE",
      },
    });

    // Dar bono de bienvenida
    if (settings.welcomeBonus > 0) {
      await addPoints(customer.id, {
        points: settings.welcomeBonus,
        type: "WELCOME_BONUS",
        description: "Bono de bienvenida",
      });
    }

    // Si fue referido, dar bonos
    if (referredById) {
      // Bono para el nuevo cliente
      if (settings.referredBonus > 0) {
        await addPoints(customer.id, {
          points: settings.referredBonus,
          type: "REFERRAL_BONUS",
          description: `Bono por ser referido`,
        });
      }

      // Bono para quien lo refirió
      if (settings.referralBonus > 0) {
        await addPoints(referredById, {
          points: settings.referralBonus,
          type: "REFERRAL_BONUS",
          description: `Referiste a ${data.name}`,
          reference: customer.id,
        });
        
        // Incrementar contador de referidos
        await prisma.customer.update({
          where: { id: referredById },
          data: { referralCount: { increment: 1 } },
        });
      }
    }

    return { success: true, customer };
  } catch (error) {
    console.error("Error registrando cliente:", error);
    return { success: false, error: "Error al registrar cliente" };
  }
}

export async function getCustomerByEmail(email: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { email },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        referrals: {
          select: {
            id: true,
            name: true,
            email: true,
            registeredAt: true,
          },
          orderBy: { registeredAt: "desc" },
          take: 10,
        },
        pointsHistory: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    return customer;
  } catch (error) {
    console.error("Error obteniendo cliente:", error);
    return null;
  }
}

export async function getCustomerStats(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        _count: {
          select: {
            orders: true,
            referrals: true,
          },
        },
      },
    });

    if (!customer) return null;

    // Calcular puntos próximos a expirar
    const settings = await getLoyaltySettings();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - settings.pointsExpireDays);

    const expiringPoints = await prisma.pointTransaction.aggregate({
      where: {
        customerId,
        type: {
          in: ["PURCHASE", "REFERRAL_BONUS", "WELCOME_BONUS", "BIRTHDAY_BONUS"],
        },
        createdAt: {
          lte: expirationDate,
        },
      },
      _sum: {
        points: true,
      },
    });

    // Calcular puntos para próximo nivel
    let pointsToNextTier = 0;
    let nextTier: LoyaltyTier | null = null;

    if (customer.loyaltyTier === "BRONZE") {
      pointsToNextTier = settings.silverThreshold - customer.points;
      nextTier = "SILVER";
    } else if (customer.loyaltyTier === "SILVER") {
      pointsToNextTier = settings.goldThreshold - customer.points;
      nextTier = "GOLD";
    } else if (customer.loyaltyTier === "GOLD") {
      pointsToNextTier = settings.platinumThreshold - customer.points;
      nextTier = "PLATINUM";
    }

    return {
      customer,
      stats: {
        totalOrders: customer._count.orders,
        totalReferrals: customer._count.referrals,
        expiringPoints: expiringPoints._sum.points || 0,
        pointsToNextTier: Math.max(0, pointsToNextTier),
        nextTier,
      },
    };
  } catch (error) {
    console.error("Error obteniendo stats:", error);
    return null;
  }
}

// ============================================
// PUNTOS - Ganar y Gastar
// ============================================

export async function addPoints(
  customerId: string,
  data: {
    points: number;
    type: PointTransactionType;
    description: string;
    reference?: string;
  }
) {
  try {
    // Obtener cliente actual
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return { success: false, error: "Cliente no encontrado" };
    }

    // Calcular nuevo balance
    const newBalance = customer.points + data.points;
    const newTotalEarned = customer.totalPointsEarned + data.points;

    // Obtener configuración para calcular tier
    const settings = await getLoyaltySettings();
    const newTier = calculateLoyaltyTier(newBalance, settings);

    // Actualizar cliente
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        points: newBalance,
        totalPointsEarned: newTotalEarned,
        loyaltyTier: newTier,
      },
    });

    // Crear transacción
    await prisma.pointTransaction.create({
      data: {
        customerId,
        type: data.type,
        points: data.points,
        description: data.description,
        reference: data.reference,
        balanceAfter: newBalance,
      },
    });

    revalidatePath("/cuenta");
    revalidatePath("/admin/clientes");

    return { success: true, customer: updatedCustomer, newTier };
  } catch (error) {
    console.error("Error agregando puntos:", error);
    return { success: false, error: "Error al agregar puntos" };
  }
}

export async function deductPoints(
  customerId: string,
  data: {
    points: number;
    type: PointTransactionType;
    description: string;
    reference?: string;
  }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return { success: false, error: "Cliente no encontrado" };
    }

    if (customer.points < data.points) {
      return { success: false, error: "Puntos insuficientes" };
    }

    const newBalance = customer.points - data.points;
    const newTotalSpent = customer.totalPointsSpent + data.points;

    const settings = await getLoyaltySettings();
    const newTier = calculateLoyaltyTier(newBalance, settings);

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        points: newBalance,
        totalPointsSpent: newTotalSpent,
        loyaltyTier: newTier,
      },
    });

    await prisma.pointTransaction.create({
      data: {
        customerId,
        type: data.type,
        points: -data.points, // Negativo para restar
        description: data.description,
        reference: data.reference,
        balanceAfter: newBalance,
      },
    });

    revalidatePath("/cuenta");
    revalidatePath("/admin/clientes");

    return { success: true, customer: updatedCustomer };
  } catch (error) {
    console.error("Error deduciendo puntos:", error);
    return { success: false, error: "Error al deducir puntos" };
  }
}

// Dar puntos por compra
export async function awardPurchasePoints(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order || !order.customerId || !order.customer) {
      return { success: false, error: "Orden sin cliente" };
    }

    const settings = await getLoyaltySettings();
    
    // Calcular puntos: 1 punto por cada sol gastado
    const pointsToAward = Math.floor(
      Number(order.total) * settings.pointsPerSol
    );

    if (pointsToAward <= 0) {
      return { success: true, points: 0 };
    }

    // Agregar puntos
    await addPoints(order.customerId, {
      points: pointsToAward,
      type: "PURCHASE",
      description: `Compra orden #${order.orderNumber}`,
      reference: orderId,
    });

    // Actualizar orden
    await prisma.order.update({
      where: { id: orderId },
      data: {
        pointsEarned: pointsToAward,
        customerTier: order.customer.loyaltyTier,
      },
    });

    // Actualizar stats del cliente
    await prisma.customer.update({
      where: { id: order.customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: order.total },
        lastPurchaseAt: new Date(),
      },
    });

    return { success: true, points: pointsToAward };
  } catch (error) {
    console.error("Error otorgando puntos de compra:", error);
    return { success: false, error: "Error al otorgar puntos" };
  }
}

// ============================================
// RECOMPENSAS - Listar y Canjear
// ============================================

export async function getAvailableRewards(customerId?: string) {
  try {
    let customerPoints = 0;
    
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      customerPoints = customer?.points || 0;
    }

    const rewards = await prisma.reward.findMany({
      where: {
        active: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
          },
        ],
      },
      orderBy: { pointsCost: "asc" },
    });

    return rewards.map((reward) => ({
      ...reward,
      canAfford: customerId ? customerPoints >= reward.pointsCost : false,
    }));
  } catch (error) {
    console.error("Error obteniendo recompensas:", error);
    return [];
  }
}

export async function redeemReward(customerId: string, rewardId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!customer || !reward) {
      return { success: false, error: "Cliente o recompensa no encontrado" };
    }

    if (!reward.active) {
      return { success: false, error: "Recompensa no disponible" };
    }

    if (customer.points < reward.pointsCost) {
      return { success: false, error: "Puntos insuficientes" };
    }

    // Verificar límite de usos
    if (reward.maxUses && reward.usageCount >= reward.maxUses) {
      return { success: false, error: "Recompensa agotada" };
    }

    // Generar código de cupón único
    const couponCode = `REWARD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Fecha de expiración (30 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Crear cupón en la tabla Coupon
    let couponType: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
    
    if (reward.rewardType === "PERCENTAGE") {
      couponType = "PERCENTAGE";
    } else if (reward.rewardType === "FREE_SHIPPING") {
      couponType = "FREE_SHIPPING";
    } else {
      couponType = "FIXED_AMOUNT";
    }

    await prisma.coupon.create({
      data: {
        code: couponCode,
        description: `Canje de recompensa: ${reward.name}`,
        type: couponType,
        value: reward.rewardValue,
        minPurchase: reward.minPurchase,
        usageLimit: 1,
        usageLimitPerUser: 1,
        expiresAt,
        active: true,
      },
    });

    // Crear redención
    const redemption = await prisma.rewardRedemption.create({
      data: {
        customerId,
        rewardId,
        pointsSpent: reward.pointsCost,
        couponCode,
        expiresAt,
      },
    });

    // Deducir puntos
    await deductPoints(customerId, {
      points: reward.pointsCost,
      type: "REWARD_REDEMPTION",
      description: `Canjeaste: ${reward.name}`,
      reference: redemption.id,
    });

    // Actualizar contador de la recompensa
    await prisma.reward.update({
      where: { id: rewardId },
      data: {
        usageCount: { increment: 1 },
      },
    });

    revalidatePath("/cuenta");
    revalidatePath("/cuenta/recompensas");

    return {
      success: true,
      redemption,
      couponCode,
    };
  } catch (error) {
    console.error("Error canjeando recompensa:", error);
    return { success: false, error: "Error al canjear recompensa" };
  }
}

export async function getCustomerRedemptions(customerId: string) {
  try {
    const redemptions = await prisma.rewardRedemption.findMany({
      where: { customerId },
      include: {
        reward: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return redemptions;
  } catch (error) {
    console.error("Error obteniendo redenciones:", error);
    return [];
  }
}

// ============================================
// CONFIGURACIÓN - Loyalty Program Settings
// ============================================

export async function getLoyaltySettings() {
  try {
    let settings = await prisma.loyaltyProgramSettings.findFirst();

    if (!settings) {
      // Crear configuración por defecto
      settings = await prisma.loyaltyProgramSettings.create({
        data: {
          pointsPerSol: 1,
          solsPerPoint: 0.1,
          welcomeBonus: 100,
          referralBonus: 200,
          referredBonus: 100,
          birthdayBonus: 150,
          silverThreshold: 500,
          goldThreshold: 2000,
          platinumThreshold: 5000,
          silverDiscount: 5,
          goldDiscount: 10,
          platinumDiscount: 15,
          platinumFreeShipping: true,
          pointsExpireDays: 365,
          enabled: true,
        },
      });
    }

    return settings;
  } catch (error) {
    console.error("Error obteniendo configuración:", error);
    return null;
  }
}

export async function updateLoyaltySettings(data: any) {
  try {
    const settings = await prisma.loyaltyProgramSettings.findFirst();

    if (!settings) {
      return { success: false, error: "Configuración no encontrada" };
    }

    const updated = await prisma.loyaltyProgramSettings.update({
      where: { id: settings.id },
      data,
    });

    revalidatePath("/admin/lealtad");
    revalidatePath("/cuenta");

    return { success: true, settings: updated };
  } catch (error) {
    console.error("Error actualizando configuración:", error);
    return { success: false, error: "Error al actualizar configuración" };
  }
}

// ============================================
// ADMIN - Gestión de Recompensas
// ============================================

export async function createReward(data: {
  name: string;
  description?: string;
  image?: string;
  pointsCost: number;
  rewardType: "DISCOUNT" | "PERCENTAGE" | "FREE_SHIPPING" | "PRODUCT";
  rewardValue: number;
  minPurchase?: number;
  maxUses?: number;
  startsAt?: Date;
  expiresAt?: Date;
  allowedCategories?: string[];
}) {
  try {
    const reward = await prisma.reward.create({
      data,
    });

    revalidatePath("/admin/lealtad/recompensas");
    revalidatePath("/cuenta/recompensas");

    return { success: true, reward };
  } catch (error) {
    console.error("Error creando recompensa:", error);
    return { success: false, error: "Error al crear recompensa" };
  }
}

export async function updateReward(id: string, data: any) {
  try {
    const reward = await prisma.reward.update({
      where: { id },
      data,
    });

    revalidatePath("/admin/lealtad/recompensas");
    revalidatePath("/cuenta/recompensas");

    return { success: true, reward };
  } catch (error) {
    console.error("Error actualizando recompensa:", error);
    return { success: false, error: "Error al actualizar recompensa" };
  }
}

export async function deleteReward(id: string) {
  try {
    await prisma.reward.delete({
      where: { id },
    });

    revalidatePath("/admin/lealtad/recompensas");
    revalidatePath("/cuenta/recompensas");

    return { success: true };
  } catch (error) {
    console.error("Error eliminando recompensa:", error);
    return { success: false, error: "Error al eliminar recompensa" };
  }
}

// ============================================
// ADMIN - Gestión de Clientes
// ============================================

export async function getAllCustomers(params?: {
  search?: string;
  tier?: LoyaltyTier;
  sortBy?: "points" | "totalSpent" | "registeredAt";
  order?: "asc" | "desc";
}) {
  try {
    const where: any = {};

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { dni: { contains: params.search } },
      ];
    }

    if (params?.tier) {
      where.loyaltyTier = params.tier;
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            orders: true,
            referrals: true,
          },
        },
      },
      orderBy: params?.sortBy
        ? { [params.sortBy]: params.order || "desc" }
        : { registeredAt: "desc" },
    });

    return customers;
  } catch (error) {
    console.error("Error obteniendo clientes:", error);
    return [];
  }
}

export async function adjustCustomerPoints(
  customerId: string,
  points: number,
  reason: string
) {
  try {
    if (points > 0) {
      return await addPoints(customerId, {
        points,
        type: "ADMIN_ADJUSTMENT",
        description: reason || "Ajuste manual del administrador",
      });
    } else {
      return await deductPoints(customerId, {
        points: Math.abs(points),
        type: "ADMIN_ADJUSTMENT",
        description: reason || "Ajuste manual del administrador",
      });
    }
  } catch (error) {
    console.error("Error ajustando puntos:", error);
    return { success: false, error: "Error al ajustar puntos" };
  }
}

// ============================================
// ESTADÍSTICAS DEL PROGRAMA
// ============================================

export async function getLoyaltyProgramStats() {
  try {
    const totalCustomers = await prisma.customer.count();
    
    const tierCounts = await prisma.customer.groupBy({
      by: ["loyaltyTier"],
      _count: true,
    });

    const totalPointsGiven = await prisma.customer.aggregate({
      _sum: {
        totalPointsEarned: true,
      },
    });

    const totalPointsSpent = await prisma.customer.aggregate({
      _sum: {
        totalPointsSpent: true,
      },
    });

    const totalRedemptions = await prisma.rewardRedemption.count();

    const topReferrers = await prisma.customer.findMany({
      where: {
        referralCount: { gt: 0 },
      },
      orderBy: {
        referralCount: "desc",
      },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        referralCount: true,
        points: true,
      },
    });

    return {
      totalCustomers,
      tierCounts,
      totalPointsGiven: totalPointsGiven._sum.totalPointsEarned || 0,
      totalPointsSpent: totalPointsSpent._sum.totalPointsSpent || 0,
      totalRedemptions,
      topReferrers,
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return null;
  }
}