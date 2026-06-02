/**
 * Seeds demo product reviews + ensures a PRODUCT_REVIEWS theme section exists
 * on the active theme, so the new reviews block can be smoke-tested in the
 * browser (Fase 1 — display only).
 *
 * Usage:
 *   npx tsx scripts/seed-reviews.ts            # uses the first active product
 *   npx tsx scripts/seed-reviews.ts <slug>     # targets a specific product
 *
 * Idempotent: demo reviews use @demo.shopgood emails and are replaced on each
 * run; the theme section is created only if missing.
 */
import { PrismaClient, type Prisma } from "@prisma/client"

const prisma = new PrismaClient()

const DEMO_EMAIL_DOMAIN = "@demo.shopgood"

// Default presentation config — mirrors productReviewsDefinition.defaultContent.
// Inlined (not imported) to keep this Node script free of lucide-react imports.
const PRODUCT_REVIEWS_DEFAULT_CONTENT = {
  heading: "Reseñas de clientes",
  showSummary: true,
  showDistribution: true,
  showWriteButton: true,
  writeButtonText: "Escribir una reseña",
  limit: 5,
  emptyText: "Todavía no hay reseñas. ¡Sé el primero en opinar!",
}

const DEMO_REVIEWS = [
  {
    customerName: "María G.",
    rating: 5,
    title: "Excelente producto",
    comment:
      "Llegó rápido y tal cual la foto. La calidad superó mis expectativas, muy recomendado.",
    verified: true,
    daysAgo: 2,
    useProductImages: true,
  },
  {
    customerName: "José R.",
    rating: 5,
    title: "Buena calidad",
    comment: "Cumple lo que promete. Volveré a comprar sin dudarlo.",
    verified: true,
    daysAgo: 6,
    useProductImages: false,
  },
  {
    customerName: "Lucía P.",
    rating: 4,
    title: "Muy bueno",
    comment:
      "Me gustó bastante, aunque el empaque podría mejorar. El producto en sí, impecable.",
    verified: true,
    daysAgo: 12,
    useProductImages: false,
  },
  {
    customerName: "Carlos M.",
    rating: 4,
    title: "Recomendado",
    comment: "Relación precio-calidad muy buena. Atención al cliente rápida.",
    verified: false,
    daysAgo: 20,
    useProductImages: false,
  },
  {
    customerName: "Ana T.",
    rating: 5,
    title: "Encantada",
    comment: "Justo lo que buscaba. Lo uso todos los días.",
    verified: true,
    daysAgo: 35,
    useProductImages: false,
  },
  {
    customerName: "Diego S.",
    rating: 3,
    title: "Está bien",
    comment: "Funciona correctamente, pero esperaba un poco más por el precio.",
    verified: false,
    daysAgo: 48,
    useProductImages: false,
  },
]

function daysAgoDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function main() {
  const slug = process.argv[2]

  const product = slug
    ? await prisma.product.findUnique({ where: { slug } })
    : await prisma.product.findFirst({ where: { active: true } })

  if (!product) {
    console.error(
      slug
        ? `❌ No se encontró un producto con slug "${slug}".`
        : "❌ No hay productos activos en la base de datos.",
    )
    process.exit(1)
  }

  console.log(`📦 Producto: ${product.name} (/${product.slug})`)

  const productImages = Array.isArray(product.images)
    ? (product.images as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    : []

  // Replace previous demo reviews so the script is idempotent.
  const removed = await prisma.productReview.deleteMany({
    where: {
      productId: product.id,
      customerEmail: { endsWith: DEMO_EMAIL_DOMAIN },
    },
  })
  if (removed.count > 0) {
    console.log(`🧹 Eliminadas ${removed.count} reseñas demo previas`)
  }

  let created = 0
  for (const r of DEMO_REVIEWS) {
    const images =
      r.useProductImages && productImages.length > 0
        ? productImages.slice(0, 2)
        : []
    await prisma.productReview.create({
      data: {
        productId: product.id,
        customerName: r.customerName,
        customerEmail: `${r.customerName
          .toLowerCase()
          .replace(/[^a-z]/g, "")}${DEMO_EMAIL_DOMAIN}`,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        images,
        verified: r.verified,
        approved: true,
        createdAt: daysAgoDate(r.daysAgo),
      },
    })
    created++
  }
  console.log(`✅ ${created} reseñas demo creadas (todas aprobadas)`)

  // Ensure a PRODUCT_REVIEWS section exists on the active theme.
  const theme = await prisma.theme.findFirst({ where: { active: true } })
  if (!theme) {
    console.warn(
      "⚠️  No hay un tema activo — las reseñas existen pero no se renderiza la sección. " +
        "Agregá la sección 'Reseñas del producto' desde el customizer.",
    )
    return
  }

  const existing = await prisma.themeSection.findFirst({
    where: { themeId: theme.id, group: "PRODUCT", type: "PRODUCT_REVIEWS" },
  })

  if (existing) {
    console.log("ℹ️  La sección PRODUCT_REVIEWS ya existe en el tema activo")
  } else {
    const last = await prisma.themeSection.findFirst({
      where: { themeId: theme.id, group: "PRODUCT" },
      orderBy: { position: "desc" },
    })
    await prisma.themeSection.create({
      data: {
        themeId: theme.id,
        group: "PRODUCT",
        type: "PRODUCT_REVIEWS",
        position: (last?.position ?? -1) + 1,
        content: PRODUCT_REVIEWS_DEFAULT_CONTENT as Prisma.InputJsonValue,
        enabled: true,
      },
    })
    console.log(`✅ Sección PRODUCT_REVIEWS agregada al tema "${theme.name}"`)
  }

  // Make sure the section is offered in the customizer's "Add section" panel
  // (only matters when the theme curates a non-empty product catalog).
  const catalog = (theme.sectionCatalog ?? {}) as {
    product?: string[]
    [k: string]: unknown
  }
  if (
    Array.isArray(catalog.product) &&
    catalog.product.length > 0 &&
    !catalog.product.includes("PRODUCT_REVIEWS")
  ) {
    await prisma.theme.update({
      where: { id: theme.id },
      data: {
        sectionCatalog: {
          ...catalog,
          product: [...catalog.product, "PRODUCT_REVIEWS"],
        } as Prisma.InputJsonValue,
      },
    })
    console.log("✅ PRODUCT_REVIEWS agregado al catálogo de secciones del tema")
  }

  console.log(
    `\n🎉 Listo. Abrí /productos/${product.slug} para ver el bloque de reseñas.`,
  )
  console.log(
    "   (Si no aparece de inmediato, reiniciá el dev server para limpiar el cache de secciones.)",
  )
}

main()
  .catch((e) => {
    console.error("❌ Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
