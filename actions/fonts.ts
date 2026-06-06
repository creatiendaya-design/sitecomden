"use server"

import { put, del } from "@vercel/blob"
import { revalidatePath, updateTag } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { protectRoute } from "@/lib/protect-route"
import {
  detectFontFormat,
  parseCustomFontFiles,
  sanitizeFontFamily,
  FONT_EXTENSIONS,
  type CustomFontFile,
  type CustomFontRecord,
  type FontStyle,
} from "@/lib/fonts/custom"

const MAX_FONT_SIZE = 5 * 1024 * 1024 // 5MB — woff2 web fonts are small

export interface FontActionResult {
  ok: boolean
  error?: string
  font?: CustomFontRecord
}

/** Invalidates the storefront stylesheet + relevant pages after a font change. */
function revalidateFonts(): void {
  // Same tag the themes stylesheet is cached under — regenerates tokens.css
  // (which now includes the @font-face rules) on the next request.
  updateTag("active-theme-tokens")
  revalidatePath("/")
  revalidatePath("/carrito")
  revalidatePath("/admin/personalizar")
}

/**
 * Uploads a single font file (one weight/style variant) and attaches it to a
 * family. Uploading another variant to an existing family appends/replaces the
 * matching weight+style, so a family can carry regular + bold + italic, etc.
 */
export async function uploadCustomFont(
  formData: FormData,
): Promise<FontActionResult> {
  const userId = await protectRoute("themes:update")

  const file = formData.get("file")
  const familyRaw = formData.get("family")
  const weightRaw = formData.get("weight")
  const styleRaw = formData.get("style")

  if (!(file instanceof File)) {
    return { ok: false, error: "No se proporcionó ningún archivo." }
  }

  const family = sanitizeFontFamily(typeof familyRaw === "string" ? familyRaw : "")
  if (!family) {
    return { ok: false, error: "El nombre de la fuente no es válido." }
  }

  const weight =
    typeof weightRaw === "string" && /^\d{3}$/.test(weightRaw.trim())
      ? weightRaw.trim()
      : "400"
  const style: FontStyle = styleRaw === "italic" ? "italic" : "normal"

  const ext = (file.name.split(".").pop() ?? "").toLowerCase()
  if (!(ext in FONT_EXTENSIONS)) {
    return { ok: false, error: "Formato no permitido. Usa WOFF2, WOFF, TTF u OTF." }
  }

  if (file.size > MAX_FONT_SIZE) {
    return {
      ok: false,
      error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: 5MB.`,
    }
  }

  // Verify real content via magic bytes (prevents content-type spoofing).
  const bytes = new Uint8Array(await file.arrayBuffer())
  const format = detectFontFormat(bytes)
  if (!format) {
    return { ok: false, error: "El archivo no es una fuente válida." }
  }

  try {
    const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const random = Math.random().toString(36).substring(2, 9)
    const pathname = `fonts/${slug}-${weight}-${style}-${random}.${ext}`

    const blob = await put(pathname, new Blob([bytes]), {
      access: "public",
      contentType: file.type || "font/woff2",
    })

    const variant: CustomFontFile = { url: blob.url, weight, style, format }

    const existing = await prisma.customFont.findUnique({ where: { family } })

    let record
    if (existing) {
      // Replace any variant with the same weight+style; keep the rest.
      const prev = parseCustomFontFiles(existing.files).filter(
        (f) => !(f.weight === weight && f.style === style),
      )
      // Best-effort: remove the now-orphaned blob of the replaced variant.
      const replaced = parseCustomFontFiles(existing.files).find(
        (f) => f.weight === weight && f.style === style,
      )
      if (replaced) {
        await del(replaced.url).catch(() => {})
      }
      record = await prisma.customFont.update({
        where: { family },
        data: { files: [...prev, variant] as unknown as Prisma.InputJsonValue },
      })
    } else {
      record = await prisma.customFont.create({
        data: {
          family,
          files: [variant] as unknown as Prisma.InputJsonValue,
          createdBy: userId,
        },
      })
    }

    revalidateFonts()

    return {
      ok: true,
      font: {
        id: record.id,
        family: record.family,
        files: parseCustomFontFiles(record.files),
      },
    }
  } catch (error) {
    console.error("[FONTS] upload error:", error)
    return { ok: false, error: "Error al subir la fuente. Intenta de nuevo." }
  }
}

/** Lists all uploaded custom fonts for the picker. */
export async function listCustomFonts(): Promise<CustomFontRecord[]> {
  await protectRoute("themes:view")
  const rows = await prisma.customFont.findMany({ orderBy: { family: "asc" } })
  return rows.map((r) => ({
    id: r.id,
    family: r.family,
    files: parseCustomFontFiles(r.files),
  }))
}

/** Deletes a custom font (all its blobs + the row) and invalidates caches. */
export async function deleteCustomFont(id: string): Promise<FontActionResult> {
  await protectRoute("themes:update")

  try {
    const row = await prisma.customFont.findUnique({ where: { id } })
    if (!row) return { ok: false, error: "Fuente no encontrada." }

    const files = parseCustomFontFiles(row.files)
    await Promise.all(files.map((f) => del(f.url).catch(() => {})))

    await prisma.customFont.delete({ where: { id } })
    revalidateFonts()
    return { ok: true }
  } catch (error) {
    console.error("[FONTS] delete error:", error)
    return { ok: false, error: "Error al eliminar la fuente." }
  }
}
