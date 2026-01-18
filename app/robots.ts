import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Obtener configuración del sitio
  const siteSettings = await prisma.setting.findUnique({
    where: { key: 'site_settings' },
  })

  const baseUrl = siteSettings?.value?.siteUrl || 'https://tusitio.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/checkout/',
          '/carrito/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}