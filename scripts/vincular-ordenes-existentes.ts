/**
 * BACKFILL: vincular órdenes históricas a fichas de Customer y recomputar las
 * stats del CRM (totalOrders / totalSpent / lastPurchaseAt) desde las órdenes
 * PAGADAS.
 *
 * Contexto: durante mucho tiempo `Order.customerId` nunca se seteó al crear la
 * orden y la contabilización de compra (`onOrderPaid`) no existía, así que
 * /admin/clientes mostraba a los registrados con 0 órdenes / S/. 0.00 y los
 * compradores invitados no aparecían. Este script repara el histórico.
 *
 * Idempotente: se puede re-ejecutar sin doble conteo (recomputa desde cero y
 * marca las órdenes pagadas con `customerTier` para que `onOrderPaid` no las
 * vuelva a contar si un webhook se reprocesa).
 *
 * NO otorga puntos de lealtad retroactivos a propósito (evita balances sorpresa);
 * solo las compras nuevas acumulan puntos vía onOrderPaid.
 *
 * Ejecutar: npx tsx scripts/vincular-ordenes-existentes.ts
 */

import { prisma } from "@/lib/db";
import { ensureCustomerId } from "@/lib/loyalty/link-customer";
import { isPlaceholderEmail } from "@/lib/loyalty/core";

async function main() {
  console.log("🔗 BACKFILL: vinculación de órdenes y stats de clientes\n");

  // 1. Vincular órdenes sin customerId (creadas antes de la lógica de enlace).
  const unlinked = await prisma.order.findMany({
    where: { customerId: null },
    select: {
      id: true,
      customerEmail: true,
      customerName: true,
      customerPhone: true,
    },
  });

  console.log(`📦 Órdenes sin customerId: ${unlinked.length}`);

  let linked = 0;
  let skipped = 0;
  for (const order of unlinked) {
    if (isPlaceholderEmail(order.customerEmail)) {
      skipped++;
      continue;
    }
    const customerId = await ensureCustomerId({
      email: order.customerEmail,
      name: order.customerName,
      phone: order.customerPhone,
    });
    if (!customerId) {
      skipped++;
      continue;
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { customerId },
    });
    linked++;
  }

  console.log(`  ✅ Vinculadas: ${linked}`);
  console.log(`  ⏭️  Omitidas (sin email real): ${skipped}\n`);

  // 2. Recomputar stats agregadas de cada cliente desde sus órdenes PAGADAS.
  const customers = await prisma.customer.findMany({
    select: { id: true, loyaltyTier: true },
  });

  console.log(`👥 Recomputando stats de ${customers.length} clientes…`);

  let updatedCustomers = 0;
  for (const customer of customers) {
    const agg = await prisma.order.aggregate({
      where: { customerId: customer.id, paymentStatus: "PAID" },
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    });

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalOrders: agg._count._all,
        totalSpent: agg._sum.total ?? 0,
        lastPurchaseAt: agg._max.createdAt ?? null,
      },
    });

    // Marcar las órdenes pagadas ya contabilizadas para que onOrderPaid no las
    // vuelva a contar ante un reproceso de webhook.
    await prisma.order.updateMany({
      where: {
        customerId: customer.id,
        paymentStatus: "PAID",
        customerTier: null,
      },
      data: { customerTier: customer.loyaltyTier },
    });

    updatedCustomers++;
  }

  console.log(`  ✅ Clientes actualizados: ${updatedCustomers}\n`);
  console.log("✅ Backfill completado");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error en backfill:", error);
    process.exit(1);
  });
