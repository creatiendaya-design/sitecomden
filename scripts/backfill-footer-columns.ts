/**
 * Plan 16 — Phase A backfill (one-shot, idempotent).
 *
 * For each FOOTER_COLUMNS section that still carries `content.__legacyFooterMenuId`,
 * read the referenced Menu, take its root items that have children, and create
 * one LINK_COLUMN ThemeSectionBlock per root. Then strip the marker so the
 * script is idempotent — re-running does nothing.
 *
 * Run AFTER `npx prisma migrate deploy` and BEFORE the new code reads from
 * ThemeSection (Phase C ships).
 *
 * Usage:
 *   npx tsx scripts/backfill-footer-columns.ts
 */
import { prisma } from "../lib/db"
import { resolveMenuItemHref } from "../lib/menus/resolve-link"
import { resolveMenuFromRow } from "../lib/menus/resolve-menu"

interface LinkColumnContent {
  title: string
  links: Array<{
    label: string
    href: string
    openInNewTab: boolean
  }>
}

async function main(): Promise<void> {
  const sections = await prisma.themeSection.findMany({
    where: { type: "FOOTER_COLUMNS", group: "FOOTER" },
    include: { blocks: true },
  })

  let processed = 0
  let skipped = 0

  for (const section of sections) {
    const content = (section.content ?? {}) as Record<string, unknown>
    const legacyMenuId = content.__legacyFooterMenuId

    if (typeof legacyMenuId !== "string" || legacyMenuId.length === 0) {
      skipped++
      continue
    }

    if (section.blocks.length > 0) {
      // Already populated by a prior run — strip marker and move on.
      const { __legacyFooterMenuId: _drop, ...rest } = content
      await prisma.themeSection.update({
        where: { id: section.id },
        data: { content: rest as object },
      })
      skipped++
      continue
    }

    // Pull the menu in the same shape `resolveMenuFromRow` expects so
    // `resolveMenuItemHref` gets the pre-joined slug fields it needs.
    const menuRow = await prisma.menu.findUnique({
      where: { id: legacyMenuId },
      select: {
        id: true,
        slug: true,
        title: true,
        items: {
          orderBy: [{ parentId: "asc" }, { position: "asc" }],
          select: {
            id: true,
            parentId: true,
            position: true,
            label: true,
            linkType: true,
            targetId: true,
            externalUrl: true,
            openInNewTab: true,
          },
        },
      },
    })

    const resolved = menuRow ? await resolveMenuFromRow(menuRow) : null
    const rootColumns = resolved?.items.filter((i) => i.children.length > 0) ?? []

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < rootColumns.length; i++) {
        const col = rootColumns[i]
        const blockContent: LinkColumnContent = {
          title: col.label,
          links: col.children
            .map((child) => {
              const href = resolveMenuItemHref(child)
              if (!href) return null
              return {
                label: child.label,
                href,
                openInNewTab: child.openInNewTab,
              }
            })
            .filter((l): l is LinkColumnContent["links"][number] => l !== null),
        }

        await tx.themeSectionBlock.create({
          data: {
            sectionId: section.id,
            type: "LINK_COLUMN",
            position: i,
            content: blockContent as object,
            enabled: true,
          },
        })
      }

      const { __legacyFooterMenuId: _drop, ...rest } = content
      await tx.themeSection.update({
        where: { id: section.id },
        data: { content: rest as object },
      })
    })

    processed++
  }

  console.log(`Backfill complete. Processed: ${processed}, skipped: ${skipped}.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
