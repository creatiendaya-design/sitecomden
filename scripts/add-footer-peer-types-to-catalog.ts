/**
 * Phase 4 one-shot — adds the new peer-level footer-group section
 * types (EMAIL_SIGNUP, FOOTER_BANNER) to every theme's
 * sectionCatalog.footer so they show up in the customizer's "+ Add
 * section" panel.
 *
 * Idempotent — running twice is a no-op for already-up-to-date themes.
 *
 *   npx tsx scripts/add-footer-peer-types-to-catalog.ts
 */
import { prisma } from "../lib/db"

const NEW_TYPES = ["EMAIL_SIGNUP", "FOOTER_BANNER"] as const

async function main(): Promise<void> {
  const themes = await prisma.theme.findMany({
    select: { id: true, name: true, sectionCatalog: true },
  })

  let updated = 0
  for (const theme of themes) {
    const catalog = (theme.sectionCatalog as { footer?: string[] } | null) ?? {}
    const current = catalog.footer ?? []
    const next = [...current]
    let changed = false
    for (const t of NEW_TYPES) {
      if (!next.includes(t)) {
        next.push(t)
        changed = true
      }
    }
    if (!changed) {
      console.log(`Skipping ${theme.name} — already up to date.`)
      continue
    }
    await prisma.theme.update({
      where: { id: theme.id },
      data: {
        sectionCatalog: { ...(catalog as object), footer: next } as object,
      },
    })
    updated++
    console.log(
      `Updated ${theme.name} — footer catalog now: [${next.join(", ")}]`,
    )
  }
  console.log(`\nDone. Updated: ${updated}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
