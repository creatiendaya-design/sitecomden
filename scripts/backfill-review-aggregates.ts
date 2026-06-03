/**
 * Backfills Product.averageRating + reviewCount from existing APPROVED reviews.
 * Run once after deploying the review-aggregate columns:
 *   npx tsx scripts/backfill-review-aggregates.ts
 *
 * Idempotent: recomputes from scratch each run.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🚀 Recalculando agregados de reseñas por producto...")

  // Group approved reviews by product in a single pass.
  const grouped = await prisma.productReview.groupBy({
    by: ["productId"],
    where: { approved: true },
    _avg: { rating: true },
    _count: { _all: true },
  })

  const ratingByProduct = new Map(
    grouped.map((g) => [
      g.productId,
      {
        average: Math.round((g._avg.rating ?? 0) * 10) / 10,
        count: g._count._all,
      },
    ]),
  )

  // Every product gets written: those with reviews get their aggregate, the
  // rest are reset to 0/0 (covers products whose reviews were all unapproved).
  const products = await prisma.product.findMany({ select: { id: true } })

  let updated = 0
  for (const { id } of products) {
    const agg = ratingByProduct.get(id) ?? { average: 0, count: 0 }
    await prisma.product.update({
      where: { id },
      data: { averageRating: agg.average, reviewCount: agg.count },
    })
    updated++
  }

  console.log(
    `✅ ${updated} productos actualizados (${ratingByProduct.size} con reseñas aprobadas)`,
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
