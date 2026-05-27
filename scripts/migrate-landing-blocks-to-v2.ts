/**
 * Migrate existing LandingBlock.content from v1 flat shape to v2
 * `{ data, style, media }` shape.
 *
 * Usage:
 *   npx tsx scripts/migrate-landing-blocks-to-v2.ts            # dry-run (default)
 *   npx tsx scripts/migrate-landing-blocks-to-v2.ts --apply    # write changes to DB
 *
 * Properties:
 *   - Idempotent: if a block already has v2 shape (has "data" key at top level),
 *     it is skipped.
 *   - Transactional: processes blocks in batches of 100 within a transaction.
 *   - Safe: dry-run prints a summary without touching the DB.
 */
import { PrismaClient } from "@prisma/client"
import type { LandingBlockType } from "../lib/types/landing-blocks"
import { DEFAULT_STYLE } from "../lib/blocks/defaults"
import type { BlockContentV2 } from "../lib/blocks/types"

const prisma = new PrismaClient()

const APPLY = process.argv.includes("--apply")
const BATCH_SIZE = 100

type V1Content = Record<string, unknown>

function isAlreadyV2(content: unknown): boolean {
  return (
    typeof content === "object" &&
    content !== null &&
    "data" in content &&
    "style" in content &&
    "media" in content
  )
}

/**
 * Transform a v1 flat content object to v2 based on its block type.
 * Text fields go to `data`. Visual/color fields go to `style` or `media`
 * as appropriate. Images are duplicated as { desktop, mobile }.
 */
function transformV1toV2(type: LandingBlockType, v1: V1Content): BlockContentV2 {
  switch (type) {
    case "HERO": {
      const title = (v1.title as string) ?? ""
      const subtitle = (v1.subtitle as string) ?? ""
      const ctaText = (v1.ctaText as string) ?? ""
      const bgImageUrl = (v1.bgImage as string) ?? ""
      const overlayColor = (v1.overlayColor as string) ?? "rgba(0,0,0,0.3)"
      return {
        data: { title, subtitle, ctaText },
        style: { ...DEFAULT_STYLE, paddingY: "xl" },
        media: {
          bgImage: bgImageUrl ? { desktop: bgImageUrl, mobile: bgImageUrl } : undefined,
          bgOverlay: { desktop: overlayColor, mobile: overlayColor },
        },
      }
    }
    case "GALLERY": {
      const displayType = (v1.displayType as string) ?? "slider"
      const images = (v1.images as string[]) ?? []
      const showBuyButton = Boolean(v1.showBuyButton)
      return {
        data: { displayType, images, showBuyButton },
        style: { ...DEFAULT_STYLE },
        media: {},
      }
    }
    case "TESTIMONIALS": {
      const items = (v1.items as unknown[]) ?? []
      return {
        data: { items },
        style: { ...DEFAULT_STYLE },
        media: {},
      }
    }
    case "VIDEO": {
      const displayType = (v1.displayType as string) ?? "slider"
      const videos = (v1.videos as unknown[]) ?? []
      const showBuyButton = Boolean(v1.showBuyButton)
      return {
        data: { displayType, videos, showBuyButton },
        style: { ...DEFAULT_STYLE },
        media: {},
      }
    }
    case "COLORS": {
      return {
        data: {
          primary: (v1.primary as string) ?? "#3b82f6",
          background: (v1.background as string) ?? "#ffffff",
          cta: (v1.cta as string) ?? "#dc2626",
          text: (v1.text as string) ?? "#111827",
        },
        style: { ...DEFAULT_STYLE },
        media: {},
      }
    }
    case "TICKER": {
      return {
        data: {
          mode: v1.mode ?? "scrolling",
          sticky: Boolean(v1.sticky),
          scrollingText: v1.scrollingText ?? "",
          speed: v1.speed ?? 30,
          endsAt: v1.endsAt,
          countdownLabel: v1.countdownLabel,
          bgColor: v1.bgColor ?? "#dc2626",
          textColor: v1.textColor ?? "#ffffff",
        },
        style: { ...DEFAULT_STYLE, paddingY: "sm" },
        media: {},
      }
    }
    // New types are not expected to exist in v1 data
    default:
      return { data: v1, style: { ...DEFAULT_STYLE }, media: {} }
  }
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY (writing changes)" : "DRY-RUN (no changes)"}`)

  const total = await prisma.landingBlock.count()
  console.log(`Total LandingBlock rows in DB: ${total}`)

  let skippedAlreadyV2 = 0
  let migrated = 0
  const perType: Record<string, number> = {}

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const batch = await prisma.landingBlock.findMany({
      skip: offset,
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
    })

    const updates: { id: string; content: BlockContentV2 }[] = []

    for (const row of batch) {
      if (isAlreadyV2(row.content)) {
        skippedAlreadyV2++
        continue
      }
      const v2 = transformV1toV2(row.type, row.content as V1Content)
      updates.push({ id: row.id, content: v2 })
      perType[row.type] = (perType[row.type] ?? 0) + 1
      migrated++
    }

    if (APPLY && updates.length > 0) {
      await prisma.$transaction(
        updates.map(({ id, content }) =>
          prisma.landingBlock.update({
            where: { id },
            data: { content: content as object },
          })
        )
      )
    }

    console.log(`  Batch ${offset}-${offset + batch.length}: ${updates.length} to migrate, ${batch.length - updates.length} already v2`)
  }

  console.log(`\nSummary:`)
  console.log(`  Already v2 (skipped): ${skippedAlreadyV2}`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  By type:`)
  for (const [t, n] of Object.entries(perType)) {
    console.log(`    ${t}: ${n}`)
  }
  console.log(`\n${APPLY ? "Changes written to DB" : "Dry-run complete. Re-run with --apply to write."}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
