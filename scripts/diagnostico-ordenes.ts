// SCRIPT DE DIAGNÓSTICO
// Ejecutar: npx tsx scripts/diagnostico-ordenes.ts

import { prisma } from "@/lib/db";
import { formatPeruDateTime } from "@/lib/format-date";

async function diagnosticar() {
  console.log("🔍 DIAGNÓSTICO DE ÓRDENES\n");

  // 1. Total de órdenes
  const totalOrders = await prisma.order.count();
  console.log(`📊 Total de órdenes en BD: ${totalOrders}`);

  // 2. Órdenes por email
  const ordersByEmail = await prisma.order.groupBy({
    by: ["customerEmail"],
    _count: true,
  });

  console.log("\n📧 Órdenes por email:");
  ordersByEmail.forEach((group) => {
    console.log(`  - ${group.customerEmail}: ${group._count} órdenes`);
  });

  // 3. Órdenes con customerId
  const ordersWithCustomer = await prisma.order.count({
    where: { customerId: { not: null } },
  });
  const ordersWithoutCustomer = await prisma.order.count({
    where: { customerId: null },
  });

  console.log("\n🔗 Vinculación con Customer:");
  console.log(`  - Con customerId: ${ordersWithCustomer}`);
  console.log(`  - Sin customerId: ${ordersWithoutCustomer}`);

  // 4. Todas las órdenes (detalle)
  const allOrders = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      customerEmail: true,
      customerName: true,
      customerId: true,
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log("\n📋 DETALLE DE TODAS LAS ÓRDENES:");
  allOrders.forEach((order) => {
    console.log(`\n  Orden: ${order.orderNumber}`);
    console.log(`    Email: ${order.customerEmail || "❌ SIN EMAIL"}`);
    console.log(`    Nombre: ${order.customerName}`);
    console.log(`    CustomerId: ${order.customerId || "❌ NO VINCULADO"}`);
    console.log(`    Total: S/. ${order.total}`);
    console.log(`    Fecha: ${formatPeruDateTime(order.createdAt)}`);
  });

  // 5. Customers registrados
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      points: true,
      _count: {
        select: { orders: true },
      },
    },
  });

  console.log("\n\n👥 CUSTOMERS REGISTRADOS:");
  customers.forEach((customer) => {
    console.log(`\n  Customer: ${customer.name}`);
    console.log(`    Email: ${customer.email}`);
    console.log(`    ID: ${customer.id}`);
    console.log(`    Puntos: ${customer.points}`);
    console.log(`    Órdenes vinculadas: ${customer._count.orders}`);
  });

  // 6. Problema detectado
  console.log("\n\n⚠️ PROBLEMAS DETECTADOS:");
  
  if (ordersWithoutCustomer > 0) {
    console.log(`  ❌ ${ordersWithoutCustomer} órdenes sin vincular a Customer`);
  }

  const ordersWithEmptyEmail = await prisma.order.count({
    where: {
      customerEmail: "",
    },
  });

  if (ordersWithEmptyEmail > 0) {
    console.log(`  ❌ ${ordersWithEmptyEmail} órdenes con email vacío`);
  }

  // 7. Recomendaciones
  console.log("\n\n💡 RECOMENDACIONES:");
  
  if (ordersWithoutCustomer > 0) {
    console.log("  1. Ejecutar script de vinculación de órdenes");
    console.log("     npx tsx scripts/vincular-ordenes-existentes.ts");
  }

  if (ordersWithEmptyEmail > 0) {
    console.log("  2. Hay órdenes con email vacío - revisar proceso de checkout");
  }

  console.log("\n✅ Diagnóstico completado\n");
}

diagnosticar()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });