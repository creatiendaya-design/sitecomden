import Image from "next/image";
import { Star } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  rating: number;
  comment: string;
  image?: string;
  date?: string;
}

interface TestimonialsSectionProps {
  title: string;
  subtitle?: string;
  testimonials: Testimonial[];
  layout?: "grid" | "carousel" | "featured";
  showImages?: boolean;
  className?: string;
}

export function TestimonialsSection({
  title,
  subtitle,
  testimonials,
  layout = "grid",
  showImages = false,
  className = "",
}: TestimonialsSectionProps) {
  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );

  if (layout === "featured" && testimonials.length >= 3) {
    return (
      <section className={`py-16 md:py-24 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          {/* Featured Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Primer testimonio - Destacado */}
            <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-primary/10 p-8 md:col-span-2">
              <div className="mb-6">
                <StarRating rating={testimonials[0].rating} />
              </div>
              <blockquote className="mb-6 text-xl font-medium leading-relaxed">
                "{testimonials[0].comment}"
              </blockquote>
              <div className="flex items-center gap-4">
                {testimonials[0].avatar && (
                  <div className="relative h-12 w-12 overflow-hidden rounded-full">
                  {/*   <Image
                      src={testimonials[0].avatar}
                      alt={testimonials[0].name}
                      fill
                      className="object-cover"
                    /> */}
                  </div>
                )}
                <div>
                  <div className="font-semibold">{testimonials[0].name}</div>
                  {testimonials[0].role && (
                    <div className="text-sm text-muted-foreground">
                      {testimonials[0].role}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Testimonios restantes */}
            {testimonials.slice(1).map((testimonial) => (
              <div key={testimonial.id} className="rounded-2xl border bg-card p-6">
                <div className="mb-4">
                  <StarRating rating={testimonial.rating} />
                </div>
                <blockquote className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  "{testimonial.comment}"
                </blockquote>
                <div className="flex items-center gap-3">
                  {testimonial.avatar && (
                    <div className="relative h-10 w-10 overflow-hidden rounded-full">
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm">{testimonial.name}</div>
                    {testimonial.role && (
                      <div className="text-xs text-muted-foreground">
                        {testimonial.role}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Grid estándar con imágenes de productos
  return (
    <section className={`bg-muted/30 py-16 md:py-24 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="rounded-2xl border bg-card p-6 shadow-sm"
            >
              {/* Imagen del producto (si existe) */}
              {showImages && testimonial.image && (
                <div className="relative -mx-6 -mt-6 mb-6 aspect-video overflow-hidden rounded-t-2xl">
                  <Image
                    src={testimonial.image}
                    alt={`Producto de ${testimonial.name}`}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Rating */}
              <div className="mb-4">
                <StarRating rating={testimonial.rating} />
              </div>

              {/* Comentario */}
              <blockquote className="mb-6 leading-relaxed text-muted-foreground">
                "{testimonial.comment}"
              </blockquote>

              {/* Autor */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {testimonial.avatar && (
                    <div className="relative h-10 w-10 overflow-hidden rounded-full">
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm">
                      {testimonial.name}
                    </div>
                    {testimonial.role && (
                      <div className="text-xs text-muted-foreground">
                        {testimonial.role}
                      </div>
                    )}
                  </div>
                </div>
                {testimonial.date && (
                  <div className="text-xs text-muted-foreground">
                    {testimonial.date}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid gap-8 border-t pt-12 md:grid-cols-3">
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold">2,000+</div>
            <div className="text-muted-foreground">Clientes satisfechos</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold">4.9/5</div>
            <div className="text-muted-foreground">Calificación promedio</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold">98%</div>
            <div className="text-muted-foreground">Recomendarían</div>
          </div>
        </div>
      </div>
    </section>
  );
}