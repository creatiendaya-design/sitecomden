import { getSiteSettings } from "@/lib/site-settings";
import { Metadata } from "next";
import { Store, Heart, Award, Users } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  
  return {
    title: `Sobre Nosotros - ${settings.site_name}`,
    description: `Conoce más sobre ${settings.site_name}, nuestra historia, misión y valores.`,
  };
}

export default async function AboutPage() {
  const settings = await getSiteSettings();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Sobre {settings.site_name}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Conoce nuestra historia y lo que nos hace únicos
        </p>
      </div>

      {/* Nuestra Historia */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Nuestra Historia</h2>
        <div className="prose prose-gray max-w-none">
          <p className="text-muted-foreground leading-relaxed">
            {settings.site_name} nace de la pasión por ofrecer productos de calidad 
            al mercado peruano. Desde nuestros inicios, nos hemos comprometido a 
            brindar la mejor experiencia de compra en línea, combinando 
            tecnología moderna con un servicio al cliente excepcional.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Nuestra plataforma está diseñada específicamente para las necesidades 
            del mercado peruano, ofreciendo métodos de pago locales como Yape y 
            Plin, además de envíos rápidos a todo el país.
          </p>
        </div>
      </section>

      {/* Valores */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Nuestros Valores</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Calidad</h3>
              <p className="text-sm text-muted-foreground">
                Seleccionamos cuidadosamente cada producto para garantizar 
                la mejor calidad para nuestros clientes.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Servicio al Cliente</h3>
              <p className="text-sm text-muted-foreground">
                Tu satisfacción es nuestra prioridad. Estamos aquí para 
                ayudarte en cada paso de tu compra.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Excelencia</h3>
              <p className="text-sm text-muted-foreground">
                Buscamos constantemente mejorar nuestros procesos y 
                servicios para ofrecerte la mejor experiencia.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Comunidad</h3>
              <p className="text-sm text-muted-foreground">
                Somos parte de la comunidad peruana y trabajamos para 
                contribuir positivamente a nuestro país.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="mb-12">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="p-6 rounded-lg border bg-card">
            <h2 className="text-xl font-semibold mb-3">Nuestra Misión</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ofrecer una experiencia de compra en línea excepcional, 
              brindando productos de calidad con envíos rápidos y 
              métodos de pago adaptados al mercado peruano.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <h2 className="text-xl font-semibold mb-3">Nuestra Visión</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ser la plataforma de e-commerce líder en Perú, 
              reconocida por nuestra innovación, servicio al cliente 
              y compromiso con la excelencia.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Contact */}
      <section className="text-center py-8 px-6 rounded-lg bg-muted">
        <h2 className="text-2xl font-semibold mb-3">¿Tienes alguna pregunta?</h2>
        <p className="text-muted-foreground mb-6">
          Estamos aquí para ayudarte. No dudes en contactarnos.
        </p>
        <a
          href="/contacto"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Contáctanos
        </a>
      </section>
    </div>
  );
}