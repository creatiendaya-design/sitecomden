// Backfills the MediaFile library from blobs already stored in Vercel Blob.
//
// Uploads predate the media library, so they live in blob storage with no DB
// row. This enumerates every blob via @vercel/blob `list()` and upserts a
// MediaFile per url (idempotent — re-running skips existing rows).
//
// Dimensions are left null here (would require downloading every image); new
// uploads capture them, and they're a nice-to-have, not required.
//
// Run:
//   npx tsx scripts/backfill-media-files.ts
import { PrismaClient } from "@prisma/client"
import { list } from "@vercel/blob"
import {
  extensionFromPath,
  filenameFromPath,
  isImageExtension,
  mimeFromExtension,
  pathnameFromUrl,
} from "../lib/media/blob-meta"

const prisma = new PrismaClient()

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ BLOB_READ_WRITE_TOKEN no está configurado en el entorno.")
    process.exit(1)
  }

  console.log("🚀 Importando blobs existentes a la librería de archivos...")

  let cursor: string | undefined = undefined
  let scanned = 0
  let created = 0
  let skipped = 0

  do {
    const result: Awaited<ReturnType<typeof list>> = await list({ cursor, limit: 1000 })

    for (const blob of result.blobs) {
      scanned++
      const pathname = blob.pathname || pathnameFromUrl(blob.url)
      const ext = extensionFromPath(pathname)
      const isImage = isImageExtension(ext)

      const existing = await prisma.mediaFile.findUnique({
        where: { url: blob.url },
        select: { id: true },
      })
      if (existing) {
        skipped++
        continue
      }

      await prisma.mediaFile.create({
        data: {
          url: blob.url,
          pathname,
          filename: filenameFromPath(pathname),
          mimeType: mimeFromExtension(ext),
          size: blob.size ?? 0,
          isImage,
          uploadedAt: blob.uploadedAt ? new Date(blob.uploadedAt) : new Date(),
        },
      })
      created++
    }

    cursor = result.hasMore ? result.cursor : undefined
    console.log(`   ...escaneados ${scanned} (nuevos ${created}, omitidos ${skipped})`)
  } while (cursor)

  console.log(`✅ Listo. ${created} archivos importados, ${skipped} ya existían.`)
}

main()
  .catch((e) => {
    console.error("❌ Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
