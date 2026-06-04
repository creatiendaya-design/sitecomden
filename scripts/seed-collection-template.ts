// Plan 19 — Seed the default COLLECTION_GRID section for every theme that
// doesn't already have a COLLECTION-group section. This is what turns the
// products-index template (`/productos`) from the legacy hardcoded layout
// into an editable theme-sections template. Without a COLLECTION section the
// page falls back to the hardcoded layout, so running this is what activates
// the new render path.
//
// Idempotent — themes that already have at least one COLLECTION section are
// skipped, so this is safe to re-run.
//
// Run with:
//   npx tsx scripts/seed-collection-template.ts
import { PrismaClient } from "@prisma/client"
import { collectionGridDefinition } from "../lib/theme-sections/schema/collection-grid"

const prisma = new PrismaClient()

async function main() {
  console.log("Plan 19 — Seeding COLLECTION_GRID for themes without one...")

  const themes = await prisma.theme.findMany({ select: { id: true, name: true } })
  if (themes.length === 0) {
    console.log("  · No themes found. Nothing to seed.")
    return
  }

  let seeded = 0
  let skipped = 0

  for (const theme of themes) {
    const existing = await prisma.themeSection.count({
      where: { themeId: theme.id, group: "COLLECTION" },
    })
    if (existing > 0) {
      console.log(
        `  · "${theme.name}" — ${existing} COLLECTION section(s) already. Skipped.`,
      )
      skipped++
      continue
    }

    await prisma.themeSection.create({
      data: {
        themeId: theme.id,
        group: "COLLECTION",
        type: collectionGridDefinition.type,
        position: 0,
        content: collectionGridDefinition.defaultContent as object,
        enabled: true,
      },
    })
    console.log(`  · "${theme.name}" — created COLLECTION_GRID.`)
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
