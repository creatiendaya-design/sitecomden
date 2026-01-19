import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Obtener configuración del sitio
  const siteSettings = await prisma.setting.findUnique({
    where: { key: 'site_settings' },
  })

  // Type assertion para JsonValue
  const siteConfig = siteSettings?.value as { siteUrl?: string } | undefined
  const baseUrl = siteConfig?.siteUrl || 'https://nuejoy.online'

  // Páginas estáticas
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/productos`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/carrito`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ]

  // Obtener todas las categorías activas
  const categories = await prisma.category.findMany({
    where: { active: true },
    select: {
      slug: true,
      updatedAt: true,
    },
  })

  const categoryPages = categories.map((category) => ({
    url: `${baseUrl}/productos?category=${category.slug}`,
    lastModified: category.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Obtener todos los productos activos
  const products = await prisma.product.findMany({
    where: { active: true },
    select: {
      slug: true,
      updatedAt: true,
    },
  })

  const productPages = products.map((product) => ({
    url: `${baseUrl}/productos/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...categoryPages, ...productPages]
}