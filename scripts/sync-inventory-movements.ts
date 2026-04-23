/**
 * Reconcilia movimientos de inventario para productos existentes.
 * Crea un movimiento ADJUSTMENT inicial para cada producto/variante
 * que tiene stock > 0 pero ningún movimiento registrado.
 *
 * Uso: npx tsx scripts/sync-inventory-movements.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Iniciando reconciliación de inventario...\n");

  // --- Productos simples (sin variantes) ---
  const simpleProducts = await prisma.product.findMany({
    where: { hasVariants: false, stock: { gt: 0 } },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      _count: { select: { inventoryMovements: true } },
    },
  });

  const simpleWithoutMovements = simpleProducts.filter(
    (p) => p._count.inventoryMovements === 0
  );

  console.log(`Productos simples con stock > 0: ${simpleProducts.length}`);
  console.log(`  → Sin movimientos registrados: ${simpleWithoutMovements.length}`);

  let createdSimple = 0;
  for (const product of simpleWithoutMovements) {
    await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        type: "ADJUSTMENT",
        quantity: product.stock,
        reason: "Reconciliación de stock inicial",
      },
    });
    console.log(`  ✓ ${product.name} (SKU: ${product.sku ?? "—"}) → +${product.stock}`);
    createdSimple++;
  }

  // --- Variantes ---
  const variants = await prisma.productVariant.findMany({
    where: { stock: { gt: 0 } },
    select: {
      id: true,
      sku: true,
      stock: true,
      productId: true,
      product: { select: { name: true } },
      _count: { select: { inventoryMovements: true } },
    },
  });

  const variantsWithoutMovements = variants.filter(
    (v) => v._count.inventoryMovements === 0
  );

  console.log(`\nVariantes con stock > 0: ${variants.length}`);
  console.log(`  → Sin movimientos registrados: ${variantsWithoutMovements.length}`);

  let createdVariants = 0;
  for (const variant of variantsWithoutMovements) {
    await prisma.inventoryMovement.create({
      data: {
        productId: variant.productId,
        variantId: variant.id,
        type: "ADJUSTMENT",
        quantity: variant.stock,
        reason: "Reconciliación de stock inicial",
      },
    });
    console.log(`  ✓ ${variant.product?.name} / ${variant.sku} → +${variant.stock}`);
    createdVariants++;
  }

  console.log(`\n✅ Reconciliación completa:`);
  console.log(`   Movimientos creados para productos simples: ${createdSimple}`);
  console.log(`   Movimientos creados para variantes:         ${createdVariants}`);
  console.log(`   Total:                                      ${createdSimple + createdVariants}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
