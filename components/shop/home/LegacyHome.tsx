import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import {
  HeroSection,
  CategoryShowcase,
  ProductGrid,
  FeatureSection,
  TestimonialsSection,
  NewsletterSection,
  StatsSection,
} from "@/components/home";
import {
  Truck,
  ShieldCheck,
  Headphones,
  CreditCard,
  Heart,
  Sparkles,
} from "lucide-react";

/**
 * Hardcoded fallback home, rendered when no Page is assigned as the active
 * theme's home (Plan 6). Preserved verbatim from the original /(shop)/page.tsx
 * so the storefront keeps working before any seed runs.
 */
export default async function LegacyHome() {
  const settings = await getSiteSettings();

  const featuredProducts = await prisma.product.findMany({
    where: {
      active: true,
      featured: true,
    },
    take: 8,
    orderBy: {
      createdAt: "desc",
    },
  });

  const categories = await prisma.category.findMany({
    where: {
      active: true,
      parentId: null,
    },
    orderBy: {
      order: "asc",
    },
    take: 6,
  });

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.site_name,
    url: settings.site_url,
    description: settings.seo_home_description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${settings.site_url}/productos?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const heroData = {
    title: "Transforma tus espacios con",
    subtitle: "Arte de Pared Premium",
    description:
      "Cuadros decorativos de alta calidad para darle vida a tus paredes. Envío a todo el Perú en 24-48 horas.",
    primaryCta: {
      text: "Explorar Colección",
      href: "/productos",
    },
    secondaryCta: {
      text: "Ver Categorías",
      href: "#categorias",
    },
    badge: "✨ Nuevos diseños cada semana",
    backgroundImage:
      "https://primedecor.pk/cdn/shop/products/ManPaintingSky_5Panel_AbstractWallArt_1000x.jpg?v=1755696840",
  };

  const categoryData = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: cat.image || "/placeholder-category.jpg",
    description: cat.description || undefined,
  }));

  const featuresData = [
    {
      icon: <Truck className="h-6 w-6" />,
      title: "Envío Rápido",
      description: "Entrega en 24-48 horas a todo el Perú",
    },
    {
      icon: <ShieldCheck className="h-6 w-6" />,
      title: "Compra Protegida",
      description: "Garantía de satisfacción o devolución de dinero",
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Pago Seguro",
      description: "Tarjeta, Yape, Plin, PayPal y más",
    },
    {
      icon: <Headphones className="h-6 w-6" />,
      title: "Soporte 24/7",
      description: "Estamos aquí para ayudarte siempre",
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Calidad Premium",
      description: "Materiales de primera e impresión HD",
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Diseños Únicos",
      description: "Colecciones exclusivas y personalizables",
    },
  ];

  const testimonialsData = [
    {
      id: "1",
      name: "María García",
      role: "Cliente en Lima",
      rating: 5,
      comment:
        "Los cuadros llegaron perfectos y en tiempo récord. La calidad es excelente y le dieron un toque increíble a mi sala. ¡Totalmente recomendados!",
      avatar: "/images/avatars/avatar-1.jpg",
      date: "Hace 2 días",
    },
    {
      id: "2",
      name: "Carlos Rodríguez",
      role: "Cliente en Arequipa",
      rating: 5,
      comment:
        "Compré 3 cuadros para mi oficina y quedé encantado. El proceso de compra fue súper fácil y el envío muy rápido. La atención al cliente es de primera.",
      avatar: "/images/avatars/avatar-2.jpg",
      date: "Hace 1 semana",
    },
    {
      id: "3",
      name: "Ana Mendoza",
      role: "Cliente en Cusco",
      rating: 5,
      comment:
        "Me encantó la variedad de diseños. Encontré justo lo que buscaba para mi dormitorio. La calidad de impresión es sorprendente. ¡Volveré a comprar!",
      avatar: "/images/avatars/avatar-3.jpg",
      date: "Hace 2 semanas",
    },
    {
      id: "4",
      name: "Jorge Pérez",
      role: "Cliente en Trujillo",
      rating: 5,
      comment:
        "Excelente servicio y productos de alta calidad. Los cuadros transformaron completamente mi espacio de trabajo.",
      avatar: "/images/avatars/avatar-4.jpg",
      date: "Hace 3 semanas",
    },
    {
      id: "5",
      name: "Lucía Torres",
      role: "Cliente en Piura",
      rating: 5,
      comment:
        "Primera compra y muy satisfecha. El empaque fue perfecto y los cuadros llegaron sin ningún daño. ¡Hermosos!",
      avatar: "/images/avatars/avatar-5.jpg",
      date: "Hace 1 mes",
    },
    {
      id: "6",
      name: "Roberto Silva",
      role: "Cliente en Chiclayo",
      rating: 5,
      comment:
        "Calidad excepcional y precios justos. El proceso de pago con Yape fue súper fácil. Muy recomendable.",
      avatar: "/images/avatars/avatar-6.jpg",
      date: "Hace 1 mes",
    },
  ];

  const statsData = [
    { value: "10,000", suffix: "+", label: "Clientes felices" },
    { value: "4.9", suffix: "/5", label: "Calificación promedio" },
    { value: "50,000", suffix: "+", label: "Cuadros vendidos" },
    { value: "24-48", label: "Horas de entrega" },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <div className="flex flex-col">
        <HeroSection
          title={heroData.title}
          subtitle={heroData.subtitle}
          description={heroData.description}
          primaryCta={heroData.primaryCta}
          secondaryCta={heroData.secondaryCta}
          badge={heroData.badge}
          backgroundImage={heroData.backgroundImage}
        />

        <StatsSection stats={statsData} layout="simple" className="bg-muted/30" />

        {categoryData.length > 0 && (
          <CategoryShowcase
            title="Explora por Categoría"
            subtitle="Encuentra el estilo perfecto para tu espacio"
            categories={categoryData}
            layout="featured"
          />
        )}

        {featuredProducts.length > 0 && (
          <ProductGrid
            title="Productos Destacados"
            subtitle="Los favoritos de nuestros clientes"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserved from original /(shop)/page.tsx; the Product type mismatch predates Plan 6
            products={featuredProducts as any}
            columns={4}
            layout="detailed"
            showQuickActions
            viewAllHref="/productos"
          />
        )}

        <FeatureSection
          title="¿Por qué elegirnos?"
          subtitle="Nos comprometemos a brindarte la mejor experiencia de compra"
          features={featuresData}
          layout="cards"
          columns={3}
        />

        <TestimonialsSection
          title="Lo que dicen nuestros clientes"
          subtitle="Miles de clientes satisfechos en todo el Perú"
          testimonials={testimonialsData}
          layout="featured"
        />

        <NewsletterSection
          title="Suscríbete a nuestro newsletter"
          subtitle="Recibe ofertas exclusivas, nuevos productos y consejos de decoración"
          layout="card"
          showBenefits
        />

        <FeatureSection
          features={featuresData.slice(0, 4)}
          layout="horizontal"
          className="bg-muted/30"
        />
      </div>
    </>
  );
}
