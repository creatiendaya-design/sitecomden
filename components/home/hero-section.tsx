import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  description?: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  badge?: string;
  backgroundImage?: string;
  className?: string;
}

export function HeroSection({
  title,
  subtitle,
  description,
  primaryCta,
  secondaryCta,
  badge,
  backgroundImage,
  className = "",
}: HeroSectionProps) {
  return (
    <section className={`relative overflow-hidden ${className}`}>
      {/* Background con overlay */}
      {backgroundImage && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-transparent" />
        </div>
      )}

      {/* Patrón decorativo */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Contenido */}
      <div className="container relative z-10 mx-auto px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge opcional */}
          {badge && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-300/10 px-4 py-1.5 text-sm font-medium text-green-300 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              {badge}
            </div>
          )}

          {/* Título principal */}
          <h1 className={`mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl ${backgroundImage ? 'text-white' : 'text-foreground'}`}>
            {title}
            <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-yellow-400">
              {subtitle}
            </span>
          </h1>

          {/* Descripción */}
          {description && (
            <p className={`mb-10 text-lg sm:text-xl ${backgroundImage ? 'text-white/90' : 'text-muted-foreground'}`}>
              {description}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-12 px-8 text-base border border-white">
              <Link href={primaryCta.href} className="group">
                {primaryCta.text}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            {secondaryCta && (
              <Button asChild variant="outline" size="lg" className={`h-12  px-8 text-base ${backgroundImage ? 'border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white' : ''}`}>
                <Link href={secondaryCta.href}>
                  {secondaryCta.text}
                </Link>
              </Button>
            )}
          </div>

          {/* Trust indicators */}
          <div className={`mt-10 flex flex-wrap items-center justify-center gap-6 text-sm ${backgroundImage ? 'text-white/80' : 'text-muted-foreground'}`}>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>4.9/5 de 2,000+ clientes</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Envío gratis en compras +S/150</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Entrega en 24-48 horas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gradiente inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}