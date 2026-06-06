import type { Prisma } from "@prisma/client";
import { calculateLoyaltyTier } from "./core";
import type { LoyaltyProgramSettings } from "@prisma/client";

/**
 * Revierte en el CRM la contabilización de una compra cuando la orden se
 * reembolsa. Inverso de `onOrderPaid` (award-purchase.ts): descuenta los puntos
 * otorgados, resta `totalSpent` / `totalOrders`, recalcula el tier y deja una
 * transacción de puntos negativa (ADMIN_ADJUSTMENT).
 *
 * Debe correr DENTRO de la `$transaction` del reembolso. La idempotencia la
 * garantiza el claim atómico del orquestador (PAID → REFUNDED corre una vez).
 *
 * `settings` se lee FUERA de la transacción y se pasa como parámetro para no
 * abrir otra conexión (con el cliente prisma global) mientras la tx tiene locks
 * tomados — importante en Neon serverless.
 *
 * Usa floors (`Math.max(0, …)` / `Math.min(…)`) para que un cliente cuyos
 * contadores ya estén descuadrados nunca quede con puntos/totales negativos.
 */

export interface RevertLoyaltyOrder {
  customerId: string | null;
  customerTier: string | null;
  pointsEarned: number | null;
  total: Prisma.Decimal | number;
  orderNumber: string;
  id: string;
}

export async function revertLoyaltyForOrder(
  tx: Prisma.TransactionClient,
  order: RevertLoyaltyOrder,
  settings: LoyaltyProgramSettings | null
): Promise<void> {
  // Si nunca se contabilizó (customerTier null) o no hay cliente, no hay nada
  // que revertir.
  if (!order.customerId || order.customerTier === null) return;

  const customer = await tx.customer.findUnique({
    where: { id: order.customerId },
    select: { points: true, loyaltyTier: true, totalOrders: true, totalSpent: true },
  });
  if (!customer) return;

  const pointsEarned = order.pointsEarned ?? 0;
  const pointsToRemove = Math.min(Math.max(0, pointsEarned), customer.points);
  const newPoints = customer.points - pointsToRemove;
  const newTotalOrders = Math.max(0, customer.totalOrders - 1);
  const newTotalSpent = Math.max(0, Number(customer.totalSpent) - Number(order.total));

  const newTier = settings
    ? calculateLoyaltyTier(newPoints, settings)
    : customer.loyaltyTier;

  await tx.customer.update({
    where: { id: order.customerId },
    data: {
      points: newPoints,
      totalOrders: newTotalOrders,
      totalSpent: newTotalSpent,
      loyaltyTier: newTier,
    },
  });

  if (pointsToRemove > 0) {
    await tx.pointTransaction.create({
      data: {
        customerId: order.customerId,
        type: "ADMIN_ADJUSTMENT",
        points: -pointsToRemove,
        description: `Reembolso orden #${order.orderNumber}`,
        reference: order.id,
        balanceAfter: newPoints,
      },
    });
  }
}
