import { publicSiteUrl } from "@/lib/site-url";
/**
 * Helpers para resolver URLs de imágenes que se incrustan en correos.
 *
 * Los clientes de correo (Gmail, Outlook, Apple Mail) NO resuelven rutas
 * relativas: necesitan URLs absolutas. Además, la mayoría no renderiza SVG
 * dentro de `<img>`. Estos helpers centralizan ambas reglas para que todas
 * las plantillas reciban URLs ya saneadas.
 */

// Resuelto en cada llamada, no al cargar el módulo: la URL depende de la
// tienda que esté sirviendo la petición. Ver lib/site-url.ts.

/**
 * Convierte cualquier ruta en una URL absoluta utilizable en un correo.
 * - URLs absolutas (http/https) se devuelven tal cual.
 * - Rutas relativas se prefijan con el dominio del sitio.
 * - `data:` URIs y valores vacíos se descartan (no son fiables en email).
 */
export function resolveEmailImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:")) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${publicSiteUrl()}${path}`;
}

/**
 * Resuelve la URL del logo para correos. Igual que `resolveEmailImageUrl`
 * pero descarta SVG porque casi ningún cliente de correo lo renderiza; en
 * ese caso las plantillas hacen fallback al nombre de la tienda.
 */
export function resolveEmailLogoUrl(url?: string | null): string | undefined {
  const absolute = resolveEmailImageUrl(url);
  if (!absolute) return undefined;
  if (/\.svg(\?.*)?$/i.test(absolute)) return undefined;
  return absolute;
}
