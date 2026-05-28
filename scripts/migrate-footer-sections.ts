/**
 * Phase 3 of the Shopify-style footer refactor — one-shot data migration.
 *
 * For each theme that has any of the legacy FOOTER_* peer sections, this
 * script:
 *   1. Creates a single unified FOOTER section.
 *   2. Converts each old peer section into a sub-block inside the new
 *      FOOTER, preserving order:
 *        FOOTER_COLUMNS       → its existing LINK_COLUMN/TEXT_COLUMN
 *                               sub-blocks come along verbatim. If the
 *                               legacy section had aboutTitle/aboutText
 *                               on its own content, a leading TEXT_COLUMN
 *                               block is created with that content.
 *        FOOTER_NEWSLETTER    → NEWSLETTER sub-block (content copied).
 *        FOOTER_SOCIAL        → SOCIAL sub-block.
 *        FOOTER_RICH_TEXT     → RICH_TEXT_BLOCK sub-block.
 *        FOOTER_PAYMENT_ICONS → PAYMENT_ICONS sub-block.
 *        FOOTER_COPYRIGHT     → COPYRIGHT sub-block.
 *   3. Deletes the legacy peer sections (Prisma cascades their blocks).
 *   4. Clears any legacy FOOTER_* entries from Theme.sectionCatalog.footer
 *      and replaces with ["FOOTER"].
 *
 * Idempotent — running again is a no-op once each theme has a FOOTER
 * section. Use:
 *   npx tsx scripts/migrate-footer-sections.ts
 *
 * After this runs the old FOOTER_* section types no longer have
 * renderers or schemas, so the storefront will silently skip any peer
 * row that somehow slipped through.
 */
import { prisma } from "../lib/db"

const LEGACY_FOOTER_TYPES = [
  "FOOTER_COLUMNS",
  "FOOTER_NEWSLETTER",
  "FOOTER_SOCIAL",
  "FOOTER_RICH_TEXT",
  "FOOTER_PAYMENT_ICONS",
  "FOOTER_COPYRIGHT",
] as const

type LegacyType = (typeof LEGACY_FOOTER_TYPES)[number]

interface LegacySection {
  id: string
  type: string
  position: number
  enabled: boolean
  content: Record<string, unknown>
  blocks: Array<{
    id: string
    type: string
    position: number
    enabled: boolean
    content: Record<string, unknown>
  }>
}

interface PreparedBlock {
  type: string
  enabled: boolean
  content: Record<string, unknown>
}

async function main(): Promise<void> {
  const themes = await prisma.theme.findMany({
    select: { id: true, name: true, sectionCatalog: true },
  })

  let themesProcessed = 0
  let themesSkipped = 0
  let totalNewBlocks = 0

  for (const theme of themes) {
    // Skip if this theme already has a unified FOOTER section.
    const existingNew = await prisma.themeSection.findFirst({
      where: { themeId: theme.id, group: "FOOTER", type: "FOOTER" },
      select: { id: true },
    })
    if (existingNew) {
      themesSkipped++
      console.log(`Skipping theme ${theme.name} (${theme.id}) — already migrated.`)
      continue
    }

    const legacy = await prisma.themeSection.findMany({
      where: {
        themeId: theme.id,
        group: "FOOTER",
        type: { in: LEGACY_FOOTER_TYPES as unknown as string[] },
      },
      include: { blocks: { orderBy: { position: "asc" } } },
      orderBy: { position: "asc" },
    })

    if (legacy.length === 0) {
      themesSkipped++
      console.log(
        `Skipping theme ${theme.name} (${theme.id}) — no legacy FOOTER_* sections.`,
      )
      continue
    }

    const legacySections: LegacySection[] = legacy.map((s) => ({
      id: s.id,
      type: s.type,
      position: s.position,
      enabled: s.enabled,
      content: (s.content as Record<string, unknown>) ?? {},
      blocks: s.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        position: b.position,
        enabled: b.enabled,
        content: (b.content as Record<string, unknown>) ?? {},
      })),
    }))

    const prepared = buildSubBlocks(legacySections)

    await prisma.$transaction(async (tx) => {
      // 1. Make room — every legacy FOOTER_* section is gone after this
      //    transaction, so the new FOOTER lands at position 0 of its
      //    group (FOOTER group typically only has one section anyway).
      await tx.themeSection.deleteMany({
        where: {
          themeId: theme.id,
          group: "FOOTER",
          type: { in: LEGACY_FOOTER_TYPES as unknown as string[] },
        },
      })

      // 2. Create the new unified FOOTER + its sub-blocks in one go.
      await tx.themeSection.create({
        data: {
          themeId: theme.id,
          group: "FOOTER",
          type: "FOOTER",
          position: 0,
          enabled: true,
          content: { layout: "auto" },
          blocks: {
            create: prepared.map((b, i) => ({
              type: b.type,
              position: i,
              enabled: b.enabled,
              content: b.content as object,
            })),
          },
        },
      })

      // 3. Catalog: drop legacy FOOTER_* entries; ensure "FOOTER" is allowed.
      const catalog =
        (theme.sectionCatalog as { footer?: string[] } | null) ?? {}
      const nextFooter = (() => {
        const current = catalog.footer ?? []
        const filtered = current.filter(
          (t) => !LEGACY_FOOTER_TYPES.includes(t as LegacyType),
        )
        return filtered.includes("FOOTER") ? filtered : [...filtered, "FOOTER"]
      })()
      await tx.theme.update({
        where: { id: theme.id },
        data: {
          sectionCatalog: {
            ...(catalog as object),
            footer: nextFooter,
          } as object,
        },
      })
    })

    themesProcessed++
    totalNewBlocks += prepared.length
    console.log(
      `Migrated theme ${theme.name} (${theme.id}) — ${prepared.length} sub-blocks.`,
    )
  }

  console.log(
    `\nDone. Themes migrated: ${themesProcessed}. Skipped: ${themesSkipped}. Total sub-blocks created: ${totalNewBlocks}.`,
  )
}

