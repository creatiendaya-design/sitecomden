import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

// Read site URL from DB on every request instead of prerendering at build
// time. Avoids DB calls during `next build` (CI has no DATABASE_URL reachable)
// and lets dominio changes from admin take effect on the next request.
export const dynamic = 'force-dynamic'

interface SiteConfig {
  siteUrl?: string;
  siteName?: string;
}

function isSiteConfig(value: unknown): value is SiteConfig {
  return typeof value === 'object' && value !== null
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  let baseUrl = 'https://nuejoy.online'

  // DB lookup is wrapped in try/catch so CI builds (no DATABASE_URL reachable)
  // and transient Neon outages still produce a valid robots.txt instead of
  // failing the whole build / route.
  try {
    const siteSettings = await prisma.setting.findUnique({
      where: { key: 'site_settings' },
    })
    if (siteSettings?.value && isSiteConfig(siteSettings.value)) {
      baseUrl = siteSettings.value.siteUrl || baseUrl
    }
  } catch (err) {
    console.warn('[robots] Falling back to default baseUrl:', err)
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