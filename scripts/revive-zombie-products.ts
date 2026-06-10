// scripts/revive-zombie-products.ts
//
// Repara los productos "zombie" creados por re-importar un CSV sobre slugs
// previamente soft-eliminados: quedaron `active: true` + `deletedAt != null`,
// por lo que se ven en la tienda pero NO en /admin/productos.
//
// Es seguro: un producto borrado correctamente queda `active: false` (el
// soft-delete setea ambos campos juntos). Por lo tanto, todo producto con
// `deletedAt != null` Y `active: true` es necesariamente un zombie de import,
// nunca un borrado legítimo.
//
//   npx tsx scripts/revive-zombie-products.ts          # dry-run (solo lista)
//   npx tsx scripts/revive-zombie-products.ts --apply  # aplica el fix

import { prisma } from "@/lib/db";

async function main() {
  const apply = process.argv.includes("--apply");

  const zombies = await prisma.product.findMany({
    where: { deletedAt: { not: null }, active: true },
    select: { id: true, slug: true, name: true, deletedAt: true },
    orderBy: { deletedAt: "desc" },
  });

  if (zombies.length === 0) {
    console.log("✅ No hay productos zombie (active=true + deletedAt!=null).");
    return;
  }

  console.log(`Encontrados ${zombies.length} producto(s) zombie:\n`);
  for (const p of zombies) {
    console.log(`  • ${p.name}  [slug: ${p.slug}]  deletedAt: ${p.deletedAt?.toISOString()}`);
  }

  if (!apply) {
    console.log(`\n(dry-run) Vuelve a correr con --apply para limpiar deletedAt en estos ${zombies.length} producto(s).`);
    return;
  }

  const res = await prisma.product.updateMany({
    where: { deletedAt: { not: null }, active: true },
    data: { deletedAt: null },
  });

  console.log(`\n✅ Resucitados ${res.count} producto(s). Ya deberían aparecer en /admin/productos.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
