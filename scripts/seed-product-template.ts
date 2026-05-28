// Plan 17 — Seed the default PRODUCT_MAIN section + its 7 sub-blocks for
// every theme that doesn't already have a PRODUCT-group section. Mirrors the
// order of the legacy `ProductStandardView` so the storefront looks identical
// the first time the new render path is active.
//
// Idempotent — themes that already have at least one PRODUCT section are
// skipped, so this is safe to re-run after partial migrations or seed runs
// that bailed halfway.
//
// Run with:
//   npx tsx scripts/seed-product-template.ts
import { PrismaClient } from "@prisma/client"
import { productMainDefinition } from "../lib/theme-sections/schema/product-main"

const prisma = new PrismaClient()

async function main() {
  console.log("Plan 17 — Seeding PRODUCT_MAIN for themes without one...")

  const themes = await prisma.theme.findMany({ select: { id: true, name: true } })
  if (themes.length === 0) {
    console.log("  · No themes found. Nothing to seed.")
    return
  }

  let seeded = 0
  let skipped = 0

  for (const theme of themes) {
    const existing = await prisma.themeSection.count({
      where: { themeId: theme.id, group: "PRODUCT" },
    })
    if (existing > 0) {
      console.log(`  · "${theme.name}" — ${existing} PRODUCT section(s) already. Skipped.`)
      skipped++
      continue
    }

    await prisma.themeSection.create({
      data: {
        themeId: theme.id,
        group: "PRODUCT",
        type: productMainDefinition.type,
        position: 0,
        content: productMainDefinition.defaultContent as object,
        enabled: true,
        blocks: {
          create: (productMainDefinition.defaultBlocks ?? []).map((b, i) => ({
            type: b.type,
            position: i,
            content: b.content as object,
            enabled: true,
          })),
        },
      },
    })
    console.log(
      `  · "${theme.name}" — created PRODUCT_MAIN + ${productMainDefinition.defaultBlocks?.length ?? 0} sub-blocks.`,
    )
    seeded++
  }

  console.log(`Done. Seeded ${seeded} theme(s), skipped ${skipped}.`)
}

main()
  .catch((err) => {
    console.error("Seed failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
