import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

// Read products/categories from DB on every request instead of prerendering
// at build time. Avoids DB calls during `next build` (CI has no DATABASE_URL
// reachable) and reflects new products without waiting for a rebuild.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Obtener configuración del sitio
  const siteSettings = await prisma.setting.findUnique({
    where: { key: 'site_settings' },
  })

  // Type assertion para JsonValue
  const siteConfig = siteSettings?.value as { siteUrl?: string } | undefined
  const baseUrl = (siteConfig?.siteUrl || 'https://nuejoy.online').replace(
    /\/$/,
    '',
  )

  // Páginas estáticas (siempre indexables, no dependen de DB).
  // `/carrito` y `/checkout` se omiten — quedan disallow en robots.txt y
  // no aportan valor en buscadores ni LLMs.
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/productos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contacto`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/libro-reclamaciones`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  // Catálogo + contenido editable cargado en paralelo. Filtramos `noIndex`
  // donde aplique (Page y Policy lo exponen explícitamente).
  const [categories, products, pages, policies] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.page.findMany({
      where: { active: true, noIndex: false },
      select: { slug: true, updatedAt: true },
    }),
    prisma.policy.findMany({
      where: { active: true, noIndex: false },
      select: { slug: true, updatedAt: true },
    }),
  ])

  // Categorías canónicas viven en /categoria/[slug]. La URL antigua
  // /productos?category=slug fue eliminada para no confundir crawlers
  // (un mismo listado en dos URLs era contenido duplicado).
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/categoria/${category.slug}`,
    lastModified: category.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/productos/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  // Static `Page` model (Nosotros, FAQ, etc.) — resuelven en /<slug>.
  const editablePages: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const policyPages: MetadataRoute.Sitemap = policies.map((policy) => ({
    url: `${baseUrl}/politicas/${policy.slug}`,
    lastModified: policy.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.4,
  }))

  return [
    ...staticPages,
    ...categoryPages,
    ...productPages,
    ...editablePages,
    ...policyPages,
  ]
}
