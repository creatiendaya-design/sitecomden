import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

// Resolve the site URL per request instead of prerendering at build time.
// Avoids DB calls during `next build` (CI has no DATABASE_URL reachable) and
// lets a domain change from admin take effect on the next request.
export const dynamic = 'force-dynamic'

// Private surfaces that NO bot (search engine or LLM) should crawl.
const PRIVATE_DISALLOW = [
  '/admin/',
  '/admin-auth/',
  '/api/',
  '/checkout/',
  '/carrito/',
  '/cuenta/',
  '/orden/',
  '/iniciar-sesion',
  '/registro',
]

// GEO: bots de motores generativos / asistentes IA que queremos rastreen
// el catálogo público para citarnos en respuestas. La regla `*` ya los
// cubre por herencia, pero declararlos explícitamente nos permite:
//  1) Subir `max-image-preview` para Bingbot (Copilot Shopping usa Bing).
//  2) Confirmar que NO estamos bloqueando Google-Extended (Gemini /
//     AI Overviews) ni Applebot-Extended (Apple Intelligence).
//  3) Documentar la decisión: cualquier bot que aparezca y no esté en
//     esta lista hereda de `*` y queda permitido por defecto.
const AI_AND_SEARCH_BOTS = [
  'Googlebot',
  'Google-Extended',     // Gemini / AI Overviews
  'Bingbot',             // Bing + Copilot
  'GPTBot',              // OpenAI training
  'OAI-SearchBot',       // ChatGPT search
  'ChatGPT-User',        // ChatGPT in-chat fetch
  'ClaudeBot',           // Anthropic training/search
  'anthropic-ai',        // legacy Anthropic UA
  'Claude-Web',          // Claude in-chat fetch
  'PerplexityBot',       // Perplexity index
  'Perplexity-User',     // Perplexity in-chat fetch
  'Applebot',            // Spotlight / Siri
  'Applebot-Extended',   // Apple Intelligence training
  'CCBot',               // Common Crawl
  'Meta-ExternalAgent',  // Meta AI / WhatsApp link previews
  'Bytespider',          // ByteDance / Doubao
  'Amazonbot',           // Amazon Alexa / Rufus
  'DuckAssistBot',       // DuckDuckGo AI
  'cohere-ai',           // Cohere
  'YouBot',              // You.com
  'Diffbot',             // Diffbot (used by many AI tools)
]

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Antes esto leía la clave `site_settings` (que nadie escribía nunca) y caía
  // a un dominio horneado, así que el robots.txt de cualquier tienda salía con
  // la URL de otra. `getSiteUrl()` es ahora la única fuente.
  const baseUrl = await getSiteUrl()

  const aiBotRules = AI_AND_SEARCH_BOTS.map((userAgent) => ({
    userAgent,
    allow: '/',
    disallow: PRIVATE_DISALLOW,
  }))

  return {
    rules: [
      // Default: everything except private surfaces.
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_DISALLOW,
      },
      ...aiBotRules,
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
