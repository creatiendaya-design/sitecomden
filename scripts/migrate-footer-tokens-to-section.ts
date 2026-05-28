/**
 * Phase 4 cleanup — one-shot, idempotent.
 *
 * The Phase 2 global "Theme.tokens.footer" panel duplicated controls
 * that already exist on the right-sidebar (color scheme, padding,
 * border) for the unified FOOTER section itself. To match Shopify's
 * model — where the section's own style IS the global control — we
 * remove the duplicate panel and migrate any previously-saved values
 * onto the FOOTER section's `content.style`.
 *
 * For each theme with a FOOTER section:
 *   - Copy `tokens.footer.colorSchemeId`  → section.content.style.colorSchemeId
 *   - Copy `tokens.footer.paddingTop`     → section.content.style.paddingTop (DeviceValue { shared })
 *   - Copy `tokens.footer.paddingBottom`  → section.content.style.paddingBottom (DeviceValue { shared })
 *   - Copy `tokens.footer.borderTopColor` → section.content.style.borderTopColor (DeviceValue { shared })
 *
 * Then clears `tokens.footer` so future loads don't reapply at the
 * theme-wrapper level.
 *
 * Only fills section.style fields that are currently empty/undefined —
 * never overwrites a value the admin has already set explicitly on the
 * section (the section's setting wins, mirroring how every other
 * customizer override works).
 *
 * Usage:
 *   npx tsx scripts/migrate-footer-tokens-to-section.ts
 */
import { prisma } from "../lib/db"

interface LegacyFooterTokens {
  colorSchemeId?: string
  paddingTop?: number
  paddingBottom?: number
  borderTopColor?: string
}

async function main(): Promise<void> {
  const themes = await prisma.theme.findMany({
    select: {
      id: true,
      name: true,
      tokens: true,
      sections: {
        where: { group: "FOOTER", type: "FOOTER" },
        select: { id: true, content: true },
      },
    },
  })

  let migrated = 0
  let skipped = 0

  for (const theme of themes) {
    const tokens = (theme.tokens as Record<string, unknown> | null) ?? {}
    const legacy = (tokens.footer as LegacyFooterTokens | undefined) ?? {}

    const hasSomething =
      Boolean(legacy.colorSchemeId) ||
      typeof legacy.paddingTop === "number" ||
      typeof legacy.paddingBottom === "number" ||
      Boolean(legacy.borderTopColor)

    if (!hasSomething) {
      skipped++
      continue
    }

    const section = theme.sections[0]
    if (!section) {
      // No FOOTER section yet — skip; the regular footer migration
      // script handles those. Re-running this after running that one
      // catches up.
      skipped++
      continue
    }

    const content = (section.content as Record<string, unknown> | null) ?? {}
    const style = (content.style as Record<string, unknown> | null) ?? {}

    const nextStyle: Record<string, unknown> = { ...style }

    if (legacy.colorSchemeId && !nextStyle.colorSchemeId) {
      nextStyle.colorSchemeId = legacy.colorSchemeId
    }
    if (
      typeof legacy.paddingTop === "number" &&
      nextStyle.paddingTop === undefined
    ) {
      nextStyle.paddingTop = { shared: legacy.paddingTop }
    }
    if (
      typeof legacy.paddingBottom === "number" &&
      nextStyle.paddingBottom === undefined
    ) {
      nextStyle.paddingBottom = { shared: legacy.paddingBottom }
    }
    if (legacy.borderTopColor && nextStyle.borderTopColor === undefined) {
      nextStyle.borderTopColor = { shared: legacy.borderTopColor }
    }

    const nextContent = { ...content, style: nextStyle }

    // Clear the legacy footer-tokens key.
    const { footer: _drop, ...restTokens } = tokens

    await prisma.$transaction([
      prisma.themeSection.update({
        where: { id: section.id },
        data: { content: nextContent as object },
      }),
      prisma.theme.update({
        where: { id: theme.id },
        data: { tokens: restTokens as object },
      }),
    ])

    migrated++
    console.log(
      `Migrated theme ${theme.name} (${theme.id}) — moved ${Object.keys(legacy).join(", ")} to section.style.`,
    )
  }

  console.log(`\nDone. Migrated: ${migrated}. Skipped: ${skipped}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
