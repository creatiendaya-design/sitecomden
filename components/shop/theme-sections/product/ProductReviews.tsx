import { BadgeCheck, Star } from "lucide-react"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import { SectionWrapper } from "../_helpers"
import { StarRating } from "@/components/shop/StarRating"
import { WriteReviewButton } from "./WriteReviewButton"
import type { ProductForRender, ProductReviewForRender } from "./types"

interface ProductReviewsProps {
  section: ResolvedThemeSection
  product: ProductForRender
}

interface ProductReviewsContent {
  heading?: string
  showSummary?: boolean
  showDistribution?: boolean
  showWriteButton?: boolean
  writeButtonText?: string
  limit?: number
  emptyText?: string
}

/** Spanish relative-time label for a review date. Falls back to a locale date
 *  for anything older than ~4 weeks. */
function relativeDate(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const day = 24 * 60 * 60 * 1000
  const days = Math.floor(diffMs / day)
  if (days <= 0) return "hoy"
  if (days === 1) return "ayer"
  if (days < 7) return `hace ${days} días`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? "hace 1 semana" : `hace ${weeks} semanas`
  }
  return new Date(iso).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function ReviewCard({ review }: { review: ProductReviewForRender }) {
  return (
    <article className="py-5 first:pt-0 border-t first:border-t-0 border-border/60">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <StarRating value={review.rating} size="sm" />
          <span className="text-sm font-medium">{review.customerName}</span>
        </div>
        {review.verified && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Compra verificada
          </span>
        )}
      </div>

      {review.title && (
        <h3 className="mt-2 text-sm font-semibold">{review.title}</h3>
      )}
      {review.comment && (
        <p className="mt-1 text-sm leading-relaxed opacity-90">
          {review.comment}
        </p>
      )}

      {review.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded
            // review photos; <img> avoids per-host next/image remotePatterns config.
            <img
              key={i}
              src={src}
              alt={`Foto de la reseña de ${review.customerName}`}
              loading="lazy"
              className="h-16 w-16 rounded-md object-cover border border-border/60"
            />
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {relativeDate(review.createdAt)}
      </p>

      {review.reply && (
        <div className="mt-3 ml-4 rounded-md border-l-2 border-[var(--theme-primary,theme(colors.primary.DEFAULT))] bg-muted/40 p-3">
          <p className="text-xs font-semibold">Respuesta de la tienda</p>
          <p className="mt-1 text-sm leading-relaxed opacity-90 whitespace-pre-wrap">
            {review.reply}
          </p>
          {review.repliedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              {relativeDate(review.repliedAt)}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

/**
 * PRODUCT_REVIEWS theme section. Renders the product's approved reviews as a
 * full-width block: average + star summary, a per-rating distribution
 * breakdown, and the review list. Content comes from `product.reviews`
 * (loaded in page.tsx) — the section's `content` only controls presentation.
 *
 * Server component. The "write a review" button and "see more" pagination are
 * wired in Fase 2 (review submission); for now the button is presentational.
 */
export function ProductReviews({ section, product }: ProductReviewsProps) {
  const content = section.content as ProductReviewsContent
  const heading = content.heading ?? "Reseñas de clientes"
  const showSummary = content.showSummary ?? true
  const showDistribution = content.showDistribution ?? true
  const showWriteButton = content.showWriteButton ?? true
  const writeButtonText = content.writeButtonText ?? "Escribir una reseña"
  const limit = content.limit ?? 5
  const emptyText =
    content.emptyText ?? "Todavía no hay reseñas. ¡Sé el primero en opinar!"

  const reviews = product.reviews ?? []
  const count = reviews.length
  const average =
    count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0

  // Per-rating counts (5★ → 1★).
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: reviews.filter((r) => Math.round(r.rating) === star).length,
  }))

  const visible = reviews.slice(0, limit)

  return (
    <SectionWrapper section={section} as="section">
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <h2 className="text-2xl font-bold" data-content-field="heading">
            {heading}
          </h2>
          {showWriteButton && (
            <WriteReviewButton
              productId={product.id}
              buttonText={writeButtonText}
            />
          )}
        </div>

        {count === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <>
            {showSummary && (
              <div className="grid gap-8 sm:grid-cols-[auto_1fr] items-center mb-8 pb-8 border-b border-border/60">
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl font-bold leading-none">
                    {average.toFixed(1)}
                  </span>
                  <StarRating value={average} size="md" className="mt-2" />
                  <span className="mt-1 text-xs text-muted-foreground">
                    {count} {count === 1 ? "reseña" : "reseñas"}
                  </span>
                </div>

                {showDistribution && (
                  <div className="flex flex-col gap-1.5 w-full max-w-sm">
                    {distribution.map(({ star, n }) => {
                      const pct = count > 0 ? (n / count) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground w-8 shrink-0">
                            {star}
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          </span>
                          <span className="relative h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <span
                              className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="text-xs text-muted-foreground w-6 text-right tabular-nums shrink-0">
                            {n}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col">
              {visible.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>

            {count > visible.length && (
              <p className="mt-6 text-sm text-muted-foreground text-center">
                Mostrando {visible.length} de {count} reseñas
              </p>
            )}
          </>
        )}
      </div>
    </SectionWrapper>
  )
}
