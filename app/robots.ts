import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

interface SiteConfig {
  siteUrl?: string;
  siteName?: string;
}

function isSiteConfig(value: unknown): value is SiteConfig {
  return typeof value === 'object' && value !== null
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Obtener configuración del sitio
  const siteSettings = await prisma.setting.findUnique({
    where: { key: 'site_settings' },
  })

  // Validación de tipo segura
  let baseUrl = 'https://tusitio.com'
  
  if (siteSettings?.value && isSiteConfig(siteSettings.value)) {
    baseUrl = siteSettings.value.siteUrl || baseUrl
  }

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