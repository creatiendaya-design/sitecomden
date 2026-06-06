/**
 * Sanea datos SEO legacy que exceden los límites del schema de validación.
 *
 * Causa: la importación CSV (lib/csv-shopify.ts / lib/csv-generic.ts) escribía
 * `metaTitle` / `metaDescription` directo a BD sin pasar por updateProductSchema,
 * dejando valores > 60 / > 160 chars que luego rompen la edición del producto/categoría.
 *
 * Límites (deben coincidir con lib/validations.ts):
 *   metaTitle       <= 60
 *   metaDescription <= 160
 *
 * Uso:
 *   npx tsx scripts/clamp-product-seo.ts            # modo dry-run (solo reporta)
 *   npx tsx scripts/clamp-product-seo.ts --apply    # aplica los recortes
 */
import { prisma } from "@/lib/db";

const META_TITLE_MAX = 60;
const META_DESCRIPTION_MAX = 160;

type Row = {
  id: string;
  name: string;
  metaTitle: string | null;
  metaDescription: string | null;
};

function clamp(value: string | null, max: number): string | null {
  if (value == null) return null;
  return value.length > max ? value.slice(0, max) : value;
}

async function healModel(
  label: string,
  rows: Row[],
  update: (id: string, data: { metaTitle?: string; metaDescription?: string }) => Promise<unknown>,
  apply: boolean
): Promise<number> {
  let healed = 0;

  for (const row of rows) {
    const newTitle = clamp(row.metaTitle, META_TITLE_MAX);
    const newDesc = clamp(row.metaDescription, META_DESCRIPTION_MAX);

    const titleChanged = newTitle !== row.metaTitle;
    const descChanged = newDesc !== row.metaDescription;
    if (!titleChanged && !descChanged) continue;

    healed++;
    console.log(`  • [${label}] ${row.name} (${row.id})`);
    if (titleChanged) {
      console.log(`      metaTitle: ${row.metaTitle?.length} → ${newTitle?.length} chars`);
    }
    if (descChanged) {
      console.log(`      metaDescription: ${row.metaDescription?.length} → ${newDesc?.length} chars`);
    }

    if (apply) {
      const data: { metaTitle?: string; metaDescription?: string } = {};
      if (titleChanged && newTitle != null) data.metaTitle = newTitle;
      if (descChanged && newDesc != null) data.metaDescription = newDesc;
      await update(row.id, data);
    }
  }

  return healed;
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "🔧 Modo APPLY: se aplicarán los recortes\n" : "👀 Modo DRY-RUN: solo reporta (usa --apply para escribir)\n");

  const products = await prisma.product.findMany({
    select: { id: true, name: true, metaTitle: true, metaDescription: true },
  });
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, metaTitle: true, metaDescription: true },
  });

  const productsHealed = await healModel(
    "Product",
    products,
    (id, data) => prisma.product.update({ where: { id }, data }),
    apply
  );
  const categoriesHealed = await healModel(
    "Category",
    categories,
    (id, data) => prisma.category.update({ where: { id }, data }),
    apply
  );

  console.log("\n──────────────────────────────");
  console.log(`Productos con SEO recortado:  ${productsHealed} / ${products.length}`);
  console.log(`Categorías con SEO recortado: ${categoriesHealed} / ${categories.length}`);
  if (!apply && productsHealed + categoriesHealed > 0) {
    console.log("\nEjecuta de nuevo con --apply para escribir los cambios.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
