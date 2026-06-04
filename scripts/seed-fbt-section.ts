/**
 * Ensures a FREQUENTLY_BOUGHT_TOGETHER theme section exists on the active
 * theme (so "Comprados juntos" shows on product pages and is editable in the
 * customizer). Mirrors scripts/seed-reviews.ts for the reviews section.
 *
 *   npx tsx scripts/seed-fbt-section.ts
 */
import { prisma, } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Mirrors frequentlyBoughtTogetherDefinition.defaultContent (inlined to keep
// this Node script free of lucide-react imports).
const FBT_DEFAULT_CONTENT = {
  heading: "Comprados juntos",
  mode: "add_all",
  limit: 3,
};

async function main() {
  const theme = await prisma.theme.findFirst({ where: { active: true } });
  if (!theme) {
    console.warn("⚠️  No hay tema activo. Aborta.");
    return;
  }

  const existing = await prisma.themeSection.findFirst({
    where: {
      themeId: theme.id,
      group: "PRODUCT",
      type: "FREQUENTLY_BOUGHT_TOGETHER",
    },
  });

  if (existing) {
    console.log("ℹ️  La sección FREQUENTLY_BOUGHT_TOGETHER ya existe en el tema activo");
  } else {
    const last = await prisma.themeSection.findFirst({
      where: { themeId: theme.id, group: "PRODUCT" },
      orderBy: { position: "desc" },
    });
    await prisma.themeSection.create({
      data: {
        themeId: theme.id,
        group: "PRODUCT",
        type: "FREQUENTLY_BOUGHT_TOGETHER",
        position: (last?.position ?? -1) + 1,
        content: FBT_DEFAULT_CONTENT as Prisma.InputJsonValue,
        enabled: true,
      },
    });
    console.log(`✅ Sección "Comprados juntos" agregada al tema "${theme.name}"`);
  }

  // If the theme curates a non-empty product catalog, make sure the type is
  // offered in the customizer's "Add section" panel.
  const catalog = (theme.sectionCatalog ?? {}) as {
    product?: string[];
    [k: string]: unknown;
  };
  if (
    Array.isArray(catalog.product) &&
    catalog.product.length > 0 &&
    !catalog.product.includes("FREQUENTLY_BOUGHT_TOGETHER")
  ) {
    await prisma.theme.update({
      where: { id: theme.id },
      data: {
        sectionCatalog: {
          ...catalog,
          product: [...catalog.product, "FREQUENTLY_BOUGHT_TOGETHER"],
        } as Prisma.InputJsonValue,
      },
    });
    console.log("✅ FREQUENTLY_BOUGHT_TOGETHER agregado al catálogo del tema");
  }

  console.log("\nListo. Abre un producto en la tienda para verla, o el Personalizador para editarla.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