/**
 * Walks the legacy sections in their original order and turns each one
 * into the matching sub-block payload(s) for the new FOOTER section.
 * Returns a flat array in the order they should be inserted.
 */
function buildSubBlocks(sections: LegacySection[]): PreparedBlock[] {
  const out: PreparedBlock[] = []

  for (const section of sections) {
    switch (section.type) {
      case "FOOTER_COLUMNS": {
        // The old section sometimes carried `aboutTitle` / `aboutText` on
        // its own content; the renderer showed them as a leading column.
        // Preserve that behavior by emitting a TEXT_COLUMN sub-block.
        const aboutTitle = strField(section.content, "aboutTitle")
        const aboutText = strField(section.content, "aboutText")
        if (aboutTitle || aboutText) {
          out.push({
            type: "TEXT_COLUMN",
            enabled: section.enabled,
            content: {
              title: aboutTitle ?? "Sobre nosotros",
              body: aboutText ?? "",
            },
          })
        }
        // Then bring across each existing LINK_COLUMN / TEXT_COLUMN
        // sub-block verbatim.
        for (const block of section.blocks) {
          if (block.type === "LINK_COLUMN" || block.type === "TEXT_COLUMN") {
            out.push({
              type: block.type,
              enabled: block.enabled,
              content: block.content,
            })
          }
        }
        break
      }
      case "FOOTER_NEWSLETTER":
        out.push({
          type: "NEWSLETTER",
          enabled: section.enabled,
          content: pick(section.content, [
            "title",
            "description",
            "buttonLabel",
            "successMessage",
          ]),
        })
        break
      case "FOOTER_SOCIAL":
        out.push({
          type: "SOCIAL",
          enabled: section.enabled,
          content: pick(section.content, ["title"]),
        })
        break
      case "FOOTER_RICH_TEXT":
        out.push({
          type: "RICH_TEXT_BLOCK",
          enabled: section.enabled,
          content: pick(section.content, ["title", "body"]),
        })
        break
      case "FOOTER_PAYMENT_ICONS":
        out.push({
          type: "PAYMENT_ICONS",
          enabled: section.enabled,
          content: pick(section.content, ["methods"]),
        })
        break
      case "FOOTER_COPYRIGHT":
        out.push({
          type: "COPYRIGHT",
          enabled: section.enabled,
          content: pick(section.content, ["text"]),
        })
        break
      default:
        // Unknown legacy type — drop silently. There are no other
        // FOOTER_* shapes in the codebase.
        break
    }
  }

  return out
}

function strField(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = source[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function pick(
  source: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key]
  }
  return out
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
