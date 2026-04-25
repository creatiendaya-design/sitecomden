// Migrates GALLERY blocks' `data.images` from legacy `string[]` to the
// schema-driven `{ id, url }[]` shape. Idempotent: runs only on items that
// are still strings; rows already in the new shape are skipped.
//
// Run once after deploying the schema-driven GALLERY editor:
//   npx tsx scripts/migrate-gallery-shape.ts
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "node:crypto"

const prisma = new PrismaClient()

interface LegacyOrNewImage {
  id?: string
  url?: string
}

function migrateImages(images: unknown): { changed: boolean; next: { id: string; url: string }[] } {
  if (!Array.isArray(images)) return { changed: false, next: [] }
  let changed = false
  const next: { id: string; url: string }[] = []
  for (const item of images) {
    if (typeof item === "string") {
      next.push({ id: randomUUID(), url: item })
      changed = true
      continue
    }
    if (item && typeof item === "object") {
      const obj = item as LegacyOrNewImage
      const url = typeof obj.url === "string" ? obj.url : ""
      if (!url) {
        // Skip empty / malformed entries
        changed = true
        continue
      }
      const id = typeof obj.id === "string" && obj.id ? obj.id : randomUUID()
      if (!obj.id) changed = true
      next.push({ id, url })
    }
  }
  return { changed, next }
}

async function migrateLandingBlocks(): Promise<{ scanned: number; updated: number }> {
  const rows = await prisma.landingBlock.findMany({
    where: { type: "GALLERY" },
    select: { id: true, content: true },
  })
  let updated = 0
  for (const row of rows) {
    const content = row.content as Record<string, unknown> | null
    if (!content) continue
    const data = (content.data as Record<string, unknown> | undefined) ?? content
    const { changed, next } = migrateImages(data.images)
    if (!changed) continue
    const newContent = {
      ...content,
      data: {
        ...(content.data as object | undefined),
        images: next,
      },
    }
    await prisma.landingBlock.update({
      where: { id: row.id },
      data: { content: newContent as object },
    })
    updated++
  }
  return { scanned: rows.length, updated }
}

async function migrateTemplateBlocks(): Promise<{ scanned: number; updated: number }> {
  const rows = await prisma.templateBlock.findMany({
    where: { type: "GALLERY" },
    select: { id: true, content: true },
  })
  let updated = 0
  for (const row of rows) {
    const content = row.content as Record<string, unknown> | null
    if (!content) continue
    const data = (content.data as Record<string, unknown> | undefined) ?? content
    const { changed, next } = migrateImages(data.images)
    if (!changed) continue
    const newContent = {
      ...content,
      data: {
        ...(content.data as object | undefined),
        images: next,
      },
    }
    await prisma.templateBlock.update({
      where: { id: row.id },
      data: { content: newContent as object },
    })
    updated++
  }
  return { scanned: rows.length, updated }
}

async function main() {
  console.log("Migrando GALLERY.data.images: string[] -> { id, url }[]")
  const lb = await migrateLandingBlocks()
  console.log(`LandingBlocks: ${lb.updated} actualizados de ${lb.scanned} escaneados`)
  const tb = await migrateTemplateBlocks()
  console.log(`TemplateBlocks: ${tb.updated} actualizados de ${tb.scanned} escaneados`)
  console.log("Listo.")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
