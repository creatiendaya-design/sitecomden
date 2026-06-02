import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  /** Rating value, 0–5. Supports fractional values (e.g. 4.7) for averages. */
  value: number
  /** Number of stars to draw. Default 5. */
  max?: number
  size?: "sm" | "md" | "lg"
  /** Show the numeric value next to the stars (e.g. "4.8"). */
  showValue?: boolean
  /** Optional review count rendered after the stars (e.g. "(24)"). */
  count?: number
  className?: string
}

const SIZE_CLASS: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
}

const TEXT_SIZE_CLASS: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

/**
 * Presentational star rating. Server-component friendly (no client state) so it
 * can be reused in both server renderers (product page, theme sections) and
 * client components (ProductCard). Fractional fill is achieved by overlaying a
 * clipped row of filled stars over a row of empty ones.
 */
export function StarRating({
  value,
  max = 5,
  size = "md",
  showValue = false,
  count,
  className,
}: StarRatingProps) {
  const clamped = Math.max(0, Math.min(max, value))
  const fillPercent = (clamped / max) * 100
  const starClass = SIZE_CLASS[size]

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="relative inline-flex"
        role="img"
        aria-label={`${clamped.toFixed(1)} de ${max} estrellas`}
      >
        {/* Empty stars (background) */}
        <span className="inline-flex">
          {Array.from({ length: max }).map((_, i) => (
            <Star
              key={i}
              className={cn(starClass, "text-muted-foreground/30")}
              aria-hidden="true"
            />
          ))}
        </span>
        {/* Filled stars (foreground, clipped to fillPercent) */}
        <span
          className="absolute inset-0 inline-flex overflow-hidden"
          style={{ width: `${fillPercent}%` }}
        >
          {Array.from({ length: max }).map((_, i) => (
            <Star
              key={i}
              className={cn(starClass, "shrink-0 fill-amber-400 text-amber-400")}
              aria-hidden="true"
            />
          ))}
        </span>
      </span>
      {showValue && (
        <span className={cn("font-medium tabular-nums", TEXT_SIZE_CLASS[size])}>
          {clamped.toFixed(1)}
        </span>
      )}
      {typeof count === "number" && (
        <span className={cn("text-muted-foreground", TEXT_SIZE_CLASS[size])}>
          ({count})
        </span>
      )}
    </span>
  )
}
